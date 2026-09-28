// /api/monetization/integrations/[id]/disable
// POST — transition APPROVED → DISABLED (user-initiated; recoverable)
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

  if (integration.lifecycleState !== 'APPROVED') {
    return NextResponse.json({ error: `Cannot disable integration in state ${integration.lifecycleState}` }, { status: 400 })
  }

  const updated = await db.adIntegration.update({
    where: { id },
    data: {
      lifecycleState: 'DISABLED',
      disabledAt: new Date(),
    },
    include: { adNetwork: true },
  })

  await db.moderationEvent.create({
    data: {
      integrationId: integration.id,
      fromState: 'APPROVED',
      toState: 'DISABLED',
      reason: 'User disabled integration',
      triggeredBy: user.id,
    },
  })

  return NextResponse.json({ integration: updated })
}
