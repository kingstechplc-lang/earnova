// POST   /api/follow/[username]   — follow a user
// DELETE /api/follow/[username]   — unfollow a user
// GET    /api/follow/[username]   — check if current user follows this user
//
// Per spec section 11 (FOLLOW SYSTEM):
//   - No duplicate follows (enforced by unique constraint)
//   - Proper database uniqueness constraints (already in schema)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = await params
  const target = await db.user.findUnique({
    where: { usernameLower: username.toLowerCase() },
  })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (target.id === user.id) {
    return NextResponse.json({ error: 'You cannot follow yourself' }, { status: 400 })
  }

  try {
    await db.follow.create({
      data: { followerId: user.id, followeeId: target.id },
    })
    // Fire + forget notification (don't block the response)
    createNotification(
      target.id,
      'NEW_FOLLOWER',
      `${user.name || user.email.split('@')[0]} started following you`,
      { actorId: user.id, entityId: user.id, entityType: 'user' }
    ).catch(() => {})
    return NextResponse.json({ following: true })
  } catch (err: any) {
    // Prisma P2002 = unique constraint violation (already following)
    if (err?.code === 'P2002') {
      return NextResponse.json({ following: true, alreadyFollowing: true })
    }
    throw err
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = await params
  const target = await db.user.findUnique({
    where: { usernameLower: username.toLowerCase() },
  })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await db.follow.deleteMany({
    where: { followerId: user.id, followeeId: target.id },
  })
  return NextResponse.json({ following: false })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = await params
  const target = await db.user.findUnique({
    where: { usernameLower: username.toLowerCase() },
  })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const follow = await db.follow.findUnique({
    where: { followerId_followeeId: { followerId: user.id, followeeId: target.id } },
  })
  return NextResponse.json({ following: !!follow })
}
