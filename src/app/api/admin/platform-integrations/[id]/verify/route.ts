// /api/admin/platform-integrations/[id]/verify
// POST — admin manually marks the integration as VERIFIED after testing + checking the ad-network dashboard
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
  const notes = (body as { notes?: string })?.notes || null
  const existing = await db.platformAdNetworkIntegration.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Soft requirement: must have been tested before verification (warn but allow)
  if (!existing.lastTestedAt) {
    return NextResponse.json(
      { error: 'Run a test first — verification requires a successful test result.' },
      { status: 400 }
    )
  }
  // Check last test result was OK
  if (existing.lastTestResult) {
    try {
      const parsed = JSON.parse(existing.lastTestResult)
      if (!parsed.ok) {
        return NextResponse.json(
          { error: `Last test failed: ${parsed.message}. Resolve the issue and re-test before verifying.` },
          { status: 400 }
        )
      }
    } catch {}
  }

  const updated = await db.platformAdNetworkIntegration.update({
    where: { id },
    data: {
      verificationState: 'VERIFIED',
      verifiedAt: new Date(),
      verifiedById: user.id,
      verificationNotes: notes,
    },
    include: { adNetwork: true },
  })

  // Log moderation event for audit trail
  await db.moderationEvent.create({
    data: {
      toState: 'VERIFIED',
      reason: `Platform integration with ${updated.adNetwork.displayName} (zone ${updated.zoneIdentifier}) verified by admin`,
      triggeredById: user.id,
      triggeredBy: user.id,
    },
  })

  return NextResponse.json({ integration: updated })
}
