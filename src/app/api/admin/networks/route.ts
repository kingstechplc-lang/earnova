// /api/admin/networks — list all ad networks (incl deprecated) + create new
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const networks = await db.adNetwork.findMany({
    include: {
      _count: {
        select: { integrations: true, platformIntegrations: true },
      },
    },
    orderBy: { displayName: 'asc' },
  })
  return NextResponse.json({
    networks: networks.map(n => ({
      id: n.id,
      code: n.code,
      displayName: n.displayName,
      integrationTypes: JSON.parse(n.integrationTypes),
      requiresSiteVerification: n.requiresSiteVerification,
      policyDocUrl: n.policyDocUrl,
      status: n.status,
      tcfVendorId: n.tcfVendorId,
      integrationsCount: n._count.integrations,
      platformIntegrationsCount: n._count.platformIntegrations,
      createdAt: n.createdAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const body = await req.json()
  const { code, displayName, integrationTypes, requiresSiteVerification, policyDocUrl, tcfVendorId } = body as {
    code: string; displayName: string; integrationTypes: string[]
    requiresSiteVerification?: boolean; policyDocUrl?: string; tcfVendorId?: number
  }
  if (!code || !displayName || !Array.isArray(integrationTypes)) {
    return NextResponse.json({ error: 'code, displayName, integrationTypes[] required' }, { status: 400 })
  }
  const existing = await db.adNetwork.findUnique({ where: { code } })
  if (existing) {
    return NextResponse.json({ error: 'Code already in use' }, { status: 409 })
  }
  const network = await db.adNetwork.create({
    data: {
      code,
      displayName,
      integrationTypes: JSON.stringify(integrationTypes),
      requiresSiteVerification: requiresSiteVerification ?? true,
      policyDocUrl: policyDocUrl || null,
      tcfVendorId: tcfVendorId || null,
      status: 'ACTIVE',
    },
  })
  return NextResponse.json({ network })
}
