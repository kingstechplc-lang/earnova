// GET /api/block — list users the current user has blocked (with user info)
//
// Returns the blocker's full block list, including the blocked users' public
// profile info so the client can render avatar/name/username in a management
// UI without a second round-trip.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const blocks = await db.block.findMany({
    where: { blockerId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      blocked: {
        select: {
          id: true, name: true, username: true, image: true, bio: true, createdAt: true,
        },
      },
    },
  })

  return NextResponse.json({
    blocked: blocks.map(b => ({
      id: b.id,
      createdAt: b.createdAt,
      user: b.blocked,
    })),
  })
}
