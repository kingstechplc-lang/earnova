// /api/monetization/integrations
// GET — list current user's ad integrations
// POST — create new ad integration (starts in DRAFT state)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const integrations = await db.adIntegration.findMany({
    where: { userId: user.id, lifecycleState: { not: 'DELETED' } },
    include: { adNetwork: true, placements: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ integrations })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Compliance gate: user must have acknowledged the earnings disclaimer before
  // creating an ad integration. (Chapter 6 of the spec.)
  const ack = await db.earningsDisclaimerAck.findFirst({
    where: { userId: user.id },
    orderBy: { acknowledgedAt: 'desc' },
  })
  if (!ack) {
    return NextResponse.json(
      { error: 'Earnings disclaimer must be acknowledged before connecting an ad network. Please visit the Monetization page first.' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { adNetworkId, integrationType, siteIdentifier, zoneIdentifier, zoneKey, cdnUrl, formatOptions, scriptReference } = body as {
    adNetworkId: string; integrationType: string; siteIdentifier?: string; zoneIdentifier?: string
    zoneKey?: string; cdnUrl?: string; formatOptions?: { width?: number; height?: number; format?: string }
    scriptReference?: string
  }
  if (!adNetworkId || !integrationType) {
    return NextResponse.json({ error: 'adNetworkId and integrationType required' }, { status: 400 })
  }

  const network = await db.adNetwork.findUnique({ where: { id: adNetworkId } })
  if (!network || network.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Ad network not available' }, { status: 400 })
  }

  // CRITICAL: never store raw user-supplied JavaScript. We accept only sanitized identifiers
  // (zoneKey, cdnUrl, formatOptions). The actual ad code is emitted by the server-side AdRenderer
  // using platform-controlled templates. This is per Chapter 7 of the spec.
  const integration = await db.adIntegration.create({
    data: {
      userId: user.id,
      adNetworkId,
      integrationType: integrationType as any,
      siteIdentifier: siteIdentifier?.trim() || null,
      zoneIdentifier: zoneIdentifier?.trim() || null,
      zoneKey: zoneKey?.trim() || null,
      cdnUrl: cdnUrl?.trim() || null,
      formatOptions: formatOptions ? JSON.stringify(formatOptions) : null,
      scriptReference: scriptReference?.trim() || null,
      lifecycleState: 'DRAFT',
    },
    include: { adNetwork: true },
  })

  // Record moderation event for audit trail
  await db.moderationEvent.create({
    data: {
      integrationId: integration.id,
      toState: 'DRAFT',
      reason: 'Integration created by user',
      triggeredBy: user.id,
    },
  })

  return NextResponse.json({ integration })
}
