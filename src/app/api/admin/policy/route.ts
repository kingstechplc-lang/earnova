// /api/admin/policy — GET (current policy) + PATCH (update any/all fields)
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
  const {
    maxAdUnitsPerPage, maxPlatformAdsPerPage, maxUserAdsPerPage,
    minContentBetweenAdsPx, platformAdsEnabled, userAdsEnabled,
    newIntegrationsManual, globalKillSwitch, userAdFormatSelection, adSlotResponsive,
  } = body as {
    maxAdUnitsPerPage?: number
    maxPlatformAdsPerPage?: number
    maxUserAdsPerPage?: number
    minContentBetweenAdsPx?: number
    platformAdsEnabled?: boolean
    userAdsEnabled?: boolean
    newIntegrationsManual?: boolean
    globalKillSwitch?: boolean
    userAdFormatSelection?: boolean
    adSlotResponsive?: boolean
  }

  let policy = await db.adPlacementPolicy.findFirst({ where: { name: 'global' } })
  if (!policy) policy = await db.adPlacementPolicy.create({ data: { name: 'global' } })

  // Validate numeric fields
  if (maxAdUnitsPerPage !== undefined && (maxAdUnitsPerPage < 1 || maxAdUnitsPerPage > 20)) {
    return NextResponse.json({ error: 'maxAdUnitsPerPage must be 1-20' }, { status: 400 })
  }
  if (maxPlatformAdsPerPage !== undefined && (maxPlatformAdsPerPage < 0 || maxPlatformAdsPerPage > 10)) {
    return NextResponse.json({ error: 'maxPlatformAdsPerPage must be 0-10' }, { status: 400 })
  }
  if (maxUserAdsPerPage !== undefined && (maxUserAdsPerPage < 0 || maxUserAdsPerPage > 10)) {
    return NextResponse.json({ error: 'maxUserAdsPerPage must be 0-10' }, { status: 400 })
  }
  if (minContentBetweenAdsPx !== undefined && (minContentBetweenAdsPx < 0 || minContentBetweenAdsPx > 1000)) {
    return NextResponse.json({ error: 'minContentBetweenAdsPx must be 0-1000' }, { status: 400 })
  }

  const data: any = {}
  if (maxAdUnitsPerPage !== undefined) data.maxAdUnitsPerPage = maxAdUnitsPerPage
  if (maxPlatformAdsPerPage !== undefined) data.maxPlatformAdsPerPage = maxPlatformAdsPerPage
  if (maxUserAdsPerPage !== undefined) data.maxUserAdsPerPage = maxUserAdsPerPage
  if (minContentBetweenAdsPx !== undefined) data.minContentBetweenAdsPx = minContentBetweenAdsPx
  if (platformAdsEnabled !== undefined) data.platformAdsEnabled = platformAdsEnabled
  if (userAdsEnabled !== undefined) data.userAdsEnabled = userAdsEnabled
  if (newIntegrationsManual !== undefined) data.newIntegrationsManual = newIntegrationsManual
  if (globalKillSwitch !== undefined) data.globalKillSwitch = globalKillSwitch
  if (userAdFormatSelection !== undefined) data.userAdFormatSelection = userAdFormatSelection
  if (adSlotResponsive !== undefined) data.adSlotResponsive = adSlotResponsive

  const updated = await db.adPlacementPolicy.update({ where: { id: policy.id }, data })
  return NextResponse.json({ policy: updated })
}
