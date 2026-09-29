// GET /api/p/[slug] — fetch public Special Page with computed placements + ad-tag metadata
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeRenderedPlacements, getActivePolicy } from '@/lib/placement-engine'
import { renderAdTag } from '@/lib/ad-renderer'
import { getSlotConfigs, isIntegrationTypeAllowed, type SlotConfigRow } from '@/lib/slot-config'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await db.specialPage.findUnique({
    where: { slug },
    include: {
      blocks: { orderBy: { order: 'asc' } },
      campaign: true,
      owner: { select: { name: true, image: true, bio: true } },
      placements: {
        include: {
          integration: { include: { adNetwork: true } },
        },
      },
    },
  })
  if (!page || !page.publishedAt) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  }
  if (page.moderationState === 'BANNED' || page.moderationState === 'SUSPENDED') {
    return NextResponse.json({ error: 'This page is unavailable', moderationState: page.moderationState }, { status: 403 })
  }

  const policy = await getActivePolicy()
  const renderedPlacements = await computeRenderedPlacements(page, page.placements as any, policy)

  // ─── Slot-aware platform integration matching ────────────────────────────
  //
  // Previously this code just used `platformIntegrations[0]` for EVERY platform
  // placement. That meant HEADER + BEFORE_FOOTER both got the same Adsterra
  // BANNER tag → Adsterra's `atOptions` global var got overwritten → only one
  // of the two zones rendered. The visible-but-empty container near the
  // bottom of the demo page was BEFORE_FOOTER suffering from this dedup.
  //
  // Now we use AdSlotConfig to decide which integration to use per slot:
  //   1. If the slot has an `assignedIntegrationId`, use that one.
  //   2. Otherwise round-robin among VERIFIED platform integrations, with
  //      collision avoidance (don't use the same integration twice if
  //      alternatives exist).
  //   3. Respect `allowedIntegrationTypes` per slot — skip integrations
  //      whose type isn't in the allowlist.
  //   4. If no VERIFIED integration matches, leave the slot empty (don't
  //      render a placeholder container).
  const platformIntegrations = await db.platformAdNetworkIntegration.findMany({
    where: {
      isActive: true,
      verificationState: 'VERIFIED',
    },
    include: { adNetwork: true },
  })

  const slotConfigs = await getSlotConfigs()
  const slotCfgBySlot = new Map<string, SlotConfigRow>()
  for (const cfg of slotConfigs) {
    if (cfg.source === 'PLATFORM_NETWORK') {
      slotCfgBySlot.set(cfg.slot, cfg)
    }
  }

  // Track which platform integrations are already assigned to a slot
  // (for collision-aware round-robin)
  const usedIntegrationIds = new Set<string>()

  const enrichedPlacements = renderedPlacements.map(p => {
    if (p.source !== 'USER_INTEGRATION' && p.adNetworkCode === 'platform') {
      const slotCfg = slotCfgBySlot.get(p.slot)

      // 1) Check if this slot is configured at all
      if (!slotCfg || !slotCfg.enabled || slotCfg.visibility === 'NEVER') {
        // Slot is disabled — return as-is (no ad tag, isLive=false)
        return p
      }

      // 2) Find the matching platform integration
      let platInt: typeof platformIntegrations[number] | null = null

      // 2a) If assigned to a specific integration, use it
      if (slotCfg.assignedIntegrationId) {
        platInt = platformIntegrations.find(
          pi => pi.id === slotCfg.assignedIntegrationId
        ) || null
      }

      // 2b) Otherwise round-robin among VERIFIED integrations that match
      //     the allowedIntegrationTypes filter, avoiding already-used ones
      if (!platInt) {
        const eligible = platformIntegrations.filter(pi => {
          // Respect allowedIntegrationTypes
          if (!isIntegrationTypeAllowed(slotCfg, pi.integrationType)) return false
          // Prefer unused integrations (collision avoidance)
          return true
        })
        if (eligible.length > 0) {
          // First try to find an unused one
          platInt = eligible.find(pi => !usedIntegrationIds.has(pi.id)) || eligible[0]
        }
      }

      if (!platInt) {
        // No matching integration for this slot — leave empty
        return p
      }

      // Mark this integration as used (so the next slot won't pick it again)
      usedIntegrationIds.add(platInt.id)

      // Render the actual ad-network script tag using the AdRenderer
      const adTag = renderAdTag({
        networkCode: platInt.adNetwork.code,
        integrationType: platInt.integrationType,
        zoneKey: platInt.zoneKey,
        zoneId: platInt.zoneIdentifier,
        cdnUrl: platInt.cdnUrl,
        formatOptions: platInt.formatOptions ? JSON.parse(platInt.formatOptions) : null,
      })
      return {
        ...p,
        adNetworkCode: platInt.adNetwork.code,
        integrationType: platInt.integrationType,
        scriptReference: platInt.scriptReference,
        formatOptions: platInt.formatOptions ? JSON.parse(platInt.formatOptions) : null,
        adTagHtml: adTag.html,
        adTagDescription: adTag.description,
        adTagType: adTag.type,
        adTagScriptSrc: adTag.scriptSrc,
        isLive: adTag.isLive,
      }
    }
    // For user integrations, also render the ad tag if the integration has CDN config
    if (p.source === 'USER_INTEGRATION') {
      const integration = page.placements.find(pl => pl.id === p.id)?.integration
      if (integration && integration.cdnUrl && (integration.zoneKey || integration.zoneIdentifier)) {
        const adTag = renderAdTag({
          networkCode: integration.adNetwork.code,
          integrationType: integration.integrationType,
          zoneKey: integration.zoneKey,
          zoneId: integration.zoneIdentifier,
          cdnUrl: integration.cdnUrl,
          formatOptions: integration.formatOptions ? JSON.parse(integration.formatOptions) : null,
        })
        return {
          ...p,
          formatOptions: integration.formatOptions ? JSON.parse(integration.formatOptions) : null,
          adTagHtml: adTag.html,
          adTagDescription: adTag.description,
          adTagType: adTag.type,
          adTagScriptSrc: adTag.scriptSrc,
          isLive: adTag.isLive,
        }
      }
    }
    return p
  })

  // ─── Apply visibility rules ────────────────────────────────────────────────
  //
  // AdSlotConfig.visibility controls whether a slot is rendered at all:
  //   ALWAYS                   → always render (even without ad — placeholder shown)
  //   ONLY_WHEN_AD_AVAILABLE   → drop from response if no live ad exists
  //   NEVER                    → drop entirely (already filtered in placement-engine)
  const visibilityFiltered = enrichedPlacements.filter(p => {
    const slotCfg = slotConfigs.find(c => c.slot === p.slot && c.source === p.source)
    const visibility = slotCfg?.visibility ?? 'ONLY_WHEN_AD_AVAILABLE'
    if (visibility === 'NEVER') return false
    if (visibility === 'ONLY_WHEN_AD_AVAILABLE') {
      // Drop if no live ad was attached
      return !!(p as any).isLive && !!(p as any).adTagHtml
    }
    return true
  })

  return NextResponse.json({
    page: {
      id: page.id,
      slug: page.slug,
      title: page.title,
      description: page.description,
      pageType: page.pageType,
      campaign: page.campaign,
      owner: page.owner,
      moderationState: page.moderationState,
      blocks: page.blocks.map(b => ({ ...b, data: JSON.parse(b.data) })),
    },
    placements: visibilityFiltered,
    policy: {
      platformAdsEnabled: policy.platformAdsEnabled,
      userAdsEnabled: policy.userAdsEnabled,
      globalKillSwitch: policy.globalKillSwitch,
      maxAdUnitsPerPage: policy.maxAdUnitsPerPage,
      adSlotResponsive: policy.adSlotResponsive,
    },
  })
}
