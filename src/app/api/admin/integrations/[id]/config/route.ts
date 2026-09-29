// /api/admin/integrations/[id]/config — admin updates zone/CDN/key config for a user's ad integration
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const body = await req.json()
  const { zoneKey, cdnUrl, siteIdentifier, zoneIdentifier } = body as {
    zoneKey?: string | null
    cdnUrl?: string | null
    siteIdentifier?: string | null
    zoneIdentifier?: string | null
  }
  const existing = await db.adIntegration.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: any = {}
  if (zoneKey !== undefined) data.zoneKey = zoneKey || null
  if (cdnUrl !== undefined) data.cdnUrl = cdnUrl || null
  if (siteIdentifier !== undefined) data.siteIdentifier = siteIdentifier || null
  if (zoneIdentifier !== undefined) data.zoneIdentifier = zoneIdentifier || null

  const updated = await db.adIntegration.update({ where: { id }, data })

  await db.moderationEvent.create({
    data: {
      integrationId: id,
      fromState: existing.lifecycleState,
      toState: existing.lifecycleState,
      reason: `Admin updated ad-tag config (zoneKey/cdnUrl/site/zone) for integration`,
      triggeredById: user.id,
      triggeredBy: user.id,
    },
  })

  return NextResponse.json({ integration: updated })
}
