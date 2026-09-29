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
  const { integrationType, zoneIdentifier, zoneKey, cdnUrl, formatOptions, scriptReference, isActive } = body as {
    integrationType?: string
    zoneIdentifier?: string
    zoneKey?: string | null
    cdnUrl?: string | null
    formatOptions?: { width?: number; height?: number; format?: string } | null
    scriptReference?: string
    isActive?: boolean
  }
  const existing = await db.platformAdNetworkIntegration.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If zone/CDN/script changes, reset verification to UNVERIFIED (must re-verify)
  const zoneChanged = zoneIdentifier && zoneIdentifier !== existing.zoneIdentifier
  const zoneKeyChanged = zoneKey !== undefined && zoneKey !== existing.zoneKey
  const cdnChanged = cdnUrl !== undefined && cdnUrl !== existing.cdnUrl
  const scriptChanged = scriptReference && scriptReference !== existing.scriptReference

  const data: any = {}
  if (integrationType !== undefined) data.integrationType = integrationType as any
  if (zoneIdentifier !== undefined) data.zoneIdentifier = zoneIdentifier
  if (zoneKey !== undefined) data.zoneKey = zoneKey || null
  if (cdnUrl !== undefined) data.cdnUrl = cdnUrl || null
  if (formatOptions !== undefined) data.formatOptions = formatOptions ? JSON.stringify(formatOptions) : null
  if (scriptReference !== undefined) data.scriptReference = scriptReference
  if (isActive !== undefined) data.isActive = isActive
  if (zoneChanged || zoneKeyChanged || cdnChanged || scriptChanged) {
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
