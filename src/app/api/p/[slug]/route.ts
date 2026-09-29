// GET /api/p/[slug] — fetch public Special Page with computed placements + ad-tag metadata
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeRenderedPlacements, getActivePolicy } from '@/lib/placement-engine'
import { renderAdTag } from '@/lib/ad-renderer'

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

  // Enrich platform placements with VERIFIED platform integrations.
  // Only VERIFIED + active platform integrations are eligible — this is the admin-verification gate.
  const platformIntegrations = await db.platformAdNetworkIntegration.findMany({
    where: {
      isActive: true,
      verificationState: 'VERIFIED',
    },
    include: { adNetwork: true },
  })

  const enrichedPlacements = renderedPlacements.map(p => {
    if (p.source !== 'USER_INTEGRATION' && p.adNetworkCode === 'platform') {
      // Round-robin among VERIFIED platform integrations
      const platInt = platformIntegrations[0]
      if (platInt) {
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
    placements: enrichedPlacements,
    policy: {
      platformAdsEnabled: policy.platformAdsEnabled,
      userAdsEnabled: policy.userAdsEnabled,
      globalKillSwitch: policy.globalKillSwitch,
      maxAdUnitsPerPage: policy.maxAdUnitsPerPage,
      adSlotResponsive: policy.adSlotResponsive,
    },
  })
}
