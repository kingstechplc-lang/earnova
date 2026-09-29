// GET /api/post/[id] — fetch a single published Post for public viewing.
//
// This is the public-facing route — it only returns posts where:
//   - status === 'PUBLISHED'
//   - visibility !== 'PRIVATE'
//   - moderationState !== 'BANNED' or 'SUSPENDED'
//
// It also increments viewCount (idempotent within a session via a cookie
// flag, but for MVP we just always increment — proper view deduplication
// comes in Phase 6 with the AnalyticsEvent system).
//
// AD PLACEMENTS:
//   Per user request, posts now support ad placements (both platform + user).
//   This route computes placements using the same engine as /api/p/[slug]:
//     1. Fetch the post's AdPlacement rows (where postId = post.id)
//     2. Run them through computeRenderedPlacements (applies policy caps,
//        slot config, compatibility matrix)
//     3. Enrich platform placements with VERIFIED platform integrations
//        (slot-aware: assigned integration → round-robin with collision avoidance)
//     4. Enrich user placements with the post author's APPROVED integration
//     5. Apply visibility rules (drop slots with no live ad when
//        visibility=ONLY_WHEN_AD_AVAILABLE)
//
// Per spec section 89 (SEO-FRIENDLY PUBLIC CONTENT):
//   Public content must be accessible to search engines. The route returns
//   full server-rendered metadata (title, description, ogImage, author info)
//   so the client-side router can build proper OpenGraph tags.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeRenderedPlacements, getActivePolicy } from '@/lib/placement-engine'
import { renderAdTag } from '@/lib/ad-renderer'
import { getSlotConfigs, isIntegrationTypeAllowed, type SlotConfigRow } from '@/lib/slot-config'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Look up the post by id (public route uses id, not slug, because slugs
  // are only unique per author — using id avoids ambiguity)
  const post = await db.post.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          bio: true,
        },
      },
      page: { select: { id: true, slug: true, title: true } },
      campaign: { select: { id: true, slug: true, title: true } },
      placements: {
        include: {
          integration: { include: { adNetwork: true } },
        },
      },
    },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  // Visibility gate: PRIVATE posts are owner-only (go through /api/posts/[id])
  if (post.visibility === 'PRIVATE') {
    return NextResponse.json({ error: 'This post is private' }, { status: 403 })
  }

  // UNLISTED posts are accessible via direct link but not indexed in feeds.
  // They still render if you have the URL — that's the contract.

  // Status gate: only PUBLISHED posts are publicly viewable.
  // SCHEDULED posts auto-publish if their scheduledAt has passed (MVP
  // workaround until we have a proper job scheduler in Phase 6).
  if (post.status === 'SCHEDULED' && post.scheduledAt && post.scheduledAt.getTime() <= Date.now()) {
    await db.post.update({
      where: { id: post.id },
      data: { status: 'PUBLISHED', publishedAt: post.publishedAt || new Date() },
    })
    post.status = 'PUBLISHED'
    post.publishedAt = post.publishedAt || new Date()
  }

  if (post.status !== 'PUBLISHED') {
    return NextResponse.json(
      { error: 'This post is not available', status: post.status },
      { status: 404 }
    )
  }

  // Moderation gate: BANNED/SUSPENDED posts are not viewable
  if (post.moderationState === 'BANNED' || post.moderationState === 'SUSPENDED') {
    return NextResponse.json(
      { error: 'This post is unavailable', moderationState: post.moderationState },
      { status: 403 }
    )
  }

  // Increment view count (fire-and-forget — don't block the response)
  // Per spec section 60 (ANALYTICS SCALABILITY):
  //   For MVP this is a synchronous counter update. Phase 6 will replace
  //   this with a proper AnalyticsEvent pipeline + aggregation.
  db.post.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {
    // Silently ignore — view count is best-effort, not critical
  })

  // ─── Compute ad placements (same logic as /api/p/[slug]) ──────────────────
  const policy = await getActivePolicy()
  const renderedPlacements = await computeRenderedPlacements(post, post.placements as any, policy)

  // Enrich platform placements with VERIFIED platform integrations
  // (slot-aware: assigned integration → round-robin with collision avoidance)
  const platformIntegrations = await db.platformAdNetworkIntegration.findMany({
    where: { isActive: true, verificationState: 'VERIFIED' },
    include: { adNetwork: true },
  })

  const slotConfigs = await getSlotConfigs()
  const slotCfgBySlot = new Map<string, SlotConfigRow>()
  for (const cfg of slotConfigs) {
    if (cfg.source === 'PLATFORM_NETWORK') {
      slotCfgBySlot.set(cfg.slot, cfg)
    }
  }

  const usedIntegrationIds = new Set<string>()

  const enrichedPlacements = renderedPlacements.map(p => {
    if (p.source !== 'USER_INTEGRATION' && p.adNetworkCode === 'platform') {
      const slotCfg = slotCfgBySlot.get(p.slot)
      if (!slotCfg || !slotCfg.enabled || slotCfg.visibility === 'NEVER') return p

      // Find matching platform integration (assigned → round-robin with collision avoidance)
      let platInt: typeof platformIntegrations[number] | null = null
      if (slotCfg.assignedIntegrationId) {
        platInt = platformIntegrations.find(pi => pi.id === slotCfg.assignedIntegrationId) || null
      }
      if (!platInt) {
        const eligible = platformIntegrations.filter(pi => isIntegrationTypeAllowed(slotCfg, pi.integrationType))
        if (eligible.length > 0) {
          platInt = eligible.find(pi => !usedIntegrationIds.has(pi.id)) || eligible[0]
        }
      }
      if (!platInt) return p

      usedIntegrationIds.add(platInt.id)
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
    // Enrich user placements with the post author's APPROVED integration
    if (p.source === 'USER_INTEGRATION') {
      const integration = post.placements.find(pl => pl.id === p.id)?.integration
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

  // Apply visibility rules (drop slots with no live ad when visibility=ONLY_WHEN_AD_AVAILABLE)
  const visibilityFiltered = enrichedPlacements.filter(p => {
    const slotCfg = slotConfigs.find(c => c.slot === p.slot && c.source === p.source)
    const visibility = slotCfg?.visibility ?? 'ONLY_WHEN_AD_AVAILABLE'
    if (visibility === 'NEVER') return false
    if (visibility === 'ONLY_WHEN_AD_AVAILABLE') {
      return !!(p as any).isLive && !!(p as any).adTagHtml
    }
    return true
  })

  // Return the post with parsed content + author info + ad placements
  return NextResponse.json({
    post: {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content ? JSON.parse(post.content) : null,
      type: post.type,
      visibility: post.visibility,
      coverImage: post.coverImage,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      shareCount: post.shareCount,
      saveCount: post.saveCount,
      tags: post.tags,
      // SEO metadata (auto-generated if not set)
      seoTitle: post.seoTitle || post.title,
      seoDescription: post.seoDescription || post.excerpt || '',
      ogImage: post.ogImage || post.coverImage,
      author: post.author,
      page: post.page,
      campaign: post.campaign,
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
