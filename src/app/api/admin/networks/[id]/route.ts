// /api/admin/networks/[id] — update / delete an ad network
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
  const { code, displayName, integrationTypes, requiresSiteVerification, policyDocUrl, tcfVendorId, status } = body as {
    code?: string; displayName?: string; integrationTypes?: string[]
    requiresSiteVerification?: boolean; policyDocUrl?: string | null; tcfVendorId?: number | null
    status?: 'ACTIVE' | 'DEPRECATED' | 'BANNED'
  }
  const existing = await db.adNetwork.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (code && code !== existing.code) {
    const conflict = await db.adNetwork.findUnique({ where: { code } })
    if (conflict) return NextResponse.json({ error: 'Code already in use' }, { status: 409 })
  }

  const data: any = {}
  if (code !== undefined) data.code = code
  if (displayName !== undefined) data.displayName = displayName
  if (integrationTypes !== undefined) data.integrationTypes = JSON.stringify(integrationTypes)
  if (requiresSiteVerification !== undefined) data.requiresSiteVerification = requiresSiteVerification
  if (policyDocUrl !== undefined) data.policyDocUrl = policyDocUrl || null
  if (tcfVendorId !== undefined) data.tcfVendorId = tcfVendorId
  if (status !== undefined) data.status = status

  const updated = await db.adNetwork.update({ where: { id }, data })
  // Invalidate compatibility cache (placement engine caches for 60s)
  return NextResponse.json({ network: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const existing = await db.adNetwork.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Don't allow deleting networks with active integrations
  const intCount = await db.adIntegration.count({ where: { adNetworkId: id, lifecycleState: { not: 'DELETED' } } })
  if (intCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${intCount} user integration(s) still reference this network. Deprecate it instead.` },
      { status: 409 }
    )
  }
  // Don't allow deleting the synthetic 'platform' network
  if (existing.code === 'platform') {
    return NextResponse.json({ error: 'Cannot delete the platform network — it is required for platform ad inventory.' }, { status: 400 })
  }
  // Also block if any platform integrations exist
  const platCount = await db.platformAdNetworkIntegration.count({ where: { adNetworkId: id } })
  if (platCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${platCount} platform integration(s) still reference this network.` },
      { status: 409 }
    )
  }
  await db.adNetwork.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
