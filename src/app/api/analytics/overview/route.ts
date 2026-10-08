// GET /api/analytics/overview — user-wide analytics across all their pages + posts
//
// Per user request: 'There must be a general analytics for the user, and a
// specific/per-page/content analytics.'
//
// This route aggregates analytics across ALL the user's published pages + posts:
//   - Total unique visitors (all pages combined)
//   - Total page views (all pages combined)
//   - Total post views (all posts combined)
//   - Total followers (across all their pages/posts)
//   - Total engagement (likes + comments + shares + saves across all posts)
//   - Top performing pages (by views)
//   - Top performing posts (by views)
//   - Traffic sources (aggregated)
//   - Countries (aggregated)
//   - Devices (aggregated)
//   - 7-day + 30-day trends
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Get all the user's pages + posts
  const [pages, posts] = await Promise.all([
    db.specialPage.findMany({
      where: { ownerId: user.id },
      select: { id: true, slug: true, title: true, pageType: true, publishedAt: true, moderationState: true },
    }),
    db.post.findMany({
      where: { authorId: user.id, status: 'PUBLISHED' },
      select: {
        id: true, slug: true, title: true, excerpt: true, type: true, coverImage: true,
        publishedAt: true, viewCount: true, likeCount: true, commentCount: true,
        shareCount: true, saveCount: true, tags: true,
      },
    }),
  ])

  const pageIds = pages.map(p => p.id)
  const postIds = posts.map(p => p.id)

  if (pageIds.length === 0 && postIds.length === 0) {
    return NextResponse.json({
      overview: {
        totalVisitors7d: 0,
        totalVisitors30d: 0,
        totalPageViews7d: 0,
        totalPageViews30d: 0,
        totalPostViews30d: 0,
        totalFollowers: 0,
        totalEngagement30d: 0,
        totalPages: 0,
        totalPosts: 0,
        topPages: [],
        topPosts: [],
        topCountries: '{}',
        topDevices: '{}',
        topSources: '{}',
      }
    })
  }

  // Run all aggregation queries in parallel
  const [
    pageViews7d,
    pageViews30d,
    uniqueVisitors7d,
    uniqueVisitors30d,
    postViews30d,
    totalFollowers,
    totalEngagement30d,
    topCountriesRaw,
    topDevicesRaw,
    topSourcesRaw,
    topPagesRaw,
    topPostsRaw,
  ] = await Promise.all([
    pageIds.length > 0
      ? db.analyticsEvent.count({
          where: { pageId: { in: pageIds }, type: 'PAGE_VIEW', createdAt: { gte: sevenDaysAgo } },
        })
      : Promise.resolve(0),
    pageIds.length > 0
      ? db.analyticsEvent.count({
          where: { pageId: { in: pageIds }, type: 'PAGE_VIEW', createdAt: { gte: thirtyDaysAgo } },
        })
      : Promise.resolve(0),
    pageIds.length > 0
      ? db.analyticsEvent.findMany({
          where: { pageId: { in: pageIds }, type: 'PAGE_VIEW', createdAt: { gte: sevenDaysAgo } },
          select: { visitorId: true },
          distinct: ['visitorId'],
        }).then(rows => rows.length)
      : Promise.resolve(0),
    pageIds.length > 0
      ? db.analyticsEvent.findMany({
          where: { pageId: { in: pageIds }, type: 'PAGE_VIEW', createdAt: { gte: thirtyDaysAgo } },
          select: { visitorId: true },
          distinct: ['visitorId'],
        }).then(rows => rows.length)
      : Promise.resolve(0),
    postIds.length > 0
      ? db.analyticsEvent.count({
          where: { postId: { in: postIds }, type: 'POST_VIEW', createdAt: { gte: thirtyDaysAgo } },
        })
      : Promise.resolve(0),
    db.follow.count({ where: { followeeId: user.id } }),
    db.post.aggregate({
      where: { authorId: user.id, status: 'PUBLISHED' },
      _sum: { likeCount: true, commentCount: true, shareCount: true, saveCount: true },
    }).then(r => (r._sum.likeCount || 0) + (r._sum.commentCount || 0) + (r._sum.shareCount || 0) + (r._sum.saveCount || 0)),
    pageIds.length > 0
      ? db.analyticsEvent.groupBy({
          by: ['countryCode'],
          where: { pageId: { in: pageIds }, type: 'PAGE_VIEW', createdAt: { gte: thirtyDaysAgo }, countryCode: { not: null } },
          _count: { countryCode: true },
          orderBy: { _count: { countryCode: 'desc' } },
          take: 10,
        })
      : Promise.resolve([]),
    pageIds.length > 0
      ? db.analyticsEvent.groupBy({
          by: ['deviceType'],
          where: { pageId: { in: pageIds }, type: 'PAGE_VIEW', createdAt: { gte: thirtyDaysAgo } },
          _count: { deviceType: true },
          orderBy: { _count: { deviceType: 'desc' } },
        })
      : Promise.resolve([]),
    pageIds.length > 0
      ? db.analyticsEvent.groupBy({
          by: ['referrer'],
          where: { pageId: { in: pageIds }, type: 'PAGE_VIEW', createdAt: { gte: thirtyDaysAgo } },
          _count: { referrer: true },
          orderBy: { _count: { referrer: 'desc' } },
          take: 10,
        })
      : Promise.resolve([]),
    pageIds.length > 0
      ? db.analyticsEvent.groupBy({
          by: ['pageId'],
          where: { pageId: { in: pageIds }, type: 'PAGE_VIEW', createdAt: { gte: thirtyDaysAgo } },
          _count: { pageId: true },
          orderBy: { _count: { pageId: 'desc' } },
          take: 5,
        }).then(rows =>
          rows.map(r => {
            const page = pages.find(p => p.id === r.pageId)
            return page ? { ...page, views: r._count.pageId } : null
          }).filter(Boolean)
        )
      : Promise.resolve([]),
    posts.length > 0
      ? [...posts].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5).map(p => ({
          id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, type: p.type,
          coverImage: p.coverImage, views: p.viewCount, likes: p.likeCount,
          comments: p.commentCount, shares: p.shareCount, saves: p.saveCount,
        }))
      : [],
  ])

  const topCountries = JSON.stringify(
    Object.fromEntries(topCountriesRaw.filter(r => r.countryCode).map(r => [r.countryCode, r._count.countryCode]))
  )
  const topDevices = JSON.stringify(
    Object.fromEntries(topDevicesRaw.map(r => [r.deviceType || 'unknown', r._count.deviceType]))
  )
  const topSources = JSON.stringify(
    Object.fromEntries(topSourcesRaw.map(r => {
      const ref = r.referrer || 'direct'
      let label = ref
      try {
        if (ref !== 'direct' && ref.startsWith('http')) {
          label = new URL(ref).hostname.replace('www.', '')
        }
      } catch { /* keep raw */ }
      return [label, r._count.referrer]
    }))
  )

  return NextResponse.json({
    overview: {
      totalVisitors7d: uniqueVisitors7d,
      totalVisitors30d: uniqueVisitors30d,
      totalPageViews7d: pageViews7d,
      totalPageViews30d: pageViews30d,
      totalPostViews30d: postViews30d,
      totalFollowers,
      totalEngagement30d: totalEngagement30d,
      totalPages: pages.length,
      totalPosts: posts.length,
      topPages: topPagesRaw,
      topPosts: topPostsRaw,
      topCountries,
      topDevices,
      topSources,
    }
  })
}
