// /api/admin/stats — platform-wide overview metrics for the admin dashboard
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const [
    totalUsers,
    totalAdmins,
    totalPages,
    publishedPages,
    pendingPages,
    bannedPages,
    totalCampaigns,
    activeCampaigns,
    totalIntegrations,
    pendingIntegrations,
    approvedIntegrations,
    revokedIntegrations,
    totalNetworks,
    activeNetworks,
    totalTrustScores,
    recentModerationEvents,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: 'ADMIN' } }),
    db.specialPage.count(),
    db.specialPage.count({ where: { publishedAt: { not: null } } }),
    db.specialPage.count({ where: { moderationState: 'PENDING' } }),
    db.specialPage.count({ where: { moderationState: 'BANNED' } }),
    db.campaign.count(),
    db.campaign.count({ where: { isActive: true } }),
    db.adIntegration.count({ where: { lifecycleState: { not: 'DELETED' } } }),
    db.adIntegration.count({ where: { lifecycleState: 'PENDING_REVIEW' } }),
    db.adIntegration.count({ where: { lifecycleState: 'APPROVED' } }),
    db.adIntegration.count({ where: { lifecycleState: 'REVOKED' } }),
    db.adNetwork.count(),
    db.adNetwork.count({ where: { status: 'ACTIVE' } }),
    db.trustScore.count(),
    db.moderationEvent.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        page: { select: { slug: true, title: true } },
        integration: { select: { id: true } },
        moderator: { select: { email: true, name: true } },
      },
    }),
  ])

  return NextResponse.json({
    stats: {
      users: { total: totalUsers, admins: totalAdmins },
      pages: { total: totalPages, published: publishedPages, pending: pendingPages, banned: bannedPages },
      campaigns: { total: totalCampaigns, active: activeCampaigns },
      integrations: {
        total: totalIntegrations,
        pending: pendingIntegrations,
        approved: approvedIntegrations,
        revoked: revokedIntegrations,
      },
      networks: { total: totalNetworks, active: activeNetworks },
      trustScoresComputed: totalTrustScores,
    },
    recentEvents: recentModerationEvents.map(e => ({
      id: e.id,
      pageId: e.pageId,
      pageSlug: e.page?.slug,
      pageTitle: e.page?.title,
      integrationId: e.integrationId,
      fromState: e.fromState,
      toState: e.toState,
      reason: e.reason,
      triggeredBy: e.triggeredBy === 'automated' ? 'automated' : (e.moderator?.email || 'unknown'),
      moderatorName: e.moderator?.name,
      createdAt: e.createdAt,
    })),
  })
}
