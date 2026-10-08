// GET /api/mute — list users the current user has muted (with user info)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mutes = await db.mute.findMany({
    where: { muterId: user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      muted: {
        select: {
          id: true, name: true, username: true, image: true, bio: true, createdAt: true,
        },
      },
    },
  })

  return NextResponse.json({
    muted: mutes.map(m => ({
      id: m.id,
      createdAt: m.createdAt,
      user: m.muted,
    })),
  })
}
