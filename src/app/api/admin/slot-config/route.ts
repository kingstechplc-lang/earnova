// GET /api/admin/slot-config — list all AdSlotConfig rows (auto-creates missing defaults)
// POST /api/admin/slot-config — bulk upsert (admin edits the table)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { getSlotConfigs, invalidateSlotConfigCache } from '@/lib/slot-config'

// GET — list all slot configs (admin only)
export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rows = await getSlotConfigs()
  return NextResponse.json({ configs: rows })
}

// POST — bulk update slot configs.
// Body: { configs: Array<{ id: string, enabled?, allowedIntegrationTypes?, assignedIntegrationId?, defaultPriority?, visibility? }> }
// Admin-only. The cache is invalidated on success.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await req.json()
  const { configs } = body as {
    configs: Array<{
      id: string
      enabled?: boolean
      allowedIntegrationTypes?: string[]
      assignedIntegrationId?: string | null
      defaultPriority?: number
      visibility?: string
    }>
  }

  if (!Array.isArray(configs) || configs.length === 0) {
    return NextResponse.json({ error: 'configs[] required' }, { status: 400 })
  }

  // Validate visibility values
  const validVisibility = new Set(['ALWAYS', 'ONLY_WHEN_AD_AVAILABLE', 'NEVER'])

  const updates: Promise<any>[] = []
  for (const c of configs) {
    if (!c.id) continue

    const data: any = {}
    if (typeof c.enabled === 'boolean') data.enabled = c.enabled
    if (Array.isArray(c.allowedIntegrationTypes)) {
      data.allowedIntegrationTypes = c.allowedIntegrationTypes.join(',')
    }
    if (c.assignedIntegrationId !== undefined) {
      // Validate that the integration exists + is VERIFIED before assigning
      if (c.assignedIntegrationId !== null) {
        const integ = await db.platformAdNetworkIntegration.findUnique({
          where: { id: c.assignedIntegrationId },
        })
        if (!integ || integ.verificationState !== 'VERIFIED') {
          return NextResponse.json({
            error: `Cannot assign integration ${c.assignedIntegrationId} — not found or not VERIFIED`,
          }, { status: 400 })
        }
      }
      data.assignedIntegrationId = c.assignedIntegrationId
    }
    if (typeof c.defaultPriority === 'number') {
      if (c.defaultPriority < 1 || c.defaultPriority > 200) {
        return NextResponse.json({
          error: `defaultPriority must be 1-200 (got ${c.defaultPriority})`,
        }, { status: 400 })
      }
      data.defaultPriority = c.defaultPriority
    }
    if (typeof c.visibility === 'string') {
      if (!validVisibility.has(c.visibility)) {
        return NextResponse.json({
          error: `visibility must be ALWAYS, ONLY_WHEN_AD_AVAILABLE, or NEVER (got ${c.visibility})`,
        }, { status: 400 })
      }
      data.visibility = c.visibility
    }

    if (Object.keys(data).length > 0) {
      updates.push(db.adSlotConfig.update({ where: { id: c.id }, data }))
    }
  }

  await Promise.all(updates)
  invalidateSlotConfigCache()

  const rows = await getSlotConfigs()
  return NextResponse.json({ configs: rows })
}
