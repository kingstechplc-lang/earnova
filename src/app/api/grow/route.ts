// GET /api/grow — Grow Center: insights, milestones, recommendations
//
// Per spec section 23 (ACTIONABLE INSIGHTS):
//   "Do not simply display numbers. Create a Grow Center."
//   - "Your page received 28% more visitors this week."
//   - "Most of your visitors came from WhatsApp."
//   - "You haven't published anything in 5 days."
//   - "Complete your profile to improve discoverability."
//
// Per spec section 26 (CREATOR MILESTONES):
//   Non-financial achievements. Do NOT reward ad clicks/impressions.
//
// Returns:
//   - insights: computed from real analytics data (traffic trends, top sources, gaps)
//   - milestones: all milestones + which ones the user has achieved
//   - recommendations: actionable suggestions for growth
//   - profileCompletion: percentage + what's missing
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // ── Fetch all data needed for insights + milestone checking ──────────────
  const [pages, posts, followers, userMilestones, allMilestones] = await Promise.all([
    db.specialPage.findMany({
      where: { ownerId: user.id },
      select: { id: true, slug: true, title: true, pageType: true, publishedAt: true, moderationState: true, createdAt: true },
    }),
    db.post.findMany({
      where: { authorId: user.id },
      select: {
        id: true, slug: true, title: true, status: true, publishedAt: true, createdAt: true,
        viewCount: true, likeCount: true, commentCount: true, shareCount: true, saveCount: true,
      },
    }),
    db.follow.count({ where: { followeeId: user.id } }),
    db.userMilestone.findMany({
      where: { userId: user.id },
      include: { milestone: true },
    }),
    db.milestone.findMany({ orderBy: { threshold: 'asc' } }),
  ])

  const pageIds = pages.map(p => p.id)
  const publishedPostIds = posts.filter(p => p.status === 'PUBLISHED').map(p => p.id)

  // ── Analytics queries for insights ──────────────────────────────────────
  const [
    views7d,
    viewsPrev7d,
    topSourcesRaw,
    lastPostDate,
    profileViews30d,
  ] = await Promise.all([
    // Page views last 7 days
    pageIds.length > 0
      ? db.analyticsEvent.count({ where: { pageId: { in: pageIds }, type: 'PAGE_VIEW', createdAt: { gte: sevenDaysAgo } } })
      : Promise.resolve(0),
    // Page views previous 7 days (7-14 days ago) — for trend comparison
    pageIds.length > 0
      ? db.analyticsEvent.count({ where: { pageId: { in: pageIds }, type: 'PAGE_VIEW', createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } })
      : Promise.resolve(0),
    // Top traffic sources (30d)
    pageIds.length > 0
      ? db.analyticsEvent.groupBy({
          by: ['referrer'],
          where: { pageId: { in: pageIds }, type: 'PAGE_VIEW', createdAt: { gte: thirtyDaysAgo } },
          _count: { referrer: true },
          orderBy: { _count: { referrer: 'desc' } },
          take: 3,
        })
      : Promise.resolve([]),
    // Last post date (for "haven't published in X days")
    posts.length > 0
      ? posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
      : null,
    // Profile views (30d)
    db.profileView.count({ where: { profileOwnerId: user.id, viewedAt: { gte: thirtyDaysAgo } } }),
  ])

  // ── Build insights ──────────────────────────────────────────────────────
  const insights: Array<{ id: string; type: 'positive' | 'neutral' | 'action_needed'; icon: string; title: string; body: string }> = []

  // 1. Traffic trend
  if (views7d > 0 || viewsPrev7d > 0) {
    if (viewsPrev7d === 0 && views7d > 0) {
      insights.push({
        id: 'traffic-new',
        type: 'positive',
        icon: '📈',
        title: 'Your pages are getting views!',
        body: `You received ${views7d} views this week. Share your page with more people to keep growing.`,
      })
    } else if (viewsPrev7d > 0) {
      const change = ((views7d - viewsPrev7d) / viewsPrev7d) * 100
      if (change > 10) {
        insights.push({
          id: 'traffic-up',
          type: 'positive',
          icon: '📈',
          title: `${Math.round(change)}% more visitors this week`,
          body: `You received ${views7d} views this week, up from ${viewsPrev7d} last week. Keep it up!`,
        })
      } else if (change < -10) {
        insights.push({
          id: 'traffic-down',
          type: 'action_needed',
          icon: '📉',
          title: `${Math.abs(Math.round(change))}% fewer visitors this week`,
          body: `You received ${views7d} views this week, down from ${viewsPrev7d} last week. Consider publishing new content or sharing your page.`,
        })
      }
    }
  }

  // 2. Top traffic source
  if (topSourcesRaw.length > 0) {
    const topSource = topSourcesRaw[0]
    const ref = topSource.referrer || 'direct'
    let label = ref === 'direct' ? 'direct links' : ref
    try {
      if (ref !== 'direct' && ref.startsWith('http')) {
        label = new URL(ref).hostname.replace('www.', '')
      }
    } catch { /* keep raw */ }
    insights.push({
      id: 'top-source',
      type: 'neutral',
      icon: '🔗',
      title: `Most of your visitors came from ${label}`,
      body: `${topSource._count.referrer} visits from this source in the last 30 days.`,
    })
  }

  // 3. Publishing frequency
  if (lastPostDate) {
    const daysSince = Math.floor((now.getTime() - new Date(lastPostDate).getTime()) / (24 * 60 * 60 * 1000))
    if (daysSince >= 5) {
      insights.push({
        id: 'publishing-gap',
        type: 'action_needed',
        icon: '⏰',
        title: `You haven't published in ${daysSince} days`,
        body: 'Publishing regularly helps you stay visible. Consider sharing a new post today.',
      })
    }
  }

  // 4. Profile completion
  const profileFields = [
    { filled: !!user.username, label: 'Username' },
    { filled: !!user.name, label: 'Display name' },
    { filled: !!user.bio, label: 'Bio' },
    { filled: !!user.image, label: 'Avatar' },
    { filled: !!user.country, label: 'Country' },
    { filled: !!user.website, label: 'Website' },
  ]
  const filledCount = profileFields.filter(f => f.filled).length
  const profileCompletion = Math.round((filledCount / profileFields.length) * 100)
  if (profileCompletion < 100) {
    const missing = profileFields.filter(f => !f.filled).map(f => f.label).join(', ')
    insights.push({
      id: 'profile-incomplete',
      type: 'action_needed',
      icon: '✨',
      title: `Profile is ${profileCompletion}% complete`,
      body: `Add your ${missing} to improve discoverability and trust.`,
    })
  } else {
    insights.push({
      id: 'profile-complete',
      type: 'positive',
      icon: '✨',
      title: 'Your profile is complete!',
      body: 'A complete profile helps you get discovered by more people.',
    })
  }

  // 5. Pages with no content
  const pagesWithNoBlocks = pages.filter(p => !p.publishedAt)
  if (pagesWithNoBlocks.length > 0 && pages.length > 0) {
    insights.push({
      id: 'unpublished-pages',
      type: 'action_needed',
      icon: '📄',
      title: `You have ${pagesWithNoBlocks.length} unpublished ${pagesWithNoBlocks.length === 1 ? 'page' : 'pages'}`,
      body: 'Publish your pages so visitors can find and view them.',
    })
  }

  // 6. Follower milestone
  if (followers > 0 && followers < 10) {
    insights.push({
      id: 'follower-progress',
      type: 'positive',
      icon: '🤝',
      title: `You have ${followers} ${followers === 1 ? 'follower' : 'followers'}`,
      body: `${10 - followers} more to reach the "10 Followers" milestone!`,
    })
  }

  // ── Build recommendations ──────────────────────────────────────────────
  const recommendations: Array<{ id: string; icon: string; title: string; action: string; actionView?: string }> = []

  if (!user.username) {
    recommendations.push({ id: 'claim-username', icon: '@', title: 'Claim your username', action: 'Set up profile' })
  }
  if (pages.length === 0) {
    recommendations.push({ id: 'create-page', icon: '📄', title: 'Create your first Special Page', action: 'Create page' })
  }
  if (posts.filter(p => p.status === 'PUBLISHED').length === 0) {
    recommendations.push({ id: 'publish-post', icon: '✍️', title: 'Publish your first post', action: 'Create post' })
  }
  if (profileCompletion < 100) {
    recommendations.push({ id: 'complete-profile', icon: '✨', title: 'Complete your profile', action: 'Edit profile' })
  }
  if (pages.some(p => !p.publishedAt)) {
    recommendations.push({ id: 'publish-page', icon: '📤', title: 'Publish your draft pages', action: 'Go to dashboard' })
  }
  if (followers === 0 && pages.length > 0) {
    recommendations.push({ id: 'share-page', icon: '🔗', title: 'Share your page to get your first follower', action: 'Go to dashboard' })
  }

  // ── Check + award milestones ───────────────────────────────────────────
  // Per spec section 26: "Do NOT reward ad clicks, ad impressions, clicking
  // your own ads, incentivized advertising activity."
  // Only healthy engagement milestones.
  const earnedTypes = new Set(userMilestones.map(um => um.milestone.type))
  const newMilestones: typeof userMilestones = []

  const checkMilestone = async (type: string, condition: boolean) => {
    if (condition && !earnedTypes.has(type as any)) {
      const milestone = allMilestones.find(m => m.type === type as any)
      if (milestone) {
        const um = await db.userMilestone.create({
          data: { userId: user.id, milestoneId: milestone.id },
          include: { milestone: true },
        })
        newMilestones.push(um as any)
        earnedTypes.add(type as any)
        // Fire notification
        createNotification(
          user.id,
          'CREATOR_MILESTONE',
          `🎉 Milestone unlocked: ${milestone.name}!`,
          { entityId: milestone.id, entityType: 'milestone', body: milestone.description }
        ).catch(() => {})
      }
    }
  }

  await checkMilestone('PROFILE_COMPLETE', profileCompletion === 100)
  await checkMilestone('FIRST_PAGE', pages.length >= 1)
  await checkMilestone('FIRST_POST', posts.filter(p => p.status === 'PUBLISHED').length >= 1)
  await checkMilestone('FIRST_FOLLOWER', followers >= 1)
  await checkMilestone('TEN_FOLLOWERS', followers >= 10)
  await checkMilestone('HUNDRED_FOLLOWERS', followers >= 100)
  await checkMilestone('HUNDRED_VISITORS', views7d + viewsPrev7d >= 100 || profileViews30d >= 100)

  // Check for engagement milestones
  const totalEngagement = posts.reduce((sum, p) => sum + p.likeCount + p.commentCount + p.shareCount + p.saveCount, 0)
  await checkMilestone('FIRST_REACTION', posts.some(p => p.likeCount > 0))
  await checkMilestone('FIRST_COMMENT', posts.some(p => p.commentCount > 0))
  await checkMilestone('FIRST_SHARE', posts.some(p => p.shareCount > 0))

  // Check for campaign participation
  const campaignPages = pages.filter(p => p.moderationState === 'APPROVED' || p.moderationState === 'PENDING')
  await checkMilestone('CAMPAIGN_PARTICIPANT', campaignPages.length > 0)

  // Re-fetch user milestones (in case new ones were awarded)
  const finalUserMilestones = newMilestones.length > 0
    ? await db.userMilestone.findMany({ where: { userId: user.id }, include: { milestone: true } })
    : userMilestones

  // ── Build milestones response ──────────────────────────────────────────
  const milestonesWithStatus = allMilestones.map(m => {
    const um = finalUserMilestones.find(u => u.milestoneId === m.id)
    return {
      id: m.id,
      type: m.type,
      name: m.name,
      description: m.description,
      icon: m.icon,
      color: m.color,
      threshold: m.threshold,
      achieved: !!um,
      achievedAt: um?.achievedAt || null,
      claimed: um?.claimed || false,
    }
  })

  // ── Stats summary ──────────────────────────────────────────────────────
  const stats = {
    totalPages: pages.length,
    publishedPages: pages.filter(p => p.publishedAt).length,
    totalPosts: posts.length,
    publishedPosts: posts.filter(p => p.status === 'PUBLISHED').length,
    followers,
    totalViews30d: views7d + viewsPrev7d,
    profileViews30d,
    totalEngagement,
    profileCompletion,
    achievedMilestones: milestonesWithStatus.filter(m => m.achieved).length,
    totalMilestones: milestonesWithStatus.length,
    newMilestones: newMilestones.length,
  }

  return NextResponse.json({
    insights,
    milestones: milestonesWithStatus,
    recommendations,
    stats,
  })
}
