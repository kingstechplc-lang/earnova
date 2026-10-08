// POST /api/reports — create a report
//
// Any logged-in user can file a report against any entity (USER / PAGE / POST /
// COMMENT / LINK / AD). The body must specify entityType, entityId, and reason
// (one of the 12 ReportReason values). An optional description (up to 1000
// chars) lets the reporter add context.
//
// Per spec section 35 (TRUST & SAFETY):
//   - Prevents duplicate reports (same reporter + entity) — returns the existing
//     one instead of creating a second row.
//   - Validates reason is a valid ReportReason.
//
// No admin/mod check here — this endpoint is for end users. The admin-side
// list/resolve endpoints live under /api/admin/reports/*.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ReportReason, ReportEntityType } from '@prisma/client'

const VALID_REASONS: ReportReason[] = [
  'SPAM', 'SCAM', 'MALWARE', 'HARASSMENT', 'IMPERSONATION', 'COPYRIGHT',
  'ADULT_CONTENT', 'ILLEGAL_ACTIVITY', 'HATEFUL_CONTENT', 'VIOLENCE',
  'MISLEADING_CONTENT', 'OTHER',
]

const VALID_ENTITY_TYPES: ReportEntityType[] = ['USER', 'PAGE', 'POST', 'COMMENT', 'LINK', 'AD']

const MAX_DESCRIPTION = 1000

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { entityType, entityId, reason, description } = body as {
    entityType?: string
    entityId?: string
    reason?: string
    description?: string
  }

  if (!entityType || !VALID_ENTITY_TYPES.includes(entityType as ReportEntityType)) {
    return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
  }
  if (!entityId || typeof entityId !== 'string' || entityId.length > 200) {
    return NextResponse.json({ error: 'Invalid entityId' }, { status: 400 })
  }
  if (!reason || !VALID_REASONS.includes(reason as ReportReason)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
  }
  const trimmedDescription = (description || '').trim()
  if (trimmedDescription.length > MAX_DESCRIPTION) {
    return NextResponse.json({ error: `Description must be at most ${MAX_DESCRIPTION} characters` }, { status: 400 })
  }

  // Prevent self-reports (USER entity only — reporting your own page/post is
  // allowed but unusual; we still allow it to avoid false positives).
  if (entityType === 'USER' && entityId === user.id) {
    return NextResponse.json({ error: 'You cannot report yourself' }, { status: 400 })
  }

  // Check for an existing report by this user about this entity. We use a
  // unique-ish lookup (reporterId + entityType + entityId) — there's no DB
  // unique constraint spanning those three, so we just take the most recent.
  const existing = await db.report.findFirst({
    where: { reporterId: user.id, entityType: entityType as ReportEntityType, entityId },
    orderBy: { createdAt: 'desc' },
  })
  if (existing) {
    return NextResponse.json({
      report: existing,
      alreadyReported: true,
      message: 'You have already reported this. Our team will review it.',
    })
  }

  const report = await db.report.create({
    data: {
      reporterId: user.id,
      entityType: entityType as ReportEntityType,
      entityId,
      reason: reason as ReportReason,
      description: trimmedDescription || null,
    },
  })

  return NextResponse.json({ report }, { status: 201 })
}
