// /api/admin/kill-switch
// GET — current state of all platform-wide controls
// PATCH — toggle global kill switch + per-layer toggles
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  let policy = await db.adPlacementPolicy.findFirst({ where: { name: 'global' } })
  if (!policy) policy = await db.adPlacementPolicy.create({ data: { name: 'global' } })
  return NextResponse.json({ policy })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const body = await req.json()
  const { globalKillSwitch, platformAdsEnabled, userAdsEnabled, newIntegrationsManual } = body as {
    globalKillSwitch?: boolean
    platformAdsEnabled?: boolean
    userAdsEnabled?: boolean
    newIntegrationsManual?: boolean
  }

  let policy = await db.adPlacementPolicy.findFirst({ where: { name: 'global' } })
  if (!policy) policy = await db.adPlacementPolicy.create({ data: { name: 'global' } })

  const update: any = {}
  if (globalKillSwitch !== undefined) update.globalKillSwitch = globalKillSwitch
  if (platformAdsEnabled !== undefined) update.platformAdsEnabled = platformAdsEnabled
  if (userAdsEnabled !== undefined) update.userAdsEnabled = userAdsEnabled
  if (newIntegrationsManual !== undefined) update.newIntegrationsManual = newIntegrationsManual

  const updated = await db.adPlacementPolicy.update({ where: { id: policy.id }, data: update })
  return NextResponse.json({ policy: updated })
}
