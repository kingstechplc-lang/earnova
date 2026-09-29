// /api/admin/platform-integrations
// GET — list all platform ad-network integrations (with verification state + ad-tag config)
// POST — create a new platform integration (starts UNVERIFIED)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { renderAdTag } from '@/lib/ad-renderer'

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
    integrations: integrations.map(i => {
      // Generate a preview of the ad tag for the admin
      const adTag = renderAdTag({
        networkCode: i.adNetwork.code,
        integrationType: i.integrationType,
        zoneKey: i.zoneKey,
        zoneId: i.zoneIdentifier,
        cdnUrl: i.cdnUrl,
        formatOptions: i.formatOptions ? JSON.parse(i.formatOptions) : null,
      })
      return {
        id: i.id,
        adNetwork: {
          id: i.adNetwork.id,
          code: i.adNetwork.code,
          displayName: i.adNetwork.displayName,
        },
        integrationType: i.integrationType,
        zoneIdentifier: i.zoneIdentifier,
        zoneKey: i.zoneKey,
        cdnUrl: i.cdnUrl,
        formatOptions: i.formatOptions ? JSON.parse(i.formatOptions) : null,
        scriptReference: i.scriptReference,
        isActive: i.isActive,
        verificationState: i.verificationState,
        verifiedAt: i.verifiedAt,
        lastTestedAt: i.lastTestedAt,
        lastTestResult: i.lastTestResult ? JSON.parse(i.lastTestResult) : null,
        verificationNotes: i.verificationNotes,
        // Ad-tag preview for admin inspection
        adTagHtml: adTag.html,
        adTagDescription: adTag.description,
        adTagScriptSrc: adTag.scriptSrc,
        isLive: adTag.isLive,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      }
    }),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const body = await req.json()
  const {
    adNetworkId, integrationType, zoneIdentifier, zoneKey, cdnUrl,
    formatOptions, scriptReference,
  } = body as {
    adNetworkId: string
    integrationType: string
    zoneIdentifier: string
    zoneKey?: string
    cdnUrl?: string
    formatOptions?: { width?: number; height?: number; format?: string }
    scriptReference?: string
  }
  if (!adNetworkId || !integrationType || !zoneIdentifier) {
    return NextResponse.json({ error: 'adNetworkId, integrationType, zoneIdentifier required' }, { status: 400 })
  }
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
      zoneKey: zoneKey || null,
      cdnUrl: cdnUrl || null,
      formatOptions: formatOptions ? JSON.stringify(formatOptions) : null,
      scriptReference: scriptReference || `${network.code}-${integrationType.toLowerCase()}-${zoneIdentifier}`,
      isActive: true,
      verificationState: 'UNVERIFIED',
    },
    include: { adNetwork: true },
  })
  return NextResponse.json({ integration })
}
