// POST /api/block/[username]     — block a user
// DELETE /api/block/[username]   — unblock a user
// GET /api/block/[username]      — check if current user has blocked this user
//
// Per spec section 35 (TRUST & SAFETY):
//   - Block is symmetric in effect: blocked users' content is excluded from
//     the blocker's feeds, search, notifications, and recommendations.
//   - Blocking also auto-unfollows (blocked users shouldn't appear in the
//     following list).
//   - Unique constraint (blockerId + blockedId) prevents duplicate blocks.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

async function resolveTarget(username: string) {
  return db.user.findUnique({
    where: { usernameLower: username.toLowerCase() },
    select: { id: true, name: true, username: true, image: true, bio: true, createdAt: true },
  })
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = await params
  const target = await resolveTarget(username)
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (target.id === user.id) {
    return NextResponse.json({ error: 'You cannot block yourself' }, { status: 400 })
  }

  try {
    await db.block.create({
      data: { blockerId: user.id, blockedId: target.id },
    })
  } catch (err: any) {
    // P2002 = unique constraint — already blocked. Idempotent: return success.
    if (err?.code !== 'P2002') throw err
  }

  // Auto-unfollow (either direction). Blocked users shouldn't appear in the
  // following list, and the blocker shouldn't keep following them either.
  await db.follow.deleteMany({
    where: {
      OR: [
        { followerId: user.id, followeeId: target.id },
        { followerId: target.id, followeeId: user.id },
      ],
    },
  }).catch(() => {})

  return NextResponse.json({ blocked: true, target })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = await params
  const target = await resolveTarget(username)
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await db.block.deleteMany({
    where: { blockerId: user.id, blockedId: target.id },
  })
  return NextResponse.json({ blocked: false })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { username } = await params
  const target = await resolveTarget(username)
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const block = await db.block.findUnique({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: target.id } },
  })
  return NextResponse.json({ blocked: !!block })
}
