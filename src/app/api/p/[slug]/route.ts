// GET /api/p/[slug] — fetch public Special Page with computed placements
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeRenderedPlacements, getActivePolicy } from '@/lib/placement-engine'

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

  // Enrich platform placements with the actual ad-network code from PlatformAdNetworkIntegration.
  // (The placement engine returns "platform" as a placeholder for non-user placements; here we
  // resolve the actual network so the renderer knows which ad-network tag to emit.)
  //
  // CRITICAL: Only VERIFIED platform integrations are eligible to render. This is the
  // admin-verification gate — until the admin has tested + verified the integration,
  // no platform ads will appear on Special Pages (the slot will render "No active inventory").
  const platformIntegrations = await db.platformAdNetworkIntegration.findMany({
    where: {
      isActive: true,
      verificationState: 'VERIFIED',
    },
    include: { adNetwork: true },
  })
  const enrichedPlacements = renderedPlacements.map(p => {
    if (p.source !== 'USER_INTEGRATION' && p.adNetworkCode === 'platform') {
      // Round-robin among VERIFIED platform integrations (simple MVP — in production this would be
      // a more sophisticated auction or priority-based selection)
      const platInt = platformIntegrations[0]
      if (platInt) {
        return {
          ...p,
          adNetworkCode: platInt.adNetwork.code,
          integrationType: platInt.integrationType,
          scriptReference: platInt.scriptReference,
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
    },
  })
}
