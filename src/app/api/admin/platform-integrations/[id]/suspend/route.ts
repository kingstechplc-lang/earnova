// /api/admin/platform-integrations/[id]/suspend
// POST — admin suspends a VERIFIED integration (e.g., ad network reported a policy violation)
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
  const reason = (body as { reason?: string })?.reason || 'Suspended by admin'
  const existing = await db.platformAdNetworkIntegration.findUnique({
    where: { id },
    include: { adNetwork: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await db.platformAdNetworkIntegration.update({
    where: { id },
    data: {
      verificationState: 'SUSPENDED',
      verificationNotes: reason,
    },
    include: { adNetwork: true },
  })

  await db.moderationEvent.create({
    data: {
      toState: 'SUSPENDED',
      reason: `Platform integration with ${updated.adNetwork.displayName} (zone ${updated.zoneIdentifier}) suspended: ${reason}`,
      triggeredById: user.id,
      triggeredBy: user.id,
    },
  })

  return NextResponse.json({ integration: updated })
}
