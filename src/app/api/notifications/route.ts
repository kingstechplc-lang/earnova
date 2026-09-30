// GET  /api/notifications — list current user's notifications (paginated)
// PATCH /api/notifications — mark all as read (or specific ids if body.ids given)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const cursor = url.searchParams.get('cursor')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50)
  const unreadOnly = url.searchParams.get('unread') === '1'

  const where: any = { userId: user.id }
  if (unreadOnly) where.read = false

  const notifications = await db.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      actor: {
        select: { id: true, name: true, username: true, image: true },
      },
    },
  })

  const hasMore = notifications.length > limit
  const items = hasMore ? notifications.slice(0, -1) : notifications
  return NextResponse.json({
    notifications: items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { ids } = body as { ids?: string[] }

  if (ids && Array.isArray(ids)) {
    // Mark specific notifications as read
    await db.notification.updateMany({
      where: { userId: user.id, id: { in: ids }, read: false },
      data: { read: true, readAt: new Date() },
    })
  } else {
    // Mark ALL as read
    await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true, readAt: new Date() },
    })
  }

  return NextResponse.json({ ok: true })
}
