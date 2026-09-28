// /api/admin/users/[id]/unban — restore user (set all their pages back to PENDING for re-review)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const reason = (body as { reason?: string })?.reason || 'Unbanned by admin'
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Restore all banned pages to PENDING (requires re-moderation)
  const pages = await db.specialPage.findMany({ where: { ownerId: id, moderationState: 'BANNED' } })
  await db.specialPage.updateMany({
    where: { ownerId: id, moderationState: 'BANNED' },
    data: { moderationState: 'PENDING' },
  })
  await db.moderationEvent.createMany({
    data: pages.map(p => ({
      pageId: p.id,
      fromState: 'BANNED',
      toState: 'PENDING',
      reason,
      triggeredById: user.id,
      triggeredBy: user.id,
    })),
  })

  return NextResponse.json({ ok: true, restoredPages: pages.length })
}
