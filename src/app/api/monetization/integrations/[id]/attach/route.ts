// /api/monetization/integrations/[id]/attach
// POST — attach an approved user integration to a Special Page (creates AdPlacement rows)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const integration = await db.adIntegration.findFirst({
    where: { id, userId: user.id, lifecycleState: 'APPROVED' },
  })
  if (!integration) {
    return NextResponse.json({ error: 'Approved integration not found' }, { status: 404 })
  }

  const body = await req.json()
  const { pageId, slots } = body as { pageId: string; slots: string[] }
  if (!pageId || !Array.isArray(slots) || slots.length === 0) {
    return NextResponse.json({ error: 'pageId and slots required' }, { status: 400 })
  }

  const page = await db.specialPage.findFirst({ where: { id: pageId, ownerId: user.id } })
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 })

  // Remove any existing user-integration placements for this page+integration
  await db.adPlacement.deleteMany({
    where: { pageId, integrationId: integration.id },
  })

  // Create new placements
  await db.adPlacement.createMany({
    data: slots.map((slot, idx) => ({
      pageId,
      integrationId: integration.id,
      source: 'USER_INTEGRATION',
      slot: slot as any,
      priority: 20 + idx * 10,
      enabled: true,
    })),
  })

  return NextResponse.json({ ok: true })
}
