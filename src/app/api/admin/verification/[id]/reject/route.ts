// POST /api/admin/verification/[id]/reject — reject a verification request
//
// Admin/moderator-only. Sets status=REJECTED, stamps reviewedById + reviewedAt.
// Body: { reviewNotes: string }  — required, so the user gets feedback.
//
// Emits a notification to the user that their verification was rejected.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, auditLog } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import { NotificationType } from '@prisma/client'

const MAX_NOTES = 2000

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const reviewNotes = typeof body.reviewNotes === 'string' ? body.reviewNotes.trim() : ''
  if (!reviewNotes) {
    return NextResponse.json({ error: 'reviewNotes is required when rejecting' }, { status: 400 })
  }
  if (reviewNotes.length > MAX_NOTES) {
    return NextResponse.json({ error: `reviewNotes must be ≤ ${MAX_NOTES} chars` }, { status: 400 })
  }

  const existing = await db.verificationRequest.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  if (existing.status !== 'PENDING') {
    return NextResponse.json({ error: `Request is already ${existing.status}` }, { status: 400 })
  }

  const updated = await db.verificationRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      reviewedById: user.id,
      reviewedAt: new Date(),
      reviewNotes,
    },
    include: {
      user: { select: { id: true, email: true, name: true, username: true, image: true } },
    },
  })

  // Audit log (best-effort).
  auditLog({
    actorId: user.id,
    action: 'verification.rejected',
    resource: `verification:${id}`,
    previousState: { status: existing.status },
    newState: { status: 'REJECTED' },
    reason: reviewNotes,
  }).catch(() => {})

  // Notify the user that their verification was rejected.
  createNotification(
    existing.userId,
    NotificationType.ACCOUNT_VERIFICATION,
    'Your verification request was not approved',
    {
      actorId: user.id,
      entityId: id,
      entityType: 'verification',
      body: reviewNotes,
    }
  ).catch(() => {})

  return NextResponse.json({ request: updated })
}
