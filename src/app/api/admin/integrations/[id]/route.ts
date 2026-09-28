// /api/admin/integrations/[id]
// PATCH — admin transitions: PENDING_REVIEW → APPROVED | DISABLED | REVOKED
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { action, reason } = body as { action: 'APPROVE' | 'REJECT' | 'DISABLE' | 'REVOKE'; reason?: string }

  const integration = await db.adIntegration.findUnique({ where: { id } })
  if (!integration) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let newStatus: string
  switch (action) {
    case 'APPROVE':
      if (integration.lifecycleState !== 'PENDING_REVIEW') {
        return NextResponse.json({ error: 'Integration not in PENDING_REVIEW' }, { status: 400 })
      }
      newStatus = 'APPROVED'
      break
    case 'REJECT':
      // Reject from pending → back to DRAFT (user can fix and resubmit)
      if (integration.lifecycleState !== 'PENDING_REVIEW') {
        return NextResponse.json({ error: 'Integration not in PENDING_REVIEW' }, { status: 400 })
      }
      newStatus = 'DRAFT'
      break
    case 'DISABLE':
      if (integration.lifecycleState !== 'APPROVED') {
        return NextResponse.json({ error: 'Integration not APPROVED' }, { status: 400 })
      }
      newStatus = 'DISABLED'
      break
    case 'REVOKE':
      // Permanent disable; ad-network webhook reports suspension
      newStatus = 'REVOKED'
      break
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const update: any = { lifecycleState: newStatus }
  if (action === 'APPROVE') {
    update.approvedAt = new Date()
    update.approvedById = user.id
    update.rejectionReason = null
  }
  if (action === 'REJECT') {
    update.rejectionReason = reason || 'Rejected by moderator'
  }
  if (action === 'DISABLE') {
    update.disabledAt = new Date()
  }
  if (action === 'REVOKE') {
    update.revokedAt = new Date()
    update.revokedReason = reason || 'Ad network reported suspension'
  }

  const updated = await db.adIntegration.update({
    where: { id },
    data: update,
    include: { adNetwork: true, user: { select: { id: true, email: true, name: true } } },
  })

  await db.moderationEvent.create({
    data: {
      integrationId: integration.id,
      fromState: integration.lifecycleState,
      toState: newStatus,
      reason: reason || action,
      triggeredById: user.id,
      triggeredBy: user.id,
    },
  })

  return NextResponse.json({ integration: updated })
}
