// /api/admin/users/[id]/ban — ban user (set all their pages to BANNED, disable all integrations)
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
  const reason = (body as { reason?: string })?.reason || 'Banned by admin'
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.id === user.id) {
    return NextResponse.json({ error: 'You cannot ban yourself.' }, { status: 400 })
  }
  if (target.role === 'ADMIN') {
    return NextResponse.json({ error: 'Cannot ban an admin. Demote them first.' }, { status: 400 })
  }

  // Set all their pages to BANNED
  await db.specialPage.updateMany({
    where: { ownerId: id, moderationState: { not: 'BANNED' } },
    data: { moderationState: 'BANNED' },
  })
  // Log moderation events for each banned page
  const pages = await db.specialPage.findMany({ where: { ownerId: id } })
  await db.moderationEvent.createMany({
    data: pages.map(p => ({
      pageId: p.id,
      fromState: p.moderationState,
      toState: 'BANNED',
      reason,
      triggeredById: user.id,
      triggeredBy: user.id,
    })),
  })
  // Disable all their ad integrations
  await db.adIntegration.updateMany({
    where: { userId: id, lifecycleState: { notIn: ['DELETED', 'REVOKED'] } },
    data: { lifecycleState: 'DISABLED', disabledAt: new Date() },
  })

  return NextResponse.json({ ok: true, bannedPages: pages.length })
}
