// PATCH  /api/comments/[postId]/[id] — edit a comment (author only)
// DELETE /api/comments/[postId]/[id] — soft-delete a comment (author or admin)
//
// Per spec section 13 (COMMENTS):
//   - edit, delete, hide, moderate
//   - Soft delete preserves thread structure (replies remain visible)
//
// Note: the original spec described these as /api/comments/[id], but Next.js 16
// rejects that as an ambiguous route (it can't tell [id] apart from [postId]
// when matching a URL like /api/comments/abc). Nesting [id] under [postId]
// disambiguates the URL space without changing any of the underlying logic —
// the handlers below still look up the comment purely by `id`; `postId` is
// included in the params for URL routing only.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

function sanitizeComment(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 5000)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string; id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const comment = await db.comment.findUnique({ where: { id }, select: { id: true, authorId: true, isDeleted: true } })
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
  if (comment.authorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden — you can only edit your own comments' }, { status: 403 })
  }
  if (comment.isDeleted) {
    return NextResponse.json({ error: 'Cannot edit a deleted comment' }, { status: 400 })
  }

  const body = await req.json()
  const { content } = body as { content: string }
  const sanitized = sanitizeComment(content)
  if (sanitized.length < 1) {
    return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
  }

  const updated = await db.comment.update({
    where: { id },
    data: { content: sanitized, isEdited: true },
  })
  return NextResponse.json({ comment: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string; id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const comment = await db.comment.findUnique({ where: { id }, select: { id: true, authorId: true, postId: true, parentId: true, isDeleted: true } })
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

  // Author or admin can delete
  const isAuthor = comment.authorId === user.id
  const isAdmin = user.role === 'ADMIN' || user.role === 'MODERATOR'
  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (comment.isDeleted) {
    return NextResponse.json({ alreadyDeleted: true })
  }

  // Soft delete — preserve thread structure
  await db.comment.update({
    where: { id },
    data: { isDeleted: true, content: '[deleted]' },
  })

  // Decrement post.commentCount
  await db.post.update({
    where: { id: comment.postId },
    data: { commentCount: { decrement: 1 } },
  })

  // Decrement parent.replyCount if this was a reply
  if (comment.parentId) {
    await db.comment.update({
      where: { id: comment.parentId },
      data: { replyCount: { decrement: 1 } },
    })
  }

  return NextResponse.json({ deleted: true })
}
