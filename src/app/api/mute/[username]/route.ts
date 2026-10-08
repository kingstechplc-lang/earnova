// POST /api/mute/[username]     — mute a user
// DELETE /api/mute/[username]   — unmute a user
//
// Per spec section 35 (TRUST & SAFETY):
//   - Mute is one-directional + less severe than block.
//   - Muted users' content is hidden from the muter's feed + discovery
//     surfaces, but the muted user can still follow/react/comment (they just
//     don't appear in the muter's surfaces).
//   - Unlike block, mute does NOT auto-unfollow.
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
    return NextResponse.json({ error: 'You cannot mute yourself' }, { status: 400 })
  }

  try {
    await db.mute.create({
      data: { muterId: user.id, mutedId: target.id },
    })
  } catch (err: any) {
    if (err?.code !== 'P2002') throw err
  }

  return NextResponse.json({ muted: true, target })
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

  await db.mute.deleteMany({
    where: { muterId: user.id, mutedId: target.id },
  })
  return NextResponse.json({ muted: false })
}
