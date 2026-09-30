// POST   /api/saves/[postId] — save (bookmark) a post
// DELETE /api/saves/[postId] — unsave a post
// GET    /api/saves/[postId] — check if current user has saved this post
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId } = await params
  const post = await db.post.findUnique({ where: { id: postId }, select: { id: true, authorId: true, status: true } })
  if (!post || post.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  try {
    await db.save.create({
      data: { userId: user.id, postId },
    })
    await db.post.update({
      where: { id: postId },
      data: { saveCount: { increment: 1 } },
    })

    // Notify the post author
    createNotification(
      post.authorId,
      'NEW_SAVE',
      `${user.name || user.email.split('@')[0]} saved your post`,
      { actorId: user.id, entityId: postId, entityType: 'post' }
    ).catch(() => {})

    return NextResponse.json({ saved: true })
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return NextResponse.json({ saved: true, alreadySaved: true })
    }
    throw err
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId } = await params
  const existing = await db.save.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  })
  if (!existing) {
    return NextResponse.json({ saved: false, alreadyUnsaved: true })
  }

  await db.save.delete({ where: { id: existing.id } })
  await db.post.update({
    where: { id: postId },
    data: { saveCount: { decrement: 1 } },
  })

  return NextResponse.json({ saved: false })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ saved: false })

  const { postId } = await params
  const save = await db.save.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  })
  return NextResponse.json({ saved: !!save })
}
