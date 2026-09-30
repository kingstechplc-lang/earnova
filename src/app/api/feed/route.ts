// GET /api/feed?tab=[for-you|following|trending|latest]&cursor=X&limit=N
//
// Personalized + discovery feed with 4 tabs. Cursor-paginated (limit 20).
//
// Per spec section 18 (DISCOVERY / FEED):
//   - For You: 60% posts from followed creators + 40% discovery (trending + interests).
//              Mix is sorted by a personalized score (recency + engagement + relevance).
//              Falls back to Trending tab for logged-out users.
//   - Following: only posts from creators the user follows. Sort by publishedAt DESC.
//                Logged-out users get an empty array + a login prompt.
//   - Trending: same engagement-velocity score as /api/explore, paginated.
//               score = (likeCount*3) + (commentCount*2) + (shareCount*4)
//                       + (saveCount*2) + (viewCount*0.1)
//   - Latest: all PUBLISHED + PUBLIC + APPROVED posts, sort by publishedAt DESC.
//
// All feed responses share the same shape:
//   { posts: [{ id, slug, title, excerpt, type, coverImage, publishedAt,
//               viewCount, likeCount, commentCount, shareCount, saveCount, tags,
//               author: { id, name, username, image },
//               page: { id, slug, title } | null,
//               campaign: { id, slug, title } | null,
//               categories: [{ id, slug, name, icon, color }] }],
//     nextCursor: string | null }
//
// Cursor semantics:
//   - latest / following / for-you: cursor = post.id (cursor: { id }, skip: 1 pattern)
//   - trending: cursor = base64(JSON.stringify({ score, id })) — score is computed
//     in SQL so the cursor needs to encode the score threshold + tiebreaker id.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseLimit(raw: string | null): number {
  const n = parseInt(raw || String(DEFAULT_LIMIT), 10)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT
  return Math.min(n, MAX_LIMIT)
}

// Shared post select shape for all tabs — keeps responses uniform.
const POST_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  type: true,
  coverImage: true,
  publishedAt: true,
  viewCount: true,
  likeCount: true,
  commentCount: true,
  shareCount: true,
  saveCount: true,
  tags: true,
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
} as const

function mapPost(p: any) {
  return {
    ...p,
    categories: p.categories.map((c: any) => c.category),
  }
}

// Build the { take, cursor, skip } object Prisma wants for cursor pagination.
// Returned as a plain object so the spread merges into any findMany args
// without TypeScript complaining about a `cursor?: undefined` widening.
function cursorClause(cursor: string | null): { cursor?: { id: string }; skip?: number } {
  if (!cursor) return {}
  return { cursor: { id: cursor }, skip: 1 }
}

// Standard "take limit+1, slice, build nextCursor" pagination closer.
function paginate<T extends { id: string }>(items: T[], limit: number) {
  const hasMore = items.length > limit
  const slice = hasMore ? items.slice(0, -1) : items
  return {
    items: slice,
    nextCursor: hasMore ? slice[slice.length - 1].id : null,
  }
}

// Encode/decode (score, id) cursor for the Trending tab.
function encodeTrendingCursor(score: number, id: string): string {
  return Buffer.from(JSON.stringify({ s: Math.round(score * 1000) / 1000, i: id })).toString('base64url')
}
function decodeTrendingCursor(cursor: string): { score: number; id: string } | null {
  try {
    const raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    if (typeof raw.s !== 'number' || typeof raw.i !== 'string') return null
    return { score: raw.s, id: raw.i }
  } catch {
    return null
  }
}

// ─── Trending SQL (score-sorted, cursor-aware) ──────────────────────────────
//
// Score is computed in SQL so the ORDER BY stays in Postgres.
// Cursor filtering: WHERE score < cursor.score
//                       OR (score = cursor.score AND id < cursor.id)
function buildTrendingSql(cursorInfo: { score: number; id: string } | null, limit: number) {
  // Always filter: published + public + approved + last 7 days
  const whereClause = cursorInfo
    ? Prisma.sql`AND (
        (p."likeCount" * 3 + p."commentCount" * 2 + p."shareCount" * 4 + p."saveCount" * 2 + p."viewCount" * 0.1) < ${cursorInfo.score}
        OR (
          (p."likeCount" * 3 + p."commentCount" * 2 + p."shareCount" * 4 + p."saveCount" * 2 + p."viewCount" * 0.1) = ${cursorInfo.score}
          AND p.id < ${cursorInfo.id}
        )
      )`
    : Prisma.empty
  return Prisma.sql`
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
      ${whereClause}
    ORDER BY score DESC, p."publishedAt" DESC
    LIMIT ${limit + 1}
  `
}

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

// Run the trending SQL + hydrate author/page/campaign/categories for the rows.
async function fetchTrending(cursor: string | null, limit: number) {
  const cursorInfo = cursor ? decodeTrendingCursor(cursor) : null
  // If cursor was provided but couldn't be decoded, start fresh.
  const effectiveCursor = cursor && !cursorInfo ? null : cursorInfo
  const rows = await db.$queryRaw<TrendingRow[]>(
    buildTrendingSql(effectiveCursor, limit)
  )
  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, -1) : rows
  if (slice.length === 0) {
    return { posts: [], nextCursor: null }
  }

  // Hydrate the relational data in one query.
  const ids = slice.map(r => r.id)
  const hydrated = await db.post.findMany({
    where: { id: { in: ids } },
    select: POST_SELECT,
  })
  const byId = new Map(hydrated.map(p => [p.id, p]))

  // Preserve SQL ordering (score DESC, publishedAt DESC).
  const posts = slice
    .map(row => {
      const h = byId.get(row.id)
      if (!h) return null
      return mapPost(h)
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const last = slice[slice.length - 1]
  return {
    posts,
    nextCursor: hasMore ? encodeTrendingCursor(last.score, last.id) : null,
  }
}

// ─── Latest tab ──────────────────────────────────────────────────────────────
async function fetchLatest(cursor: string | null, limit: number) {
  const posts = await db.post.findMany({
    where: {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      moderationState: 'APPROVED',
    },
    select: POST_SELECT,
    orderBy: { publishedAt: 'desc' },
    take: limit + 1,
    ...cursorClause(cursor),
  })
  const { items, nextCursor } = paginate(posts, limit)
  return { posts: items.map(mapPost), nextCursor }
}

// ─── Following tab ──────────────────────────────────────────────────────────
async function fetchFollowing(userId: string, cursor: string | null, limit: number) {
  // IDs of creators the user follows.
  const follows = await db.follow.findMany({
    where: { followerId: userId },
    select: { followeeId: true },
  })
  const followedIds = follows.map(f => f.followeeId)
  if (followedIds.length === 0) {
    return { posts: [], nextCursor: null }
  }
  const posts = await db.post.findMany({
    where: {
      authorId: { in: followedIds },
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      moderationState: 'APPROVED',
    },
    select: POST_SELECT,
    orderBy: { publishedAt: 'desc' },
    take: limit + 1,
    ...cursorClause(cursor),
  })
  const { items, nextCursor } = paginate(posts, limit)
  return { posts: items.map(mapPost), nextCursor }
}

// ─── For You tab ────────────────────────────────────────────────────────────
//
// Mix: 60% from followed creators + 40% discovery (trending + interests).
// All PUBLISHED + PUBLIC + APPROVED. Sorted by personalized score:
//   final = engagementScore * recencyBonus * followedBonus * interestBonus
//   engagementScore = (likeCount*3) + (commentCount*2) + (shareCount*4) + (saveCount*2) + (viewCount*0.1)
//   recencyBonus    = 1 / (1 + hoursSincePublished)   // decays as post ages
//   followedBonus   = 1.6 if author is followed else 1.0
//   interestBonus   = 1.4 if post tags intersect user interests else 1.0
//
// Cursor = last post.id — we re-fetch the candidate pool on each request and
// rely on publishedAt DESC + score DESC ordering being stable across pages
// when filtered by `publishedAt < cursorPost.publishedAt`. To keep the contract
// simple, we use offset-free cursor pagination on publishedAt.
async function fetchForYou(userId: string, cursor: string | null, limit: number) {
  // Pull followed creator IDs + user interests up front.
  const [follows, userRow] = await Promise.all([
    db.follow.findMany({
      where: { followerId: userId },
      select: { followeeId: true },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { interests: true },
    }),
  ])
  const followedIds = new Set(follows.map(f => f.followeeId))
  const interestTags: string[] = (() => {
    if (!userRow?.interests) return []
    try {
      const parsed = JSON.parse(userRow.interests)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return []
    }
  })()

  // Resolve the cursor to a publishedAt cutoff — so we page through time
  // rather than just by id (avoids the same post appearing twice when mixing
  // followed + discovery pools).
  let publishedBefore: Date | null = null
  if (cursor) {
    const cursorPost = await db.post.findUnique({
      where: { id: cursor },
      select: { publishedAt: true },
    })
    if (cursorPost) publishedBefore = cursorPost.publishedAt
  }

  // 60% from followed creators (limit_n = ceil(limit * 0.6))
  const followedN = Math.max(1, Math.ceil(limit * 0.6))
  // 40% from discovery (limit_m = floor(limit * 0.4))
  const discoveryN = Math.max(1, limit - followedN)

  const baseWhere = {
    status: 'PUBLISHED' as const,
    visibility: 'PUBLIC' as const,
    moderationState: 'APPROVED' as const,
    ...(publishedBefore ? { publishedAt: { lt: publishedBefore } } : {}),
  }

  // Followed pool
  const followedPosts = followedIds.size
    ? await db.post.findMany({
        where: {
          ...baseWhere,
          authorId: { in: Array.from(followedIds) },
        },
        select: POST_SELECT,
        orderBy: { publishedAt: 'desc' },
        take: followedN + 5, // over-fetch slightly so the sort + dedupe is robust
      })
    : []

  // Discovery pool — trending (high engagement) + interest-tag matches.
  // We fetch from the entire published pool (no followed filter) and rely on
  // the personalized score to push followed posts to the top.
  const discoveryWhere = {
    ...baseWhere,
    authorId: { notIn: Array.from(followedIds) },
  }
  const discoveryPosts = await db.post.findMany({
    where: discoveryWhere,
    select: POST_SELECT,
    orderBy: { publishedAt: 'desc' },
    take: discoveryN + 10, // over-fetch so we can sort by score + interest
  })

  // Combine, dedupe, compute personalized score, sort, slice to `limit + 1`
  // so we know whether to emit a nextCursor.
  const seen = new Set<string>()
  const candidates: Array<{ post: any; score: number }> = []
  const now = Date.now()
  for (const p of [...followedPosts, ...discoveryPosts]) {
    if (seen.has(p.id)) continue
    seen.add(p.id)
    const hoursSince = Math.max(
      1,
      (now - (p.publishedAt?.getTime() ?? now)) / (1000 * 60 * 60)
    )
    const engagement =
      p.likeCount * 3 +
      p.commentCount * 2 +
      p.shareCount * 4 +
      p.saveCount * 2 +
      p.viewCount * 0.1
    const recencyBonus = 1 / (1 + hoursSince)
    const followedBonus = followedIds.has(p.author.id) ? 1.6 : 1.0
    const interestBonus =
      p.tags && interestTags.some(t => p.tags!.toLowerCase().includes(t.toLowerCase()))
        ? 1.4
        : 1.0
    const score = engagement * recencyBonus * followedBonus * interestBonus
    candidates.push({ post: p, score })
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    // Tiebreaker: newer publishedAt wins.
    const at = a.post.publishedAt?.getTime() ?? 0
    const bt = b.post.publishedAt?.getTime() ?? 0
    return bt - at
  })

  const slice = candidates.slice(0, limit + 1)
  const hasMore = slice.length > limit
  const items = hasMore ? slice.slice(0, -1) : slice
  return {
    posts: items.map(c => mapPost(c.post)),
    nextCursor: hasMore && items.length > 0 ? items[items.length - 1].post.id : null,
  }
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const tab = (url.searchParams.get('tab') || 'for-you') as
    | 'for-you' | 'following' | 'trending' | 'latest'
  const cursor = url.searchParams.get('cursor')
  const limit = parseLimit(url.searchParams.get('limit'))

  switch (tab) {
    case 'latest': {
      const result = await fetchLatest(cursor, limit)
      return NextResponse.json(result)
    }

    case 'trending': {
      const result = await fetchTrending(cursor, limit)
      return NextResponse.json(result)
    }

    case 'following': {
      const user = await getCurrentUser()
      if (!user) {
        return NextResponse.json({
          posts: [],
          nextCursor: null,
          message: 'Log in to see posts from creators you follow',
        })
      }
      const result = await fetchFollowing(user.id, cursor, limit)
      return NextResponse.json(result)
    }

    case 'for-you':
    default: {
      const user = await getCurrentUser()
      // Logged-out fallback: same as Trending tab.
      if (!user) {
        const result = await fetchTrending(cursor, limit)
        return NextResponse.json(result)
      }
      const result = await fetchForYou(user.id, cursor, limit)
      return NextResponse.json(result)
    }
  }
}
