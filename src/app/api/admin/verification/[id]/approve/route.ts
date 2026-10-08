// POST /api/admin/verification/[id]/approve — approve a verification request
//
// Admin/moderator-only. Sets status=APPROVED, stamps reviewedById + reviewedAt.
// Per spec section 39: for MVP, approval logs the action — a verified badge
// can be added to the User model later. We DO emit a notification to the user
// so they know their verification came through.
//
// Body (optional): { reviewNotes?: string }
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
    // No body is fine — reviewNotes is optional.
  }
  const reviewNotes = typeof body.reviewNotes === 'string' ? body.reviewNotes.trim() : ''
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
      status: 'APPROVED',
      reviewedById: user.id,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes || null,
    },
    include: {
      user: { select: { id: true, email: true, name: true, username: true, image: true } },
    },
  })

  // Audit log (best-effort).
  auditLog({
    actorId: user.id,
    action: 'verification.approved',
    resource: `verification:${id}`,
    previousState: { status: existing.status },
    newState: { status: 'APPROVED' },
    reason: reviewNotes || undefined,
  }).catch(() => {})

  // Notify the user that their verification was approved.
  createNotification(
    existing.userId,
    NotificationType.ACCOUNT_VERIFICATION,
    'Your verification was approved!',
    {
      actorId: user.id,
      entityId: id,
      entityType: 'verification',
      body: reviewNotes || 'Congratulations — your account is now verified.',
    }
  ).catch(() => {})

  return NextResponse.json({ request: updated })
}
