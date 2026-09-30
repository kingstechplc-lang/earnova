// PATCH /api/notifications/[id] — mark a single notification as read
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const updated = await db.notification.updateMany({
    where: { id, userId: user.id, read: false },
    data: { read: true, readAt: new Date() },
  })

  return NextResponse.json({ ok: true, updated: updated.count })
}
