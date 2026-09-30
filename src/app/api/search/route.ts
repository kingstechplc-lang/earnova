// GET /api/search?q=[query]&type=[creators|pages|posts|all]&cursor=X&limit=N
//
// Global search across creators, pages, and posts.
//
// Per spec section 18 (DISCOVERY / SEARCH):
//   - Creators: search usernameLower + name (case-insensitive contains).
//               Only users with profileVisibility=PUBLIC.
//   - Pages: search title + description + slug.
//            Only PUBLISHED + APPROVED pages.
//   - Posts: search title + excerpt + tags.
//            Only PUBLISHED + PUBLIC + APPROVED.
//
// Query parameter `type`:
//   - all     (default) — returns all three, each capped at 10 results. Cursor/limit ignored.
//   - creators — only creators, paginated (limit 20, max 50).
//   - pages    — only pages, paginated.
//   - posts    — only posts, paginated.
//
// Minimum query length: 2 characters. Shorter queries return empty arrays.
//
// All searches use Prisma's `mode: 'insensitive'` for case-insensitive contains.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const MIN_QUERY_LENGTH = 2
const ALL_TYPE_LIMIT = 10
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

type SearchType = 'all' | 'creators' | 'pages' | 'posts'

// ─── Helpers ────────────────────────────────────────────────────────────────

// Build a case-insensitive contains filter for a given column.
// `mode: 'insensitive'` works on Postgres for text columns.
function contains(q: string) {
  return { contains: q, mode: 'insensitive' as const }
}

// Parse the limit param, clamped to [1, MAX_LIMIT].
function parseLimit(raw: string | null): number {
  const n = parseInt(raw || String(DEFAULT_LIMIT), 10)
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT
  return Math.min(n, MAX_LIMIT)
}

// ─── Searchers ───────────────────────────────────────────────────────────────

// Search PUBLIC creators by username + name. Returns top N (no cursor — top-N
// search results are stable when sorted by follower count desc + username asc).
async function searchCreators(q: string, limit: number) {
  const creators = await db.user.findMany({
    where: {
      profileVisibility: 'PUBLIC',
      username: { not: null },
      OR: [
        { usernameLower: contains(q.toLowerCase()) },
        { name: contains(q) },
      ],
    },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      bio: true,
      _count: { select: { followers: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  // Sort by follower count desc so the most popular creators float up.
  return creators
    .map(c => ({
      id: c.id,
      username: c.username,
      name: c.name,
      image: c.image,
      bio: c.bio,
      followerCount: c._count.followers,
    }))
    .sort((a, b) => b.followerCount - a.followerCount)
}

// Search PUBLISHED + APPROVED pages by title / description / slug.
async function searchPages(q: string, limit: number, cursor: string | null) {
  const pages = await db.specialPage.findMany({
    where: {
      publishedAt: { not: null },
      moderationState: 'APPROVED',
      OR: [
        { title: contains(q) },
        { description: contains(q) },
        { slug: contains(q) },
      ],
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
      _count: { select: { posts: { where: { status: 'PUBLISHED' } } } },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })
  const hasMore = pages.length > limit
  const items = hasMore ? pages.slice(0, -1) : pages
  return {
    pages: items.map(p => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      pageType: p.pageType,
      publishedAt: p.publishedAt,
      owner: p.owner,
      publishedPostCount: p._count.posts,
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  }
}

// Search PUBLISHED + PUBLIC + APPROVED posts by title / excerpt / tags.
async function searchPosts(q: string, limit: number, cursor: string | null) {
  const posts = await db.post.findMany({
    where: {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      moderationState: 'APPROVED',
      OR: [
        { title: contains(q) },
        { excerpt: contains(q) },
        { tags: contains(q) },
      ],
    },
    select: {
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
    },
    orderBy: { publishedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })
  const hasMore = posts.length > limit
  const items = hasMore ? posts.slice(0, -1) : posts
  return {
    posts: items.map(p => ({
      ...p,
      categories: p.categories.map(c => c.category),
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  }
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  const typeParam = (url.searchParams.get('type') || 'all') as SearchType
  const type: SearchType =
    typeParam === 'creators' || typeParam === 'pages' || typeParam === 'posts'
      ? typeParam
      : 'all'

  // Minimum query length: 2 chars. Return empty arrays if shorter.
  if (q.length < MIN_QUERY_LENGTH) {
    if (type === 'all') {
      return NextResponse.json({
        creators: [],
        pages: [],
        posts: [],
      })
    }
    return NextResponse.json({
      [type]: [],
      nextCursor: null,
    })
  }

  // For type=all, ignore cursor/limit — top 10 of each entity type.
  if (type === 'all') {
    const [creators, pages, posts] = await Promise.all([
      searchCreators(q, ALL_TYPE_LIMIT),
      (async () => (await searchPages(q, ALL_TYPE_LIMIT, null)).pages)(),
      (async () => (await searchPosts(q, ALL_TYPE_LIMIT, null)).posts)(),
    ])
    return NextResponse.json({ creators, pages, posts })
  }

  // Specific type — paginated (limit 20, max 50).
  const limit = parseLimit(url.searchParams.get('limit'))
  const cursor = url.searchParams.get('cursor')

  if (type === 'creators') {
    // Creators don't use cursor pagination (top-N by follower count).
    const creators = await searchCreators(q, limit)
    return NextResponse.json({ creators, nextCursor: null })
  }

  if (type === 'pages') {
    const result = await searchPages(q, limit, cursor)
    return NextResponse.json(result)
  }

  // posts
  const result = await searchPosts(q, limit, cursor)
  return NextResponse.json(result)
}
