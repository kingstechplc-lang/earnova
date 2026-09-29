// /api/admin/integrations-all — list ALL user ad integrations (not just pending) with search + state filter
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const state = searchParams.get('state') || ''

  const where: any = { lifecycleState: { not: 'DELETED' } }
  if (state && state !== 'ALL') where.lifecycleState = state
  if (search) {
    where.OR = [
      { user: { email: { contains: search } } },
      { user: { name: { contains: search } } },
      { siteIdentifier: { contains: search } },
      { zoneIdentifier: { contains: search } },
      { zoneKey: { contains: search } },
    ]
  }

  const integrations = await db.adIntegration.findMany({
    where,
    include: {
      adNetwork: true,
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({
    integrations: integrations.map(i => ({
      id: i.id,
      integrationType: i.integrationType,
      siteIdentifier: i.siteIdentifier,
      zoneIdentifier: i.zoneIdentifier,
      zoneKey: i.zoneKey,
      cdnUrl: i.cdnUrl,
      lifecycleState: i.lifecycleState,
      rejectionReason: i.rejectionReason,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      adNetwork: {
        id: i.adNetwork.id,
        code: i.adNetwork.code,
        displayName: i.adNetwork.displayName,
        policyDocUrl: i.adNetwork.policyDocUrl,
      },
      user: i.user,
    })),
  })
}
