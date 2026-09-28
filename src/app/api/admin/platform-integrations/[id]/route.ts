// /api/admin/platform-integrations/[id]
// PATCH — update zone/script/isActive (does NOT change verification state — use /verify or /suspend)
// DELETE — remove a platform integration (blocks if VERIFIED + has active placements)
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
  const { integrationType, zoneIdentifier, scriptReference, isActive } = body as {
    integrationType?: string
    zoneIdentifier?: string
    scriptReference?: string
    isActive?: boolean
  }
  const existing = await db.platformAdNetworkIntegration.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If zone/script changes, reset verification to UNVERIFIED (must re-verify)
  const zoneChanged = zoneIdentifier && zoneIdentifier !== existing.zoneIdentifier
  const scriptChanged = scriptReference && scriptReference !== existing.scriptReference

  const data: any = {}
  if (integrationType !== undefined) data.integrationType = integrationType as any
  if (zoneIdentifier !== undefined) data.zoneIdentifier = zoneIdentifier
  if (scriptReference !== undefined) data.scriptReference = scriptReference
  if (isActive !== undefined) data.isActive = isActive
  if (zoneChanged || scriptChanged) {
    data.verificationState = 'UNVERIFIED'
    data.verifiedAt = null
    data.verifiedById = null
  }

  const updated = await db.platformAdNetworkIntegration.update({
    where: { id },
    data,
    include: { adNetwork: true },
  })
  return NextResponse.json({ integration: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const existing = await db.platformAdNetworkIntegration.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.platformAdNetworkIntegration.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
