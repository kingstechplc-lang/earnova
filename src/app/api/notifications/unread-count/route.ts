// GET /api/notifications/unread-count — count of unread notifications for the bell badge
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ count: 0 })

  const count = await db.notification.count({
    where: { userId: user.id, read: false },
  })

  return NextResponse.json({ count })
}
