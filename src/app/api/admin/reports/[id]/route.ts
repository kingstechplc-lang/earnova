// PATCH /api/admin/reports/[id] — resolve / dismiss / escalate a report
//
// Admin/moderator transitions a report's status. Valid transitions:
//   - PENDING/UNDER_REVIEW → RESOLVED    (resolution + resolutionAction)
//   - PENDING/UNDER_REVIEW → DISMISSED   (optional resolution note)
//   - PENDING/UNDER_REVIEW → ESCALATED   (optional resolution note)
//   - PENDING → UNDER_REVIEW             (admin has picked it up)
//
// Body:
//   { status: 'RESOLVED'|'DISMISSED'|'ESCALATED'|'UNDER_REVIEW',
//     resolution?: string,        // freeform note (≤ 2000 chars)
//     resolutionAction?: string } // 'warning' | 'suspension' | 'ban' |
//                                 // 'content_removed' | 'no_action' | custom
//
// On resolve/dismiss/escalate, sets resolvedById + resolvedAt.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, auditLog } from '@/lib/auth'
import { ReportStatus } from '@prisma/client'

const VALID_TARGETS: ReportStatus[] = ['RESOLVED', 'DISMISSED', 'ESCALATED', 'UNDER_REVIEW']
const VALID_RESOLUTION_ACTIONS = ['warning', 'suspension', 'ban', 'content_removed', 'no_action']
const MAX_RESOLUTION = 2000

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { status, resolution, resolutionAction } = body as {
    status?: string
    resolution?: string
    resolutionAction?: string
  }

  if (!status || !VALID_TARGETS.includes(status as ReportStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const trimmedResolution = (resolution || '').trim()
  if (trimmedResolution.length > MAX_RESOLUTION) {
    return NextResponse.json({ error: `Resolution must be at most ${MAX_RESOLUTION} characters` }, { status: 400 })
  }
  if (resolutionAction && !VALID_RESOLUTION_ACTIONS.includes(resolutionAction)) {
    return NextResponse.json({ error: 'Invalid resolutionAction' }, { status: 400 })
  }

  const existing = await db.report.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

  const targetStatus = status as ReportStatus
  const isTerminal = targetStatus === 'RESOLVED' || targetStatus === 'DISMISSED' || targetStatus === 'ESCALATED'

  const data: any = { status: targetStatus }
  if (isTerminal) {
    data.resolvedById = user.id
    data.resolvedAt = new Date()
    if (trimmedResolution) data.resolution = trimmedResolution
    if (resolutionAction) data.resolutionAction = resolutionAction
  } else if (trimmedResolution) {
    // UNDER_REVIEW transition — keep the note in resolution but don't stamp
    // resolvedById/resolvedAt.
    data.resolution = trimmedResolution
  }

  const updated = await db.report.update({
    where: { id },
    data,
    include: {
      reporter: {
        select: { id: true, name: true, username: true, email: true, image: true },
      },
      resolver: {
        select: { id: true, name: true, username: true, email: true },
      },
    },
  })

  // Audit log — best-effort, never blocks the response.
  auditLog({
    actorId: user.id,
    action: `report.${targetStatus.toLowerCase()}`,
    resource: `report:${id}`,
    previousState: { status: existing.status },
    newState: { status: targetStatus, resolution: trimmedResolution || null, resolutionAction: resolutionAction || null },
    reason: trimmedResolution || undefined,
  }).catch(() => {})

  return NextResponse.json({ report: updated })
}
