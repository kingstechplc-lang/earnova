// /api/admin/pages/[id]/moderation — change a page's moderation state (with audit log)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

const VALID_STATES = ['PENDING', 'APPROVED', 'RESTRICTED', 'SUSPENDED', 'BANNED'] as const
type ModerationState = typeof VALID_STATES[number]

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { state, reason } = body as { state: ModerationState; reason?: string }
  if (!state || !VALID_STATES.includes(state)) {
    return NextResponse.json({ error: `state must be one of: ${VALID_STATES.join(', ')}` }, { status: 400 })
  }
  const existing = await db.specialPage.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Page not found' }, { status: 404 })

  const fromState = existing.moderationState
  if (fromState === state) {
    return NextResponse.json({ ok: true, message: 'No state change' })
  }

  // If banned/suspended, unpublish automatically
  const update: any = { moderationState: state }
  if (state === 'BANNED' || state === 'SUSPENDED') {
    update.publishedAt = null
  }

  await db.specialPage.update({ where: { id }, data: update })

  await db.moderationEvent.create({
    data: {
      pageId: id,
      fromState,
      toState: state,
      reason: reason || `State changed by ${user.role.toLowerCase()}`,
      triggeredById: user.id,
      triggeredBy: user.id,
    },
  })

  return NextResponse.json({ ok: true, page: { id, moderationState: state } })
}
