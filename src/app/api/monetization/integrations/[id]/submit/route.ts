// /api/monetization/integrations/[id]/submit
// POST — transition from DRAFT → PENDING_REVIEW (user-initiated)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const integration = await db.adIntegration.findFirst({
    where: { id, userId: user.id },
  })
  if (!integration) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (integration.lifecycleState !== 'DRAFT') {
    return NextResponse.json({ error: `Cannot submit integration in state ${integration.lifecycleState}` }, { status: 400 })
  }

  // Required fields for submission
  if (!integration.siteIdentifier || !integration.zoneIdentifier) {
    return NextResponse.json({ error: 'siteIdentifier and zoneIdentifier are required before submission' }, { status: 400 })
  }

  const updated = await db.adIntegration.update({
    where: { id },
    data: { lifecycleState: 'PENDING_REVIEW' },
    include: { adNetwork: true },
  })

  await db.moderationEvent.create({
    data: {
      integrationId: integration.id,
      fromState: 'DRAFT',
      toState: 'PENDING_REVIEW',
      reason: 'User submitted integration for review',
      triggeredBy: user.id,
    },
  })

  return NextResponse.json({ integration: updated })
}
