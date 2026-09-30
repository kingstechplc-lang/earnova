// GET /api/explore — discovery bundle (trending posts, new creators, rising creators,
// popular pages, categories, featured campaigns) returned in ONE response.
//
// Per spec section 18 (DISCOVERY):
//   - Trending uses weighted engagement velocity, not just raw view count.
//   - Score = (likeCount * 3) + (commentCount * 2) + (shareCount * 4)
//             + (saveCount * 2) + (viewCount * 0.1)
//   - Only PUBLISHED + PUBLIC + APPROVED posts from the last 7 days.
//
// The bundle is designed to be fetched once on page load and rendered into the
// Explore grid client-side. No pagination — each sub-list is capped at 5 (or 3
// for campaigns).
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

// ─── Trending posts (computed in SQL for performance) ────────────────────────
//
// We use Prisma.$queryRaw so the engagement-velocity score is computed + sorted
// in Postgres, not in JS. The 7-day window keeps the surface fresh.
const TRENDING_SQL = Prisma.sql`
  SELECT
    p.id, p.slug, p.title, p.excerpt, p.type, p."coverImage",
    p."publishedAt",
    p."viewCount",
    p."likeCount",
    p."commentCount",
    p."shareCount",
    p."saveCount",
    p.tags,
    p."authorId",
    p."pageId",
    p."campaignId",
    (
      (p."likeCount"    * 3) +
      (p."commentCount" * 2) +
      (p."shareCount"   * 4) +
      (p."saveCount"    * 2) +
      (p."viewCount"    * 0.1)
    ) AS score
  FROM "Post" p
  WHERE p.status = 'PUBLISHED'
    AND p.visibility = 'PUBLIC'
    AND p."moderationState" = 'APPROVED'
    AND p."publishedAt" >= NOW() - INTERVAL '7 days'
  ORDER BY score DESC, p."publishedAt" DESC
  LIMIT 5
`

type TrendingRow = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  type: string
  coverImage: string | null
  publishedAt: Date
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  saveCount: number
  tags: string | null
  authorId: string
  pageId: string | null
  campaignId: string | null
  score: number
}

export async function GET() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // 1. Trending posts (raw SQL)
  const trendingRows = await db.$queryRaw<TrendingRow[]>(TRENDING_SQL)

  // Hydrate author / page / campaign / categories for the trending posts.
  // Done in one findMany to avoid N+1.
  const trendingPostIds = trendingRows.map(r => r.id)
  const trendingHydrated = trendingPostIds.length
    ? await db.post.findMany({
        where: { id: { in: trendingPostIds } },
        select: {
          id: true,
          author: {
            select: { id: true, name: true, username: true, image: true },
          },
          page: { select: { id: true, slug: true, title: true } },
          campaign: { select: { id: true, slug: true, title: true } },
          categories: {
            select: {
              category: {
                select: { id: true, slug: true, name: true, icon: true, color: true },
              },
            },
          },
        },
      })
    : []
  const hydratedById = new Map(trendingHydrated.map(p => [p.id, p]))

  const trendingPosts = trendingRows.map(row => {
    const h = hydratedById.get(row.id)
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      type: row.type,
      coverImage: row.coverImage,
      publishedAt: row.publishedAt,
      viewCount: row.viewCount,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      shareCount: row.shareCount,
      saveCount: row.saveCount,
      tags: row.tags,
      score: Math.round(row.score * 100) / 100,
      author: h?.author ?? null,
      page: h?.page ?? null,
      campaign: h?.campaign ?? null,
      categories: h?.categories.map(c => c.category) ?? [],
    }
  })

  // 2. New creators — users created in last 7 days, sorted by follower count.
  //    We need the follower count via _count aggregation since User doesn't
  //    carry a denormalized followerCount field.
  const newUserCandidates = await db.user.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo },
      profileVisibility: 'PUBLIC',
      username: { not: null },
    },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      bio: true,
      createdAt: true,
      _count: { select: { followers: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50, // over-fetch then sort by follower count
  })
  const newCreators = newUserCandidates
    .sort((a, b) => b._count.followers - a._count.followers)
    .slice(0, 5)
    .map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      image: u.image,
      bio: u.bio,
      createdAt: u.createdAt,
      followerCount: u._count.followers,
    }))

  // 3. Rising creators — users whose follower count grew fastest in last 7 days.
  //    Aggregate Follow rows created in last 7 days by followeeId, take top 5.
  //    Then hydrate with the user record + their total follower count.
  const risingAgg = await db.follow.groupBy({
    by: ['followeeId'],
    where: { createdAt: { gte: sevenDaysAgo } },
    _count: { _all: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  })
  const risingUserIds = risingAgg.map(r => r.followeeId)
  const risingUsers = risingUserIds.length
    ? await db.user.findMany({
        where: {
          id: { in: risingUserIds },
          profileVisibility: 'PUBLIC',
        },
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          bio: true,
          _count: { select: { followers: true } },
        },
      })
    : []
  // Preserve the order from the groupBy (already sorted by new-followers desc).
  const risingByMap = new Map(risingUsers.map(u => [u.id, u]))
  const risingCreators = risingAgg
    .map(agg => {
      const u = risingByMap.get(agg.followeeId)
      if (!u) return null
      return {
        id: u.id,
        username: u.username,
        name: u.name,
        image: u.image,
        bio: u.bio,
        followerCount: u._count.followers,
        newFollowersThisWeek: agg._count._all,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  // 4. Popular pages — PUBLISHED + APPROVED, sorted by latest trust score
  //    composite DESC (fallback: pageViews30d from PageAnalytics).
  //    We over-fetch then sort in JS so we can mix the trust-score + analytics
  //    signals (which live in separate tables).
  const popularPageCandidates = await db.specialPage.findMany({
    where: {
      publishedAt: { not: null },
      moderationState: 'APPROVED',
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      pageType: true,
      publishedAt: true,
      owner: {
        select: { id: true, name: true, username: true, image: true },
      },
      trustScores: {
        orderBy: { computedAt: 'desc' },
        take: 1,
        select: { composite: true, computedAt: true },
      },
      analytics: {
        select: { pageViews30d: true, visitors30d: true },
      },
      _count: { select: { posts: { where: { status: 'PUBLISHED' } } } },
    },
    orderBy: { publishedAt: 'desc' },
    take: 50, // over-fetch then sort by trust-score / views
  })
  const popularPages = popularPageCandidates
    .map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      pageType: p.pageType,
      publishedAt: p.publishedAt,
      owner: p.owner,
      trustScore: p.trustScores[0]?.composite ?? null,
      pageViews30d: p.analytics?.pageViews30d ?? 0,
      publishedPostCount: p._count.posts,
      // Sort key: trust score if available, else fall back to pageViews30d.
      _sortKey: p.trustScores[0]?.composite ?? p.analytics?.pageViews30d ?? 0,
    }))
    .sort((a, b) => b._sortKey - a._sortKey)
    .slice(0, 5)
    .map(({ _sortKey, ...rest }) => rest)

  // 5. Categories — all categories, with the count of PUBLISHED posts in each.
  //    Sort by post count DESC.
  const categories = await db.category.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      icon: true,
      color: true,
      _count: {
        select: {
          posts: {
            where: {
              post: {
                status: 'PUBLISHED',
                visibility: 'PUBLIC',
                moderationState: 'APPROVED',
              },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  })
  const categoriesWithCounts = categories
    .map(c => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      icon: c.icon,
      color: c.color,
      postCount: c._count.posts,
    }))
    .sort((a, b) => b.postCount - a.postCount)

  // 6. Featured campaigns — active campaigns (startsAt < now < endsAt), take 3.
  const now = new Date()
  const featuredCampaigns = await db.campaign.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      startsAt: true,
      endsAt: true,
      featured: true,
      _count: { select: { pages: true, posts: true } },
    },
    orderBy: [{ featured: 'desc' }, { startsAt: 'desc' }],
    take: 3,
  })

  return NextResponse.json({
    trendingPosts,
    newCreators,
    risingCreators,
    popularPages,
    categories: categoriesWithCounts,
    featuredCampaigns,
  })
}
