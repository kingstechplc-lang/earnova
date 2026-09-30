// POST   /api/reactions/[postId]  — react to a post (or change reaction type)
// DELETE /api/reactions/[postId]  — remove reaction
// GET    /api/reactions/[postId]  — list reactions on a post (counts by type)
//
// Per spec section 12 (SOCIAL ENGAGEMENT):
//   - Use proper aggregation counters (likeCount on Post)
//   - Prevent obvious abuse (unique constraint: one reaction per user per post)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import type { ReactionType } from '@prisma/client'

const VALID_TYPES: ReactionType[] = ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY']

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId } = await params
  const body = await req.json()
  const { type } = body as { type?: string }

  if (!type || !VALID_TYPES.includes(type as ReactionType)) {
    return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 })
  }

  // Verify the post exists + is published
  const post = await db.post.findUnique({ where: { id: postId }, select: { id: true, authorId: true, status: true } })
  if (!post || post.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'Post not found or not published' }, { status: 404 })
  }

  // Upsert the reaction (unique on userId+postId — changing type updates the row)
  const existing = await db.reaction.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  })

  if (existing) {
    if (existing.type === (type as ReactionType)) {
      // Same reaction — no-op (idempotent)
      return NextResponse.json({ reaction: existing })
    }
    // Different type — update it
    const updated = await db.reaction.update({
      where: { id: existing.id },
      data: { type: type as ReactionType },
    })
    return NextResponse.json({ reaction: updated })
  }

  // Create new reaction + increment post.likeCount (denormalized counter)
  const reaction = await db.reaction.create({
    data: { userId: user.id, postId, type: type as ReactionType },
  })
  await db.post.update({
    where: { id: postId },
    data: { likeCount: { increment: 1 } },
  })

  // Fire notification to the post author
  createNotification(
    post.authorId,
    'NEW_REACTION',
    `${user.name || user.email.split('@')[0]} reacted with ${type} to your post`,
    { actorId: user.id, entityId: postId, entityType: 'post' }
  ).catch(() => {})

  return NextResponse.json({ reaction })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { postId } = await params

  // Delete the reaction + decrement post.likeCount
  const existing = await db.reaction.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  })
  if (!existing) {
    return NextResponse.json({ removed: false, alreadyRemoved: true })
  }

  await db.reaction.delete({ where: { id: existing.id } })
  await db.post.update({
    where: { id: postId },
    data: { likeCount: { decrement: 1 } },
  })

  return NextResponse.json({ removed: true })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params

  // Aggregate counts by type
  const reactions = await db.reaction.groupBy({
    by: ['type'],
    where: { postId },
    _count: { type: true },
  })

  const counts: Record<string, number> = {}
  let total = 0
  for (const r of reactions) {
    counts[r.type] = r._count.type
    total += r._count.type
  }

  // If the user is logged in, also return their reaction
  const user = await getCurrentUser()
  let myReaction: string | null = null
  if (user) {
    const mine = await db.reaction.findUnique({
      where: { userId_postId: { userId: user.id, postId } },
    })
    myReaction = mine?.type || null
  }

  return NextResponse.json({ counts, total, myReaction })
}
