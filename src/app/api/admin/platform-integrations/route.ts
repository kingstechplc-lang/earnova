// /api/admin/platform-integrations
// GET — list all platform ad-network integrations (with verification state)
// POST — create a new platform integration (starts UNVERIFIED)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const integrations = await db.platformAdNetworkIntegration.findMany({
    include: { adNetwork: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({
    integrations: integrations.map(i => ({
      id: i.id,
      adNetwork: {
        id: i.adNetwork.id,
        code: i.adNetwork.code,
        displayName: i.adNetwork.displayName,
      },
      integrationType: i.integrationType,
      zoneIdentifier: i.zoneIdentifier,
      scriptReference: i.scriptReference,
      isActive: i.isActive,
      verificationState: i.verificationState,
      verifiedAt: i.verifiedAt,
      lastTestedAt: i.lastTestedAt,
      lastTestResult: i.lastTestResult ? JSON.parse(i.lastTestResult) : null,
      verificationNotes: i.verificationNotes,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const body = await req.json()
  const { adNetworkId, integrationType, zoneIdentifier, scriptReference } = body as {
    adNetworkId: string
    integrationType: string
    zoneIdentifier: string
    scriptReference: string
  }
  if (!adNetworkId || !integrationType || !zoneIdentifier || !scriptReference) {
    return NextResponse.json({ error: 'adNetworkId, integrationType, zoneIdentifier, scriptReference required' }, { status: 400 })
  }
  // Validate network exists and isn't the synthetic 'platform' network
  const network = await db.adNetwork.findUnique({ where: { id: adNetworkId } })
  if (!network) {
    return NextResponse.json({ error: 'Ad network not found' }, { status: 404 })
  }
  if (network.code === 'platform') {
    return NextResponse.json({ error: 'Cannot create a platform integration pointing to the synthetic "platform" network. Choose Adsterra, Monetag, or another real network.' }, { status: 400 })
  }
  const integration = await db.platformAdNetworkIntegration.create({
    data: {
      adNetworkId,
      integrationType: integrationType as any,
      zoneIdentifier,
      scriptReference,
      isActive: true,
      verificationState: 'UNVERIFIED',  // always starts unverified
    },
    include: { adNetwork: true },
  })
  return NextResponse.json({ integration })
}
