// GET  /api/comments/[postId] — list comments on a post (top-level + replies)
// POST /api/comments/[postId] — create a new comment (or reply if parentId set)
//
// Per spec section 13 (COMMENTS):
//   - Support comments + replies (threaded via parentId)
//   - Pagination (cursor-based)
//   - Rate limiting (TODO — add in Phase 14)
//   - Spam protection (TODO — basic content validation here)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'

// Sanitize plain-text comment content — strip any HTML, limit length.
function sanitizeComment(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')        // strip HTML tags
    .replace(/[\u0000-\u001f]/g, '') // strip control chars
    .trim()
    .slice(0, 5000)                  // max 5000 chars
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params

  // Verify post exists + is published
  const post = await db.post.findUnique({ where: { id: postId }, select: { id: true, status: true } })
  if (!post || post.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const url = new URL(req.url)
  const cursor = url.searchParams.get('cursor')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50)

  // Fetch top-level comments (parentId === null) — replies fetched separately
  const comments = await db.comment.findMany({
    where: { postId, parentId: null, isDeleted: false },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true },
      },
      replies: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'asc' },
        take: 50,  // cap replies per comment (further replies via nested cursor if needed)
        include: {
          author: {
            select: { id: true, name: true, username: true, image: true },
          },
        },
      },
    },
  })

  const hasMore = comments.length > limit
  const items = hasMore ? comments.slice(0, -1) : comments
  return NextResponse.json({
    comments: items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Email verification gate (same as publishing posts)
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: 'Please verify your email before commenting.' },
      { status: 403 }
    )
  }

  const { postId } = await params
  const body = await req.json()
  const { content, parentId } = body as { content: string; parentId?: string }

  const sanitized = sanitizeComment(content)
  if (sanitized.length < 1) {
    return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
  }
  if (sanitized.length > 5000) {
    return NextResponse.json({ error: 'Comment is too long (max 5000 chars)' }, { status: 400 })
  }

  // Verify post exists + is published
  const post = await db.post.findUnique({ where: { id: postId }, select: { id: true, authorId: true, status: true } })
  if (!post || post.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  // If replying, verify parent comment exists + belongs to this post
  if (parentId) {
    const parent = await db.comment.findUnique({ where: { id: parentId }, select: { id: true, postId: true } })
    if (!parent || parent.postId !== postId) {
      return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
    }
  }

  const comment = await db.comment.create({
    data: {
      postId,
      authorId: user.id,
      parentId: parentId || null,
      content: sanitized,
    },
    include: {
      author: {
        select: { id: true, name: true, username: true, image: true },
      },
    },
  })

  // Increment post.commentCount
  await db.post.update({
    where: { id: postId },
    data: { commentCount: { increment: 1 } },
  })

  // If replying, increment parent.replyCount
  if (parentId) {
    await db.comment.update({
      where: { id: parentId },
      data: { replyCount: { increment: 1 } },
    })
    // Notify the parent comment's author
    const parent = await db.comment.findUnique({ where: { id: parentId }, select: { authorId: true } })
    if (parent && parent.authorId !== user.id) {
      createNotification(
        parent.authorId,
        'NEW_REPLY',
        `${user.name || user.email.split('@')[0]} replied to your comment`,
        { actorId: user.id, entityId: comment.id, entityType: 'comment', body: sanitized.slice(0, 200) }
      ).catch(() => {})
    }
  } else {
    // Top-level comment — notify the post author
    if (post.authorId !== user.id) {
      createNotification(
        post.authorId,
        'NEW_COMMENT',
        `${user.name || user.email.split('@')[0]} commented on your post`,
        { actorId: user.id, entityId: postId, entityType: 'post', body: sanitized.slice(0, 200) }
      ).catch(() => {})
    }
  }

  return NextResponse.json({ comment })
}
