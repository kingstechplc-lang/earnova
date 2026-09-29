// PATCH /api/admin/slot-config/[id] — update one slot config
// DELETE /api/admin/slot-config/[id] — delete (re-create on next read)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { invalidateSlotConfigCache } from '@/lib/slot-config'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()
  const {
    enabled,
    allowedIntegrationTypes,
    assignedIntegrationId,
    defaultPriority,
    visibility,
  } = body as {
    enabled?: boolean
    allowedIntegrationTypes?: string[]
    assignedIntegrationId?: string | null
    defaultPriority?: number
    visibility?: string
  }

  const data: any = {}
  if (typeof enabled === 'boolean') data.enabled = enabled
  if (Array.isArray(allowedIntegrationTypes)) {
    data.allowedIntegrationTypes = allowedIntegrationTypes.join(',')
  }
  if (assignedIntegrationId !== undefined) {
    if (assignedIntegrationId !== null) {
      const integ = await db.platformAdNetworkIntegration.findUnique({
        where: { id: assignedIntegrationId },
      })
      if (!integ || integ.verificationState !== 'VERIFIED') {
        return NextResponse.json({
          error: 'Cannot assign integration — not found or not VERIFIED',
        }, { status: 400 })
      }
    }
    data.assignedIntegrationId = assignedIntegrationId
  }
  if (typeof defaultPriority === 'number') {
    if (defaultPriority < 1 || defaultPriority > 200) {
      return NextResponse.json({ error: 'defaultPriority must be 1-200' }, { status: 400 })
    }
    data.defaultPriority = defaultPriority
  }
  if (typeof visibility === 'string') {
    const valid = new Set(['ALWAYS', 'ONLY_WHEN_AD_AVAILABLE', 'NEVER'])
    if (!valid.has(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility value' }, { status: 400 })
    }
    data.visibility = visibility
  }

  const updated = await db.adSlotConfig.update({ where: { id }, data })
  invalidateSlotConfigCache()
  return NextResponse.json({ config: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  await db.adSlotConfig.delete({ where: { id } })
  invalidateSlotConfigCache()
  return NextResponse.json({ ok: true })
}
