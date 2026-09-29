// GET  /api/posts — list current user's posts (with optional ?status= filter)
// POST /api/posts — create a new Post (defaults to DRAFT)
//
// Per spec section 8 (POSTS SYSTEM):
//   Posts are first-class content entities separate from SpecialPage.
//   A Special Page is a destination. A Post is fresh content.
//
// Posts can be:
//   - standalone (no pageId) — appear on the creator's profile feed
//   - attached to a Special Page (pageId set) — appear on that page's posts
//
// Lifecycle (spec section 8):
//   DRAFT → SCHEDULED → PUBLISHED → ARCHIVED
//                 ↘ UNDER_REVIEW ↗
//                              ↘ REMOVED
//
// All mutations require authentication; authorId is derived from the session,
// never trusted from the request body (per spec section 99 — API DESIGN).
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

// GET — list current user's posts with optional status filter + pagination
export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get('status') as
    | 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED' | 'REMOVED' | 'UNDER_REVIEW'
    | null
  const pageId = url.searchParams.get('pageId')
  const cursor = url.searchParams.get('cursor')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50)

  const where: any = { authorId: user.id }
  if (status) where.status = status
  if (pageId) where.pageId = pageId
  // Don't show REMOVED posts in default lists (only when explicitly requested)
  if (!status) where.status = { not: 'REMOVED' }

  const posts = await db.post.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      page: { select: { id: true, slug: true, title: true } },
      campaign: { select: { id: true, slug: true, title: true } },
    },
  })

  const hasMore = posts.length > limit
  const items = hasMore ? posts.slice(0, -1) : posts
  const nextCursor = hasMore ? items[items.length - 1].id : null

  return NextResponse.json({
    posts: items.map(p => ({
      ...p,
      content: p.content ? JSON.parse(p.content) : null,
    })),
    nextCursor,
  })
}

// POST — create a new Post (defaults to DRAFT status)
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    title, content, excerpt, type, pageId, campaignId, coverImage,
    visibility, tags,
  } = body as {
    title: string
    content?: any[]              // array of content blocks (paragraphs, embeds, etc.)
    excerpt?: string
    type?: string               // PostType enum value, defaults to TEXT
    pageId?: string
    campaignId?: string
    coverImage?: string
    visibility?: string         // PostVisibility enum value, defaults to PUBLIC
    tags?: string
  }

  if (!title || title.trim().length < 3) {
    return NextResponse.json({ error: 'Title must be at least 3 characters' }, { status: 400 })
  }

  // Validate type
  const validTypes = ['TEXT', 'ARTICLE', 'IMAGE', 'GALLERY', 'VIDEO', 'LINK', 'POLL', 'EVENT', 'ANNOUNCEMENT', 'QUESTION', 'QUIZ', 'CARD']
  const postType = validTypes.includes(type || '') ? (type as any) : 'TEXT'

  // Validate visibility
  const validVisibilities = ['PUBLIC', 'UNLISTED', 'PRIVATE']
  const postVisibility = validVisibilities.includes(visibility || '') ? (visibility as any) : 'PUBLIC'

  // If pageId provided, verify the user owns the page
  if (pageId) {
    const page = await db.specialPage.findUnique({ where: { id: pageId } })
    if (!page || page.ownerId !== user.id) {
      return NextResponse.json({ error: 'Page not found or not owned by you' }, { status: 403 })
    }
  }

  // Generate unique slug per author
  let slug = slugify(title)
  let suffix = 0
  while (await db.post.findUnique({ where: { authorId_slug: { authorId: user.id, slug } } })) {
    suffix += 1
    slug = `${slugify(title)}-${suffix}`
  }

  // Auto-generate excerpt if not provided (first 200 chars of first text block)
  let finalExcerpt = excerpt?.trim() || null
  if (!finalExcerpt && Array.isArray(content)) {
    const firstText = content.find((b: any) => b.type === 'paragraph' && b.text)?.text
    if (firstText) {
      finalExcerpt = firstText.slice(0, 200) + (firstText.length > 200 ? '…' : '')
    }
  }

  const post = await db.post.create({
    data: {
      authorId: user.id,
      pageId: pageId || null,
      campaignId: campaignId || null,
      slug,
      title: title.trim(),
      excerpt: finalExcerpt,
      content: content ? JSON.stringify(content) : JSON.stringify([]),
      type: postType,
      status: 'DRAFT',
      visibility: postVisibility,
      coverImage: coverImage || null,
      tags: tags || null,
      moderationState: 'PENDING',
    },
  })

  // Auto-add platform + user ad placements based on AdSlotConfig defaults.
  // Same logic as /api/pages POST — posts get the same ad slot treatment
  // as Special Pages so creators can monetize their posts.
  const { getEnabledSlotsForSource } = await import('@/lib/slot-config')
  const platformSlots = await getEnabledSlotsForSource('PLATFORM_NETWORK')
  const userSlots = await getEnabledSlotsForSource('USER_INTEGRATION')

  const placementsData: Array<{
    postId: string
    source: 'PLATFORM_NETWORK' | 'USER_INTEGRATION'
    slot: any
    priority: number
    enabled: boolean
  }> = [
    ...platformSlots.map(s => ({
      postId: post.id,
      source: 'PLATFORM_NETWORK' as const,
      slot: s.slot,
      priority: s.priority,
      enabled: true,
    })),
    ...userSlots.map(s => ({
      postId: post.id,
      source: 'USER_INTEGRATION' as const,
      slot: s.slot,
      priority: s.priority,
      enabled: true,
    })),
  ]

  if (placementsData.length > 0) {
    await db.adPlacement.createMany({ data: placementsData })
  }

  return NextResponse.json({ post: { ...post, content } })
}
