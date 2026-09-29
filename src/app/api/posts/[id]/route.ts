// GET    /api/posts/[id] — get one post (owner only)
// PATCH  /api/posts/[id] — update post fields (title, content, excerpt, etc.)
// DELETE /api/posts/[id] — soft delete (set status=REMOVED, not actual deletion)
//
// Per spec section 99 (API DESIGN): authorization is derived server-side
// from the session. The post's authorId is checked against the current user.
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const post = await db.post.findUnique({
    where: { id },
    include: {
      page: { select: { id: true, slug: true, title: true } },
      campaign: { select: { id: true, slug: true, title: true } },
    },
  })

  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  // Owner-only — public read goes through /api/post/[slug]
  if (post.authorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    post: {
      ...post,
      content: post.content ? JSON.parse(post.content) : null,
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const post = await db.post.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  if (post.authorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const {
    title, content, excerpt, type, pageId, campaignId, coverImage,
    visibility, tags, seoTitle, seoDescription, ogImage,
  } = body as {
    title?: string
    content?: any[]
    excerpt?: string
    type?: string
    pageId?: string
    campaignId?: string
    coverImage?: string
    visibility?: string
    tags?: string
    seoTitle?: string
    seoDescription?: string
    ogImage?: string
  }

  const data: any = {}

  if (title !== undefined) {
    if (title.trim().length < 3) {
      return NextResponse.json({ error: 'Title must be at least 3 characters' }, { status: 400 })
    }
    data.title = title.trim()
    // If title changed, regenerate slug (keeping old slug is also OK — but
    // for MVP we keep the slug stable unless it's still the default).
    // (Changing the slug would break shared URLs, so we DON'T auto-update it here.)
  }

  if (content !== undefined) {
    data.content = JSON.stringify(content || [])
    // Auto-regenerate excerpt if not explicitly provided
    if (excerpt === undefined && Array.isArray(content)) {
      const firstText = content.find((b: any) => b.type === 'paragraph' && b.text)?.text
      if (firstText) {
        data.excerpt = firstText.slice(0, 200) + (firstText.length > 200 ? '…' : '')
      }
    }
  }

  if (excerpt !== undefined) data.excerpt = excerpt?.trim() || null

  if (type !== undefined) {
    const validTypes = ['TEXT', 'ARTICLE', 'IMAGE', 'GALLERY', 'VIDEO', 'LINK', 'POLL', 'EVENT', 'ANNOUNCEMENT', 'QUESTION', 'QUIZ', 'CARD']
    if (validTypes.includes(type)) data.type = type as any
  }

  if (visibility !== undefined) {
    const validVis = ['PUBLIC', 'UNLISTED', 'PRIVATE']
    if (validVis.includes(visibility)) data.visibility = visibility as any
  }

  if (pageId !== undefined) {
    if (pageId) {
      const page = await db.specialPage.findUnique({ where: { id: pageId } })
      if (!page || page.ownerId !== user.id) {
        return NextResponse.json({ error: 'Page not found or not owned by you' }, { status: 403 })
      }
    }
    data.pageId = pageId || null
  }

  if (campaignId !== undefined) data.campaignId = campaignId || null
  if (coverImage !== undefined) data.coverImage = coverImage || null
  if (tags !== undefined) data.tags = tags || null
  if (seoTitle !== undefined) data.seoTitle = seoTitle || null
  if (seoDescription !== undefined) data.seoDescription = seoDescription || null
  if (ogImage !== undefined) data.ogImage = ogImage || null

  // Don't allow editing REMOVED posts (must restore first)
  if (post.status === 'REMOVED') {
    return NextResponse.json({ error: 'Cannot edit a removed post. Restore it first.' }, { status: 400 })
  }

  const updated = await db.post.update({ where: { id }, data })
  return NextResponse.json({
    post: {
      ...updated,
      content: updated.content ? JSON.parse(updated.content) : null,
    },
  })
}

// Soft delete — set status to REMOVED instead of actually deleting the row.
// Per spec section 81 (ACCOUNT DELETION) + 102 (DATA RETENTION):
// we keep records for moderation/legal reasons but mark them as removed.
// A future admin tool can hard-delete after the retention period.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const post = await db.post.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  if (post.authorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // If it's a DRAFT that was never published, hard-delete is fine (no
  // engagement data to retain). Otherwise soft-delete.
  if (post.status === 'DRAFT' && !post.publishedAt) {
    await db.post.delete({ where: { id } })
    return NextResponse.json({ ok: true, hardDeleted: true })
  }

  await db.post.update({
    where: { id },
    data: { status: 'REMOVED' },
  })

  // Log moderation event for audit trail
  await db.moderationEvent.create({
    data: {
      postId: post.id,
      fromState: post.status,
      toState: 'REMOVED',
      reason: 'Author self-removed post',
      triggeredById: user.id,
      triggeredBy: user.id,
    },
  })

  return NextResponse.json({ ok: true, softDeleted: true })
}
