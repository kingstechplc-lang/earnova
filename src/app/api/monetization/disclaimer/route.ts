// /api/monetization/disclaimer
// GET — fetch latest disclaimer text + user's acknowledgment status
// POST — record user's acknowledgment of the earnings disclaimer
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

const DISCLAIMER_VERSION = '2026-09-28-v1'
const DISCLAIMER_TEXT = `This platform does not pay you. Earnings from advertising shown on your Special Page are paid by your chosen ad network (Adsterra or Monetag), not by this platform. The platform cannot guarantee any specific level of earnings, or any earnings at all. Your earnings depend on factors entirely outside the platform's control, including: (a) your ad-network account approval, (b) your visitors' traffic quality, (c) your content's quality and relevance, (d) the ad network's payout rates, and (e) the ad network's continued willingness to serve ads to your visitors.

Any statistics displayed on this platform that originate from an ad network are sourced from that network and are not the platform's own measurements of earnings. The platform does not estimate earnings. For verified earnings data, always consult your ad-network dashboard directly.

By activating an ad integration, you acknowledge that you are solely responsible for your ad-network relationship, your visitors' traffic quality, and your compliance with the ad network's terms of service. The platform reserves the right to disable any ad integration at any time if it detects traffic, content, or behavior that may violate platform or ad-network policies.`

export async function GET() {
  const user = await getCurrentUser()
  let ack: { id: string; userId: string; disclaimerVersion: string; acknowledgedAt: Date } | null = null
  if (user) {
    ack = await db.earningsDisclaimerAck.findFirst({
      where: { userId: user.id },
      orderBy: { acknowledgedAt: 'desc' },
    })
  }
  return NextResponse.json({
    version: DISCLAIMER_VERSION,
    text: DISCLAIMER_TEXT,
    acknowledged: !!ack && ack.disclaimerVersion === DISCLAIMER_VERSION,
    acknowledgedAt: ack?.acknowledgedAt ?? null,
  })
}

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const existing = await db.earningsDisclaimerAck.findFirst({
    where: { userId: user.id, disclaimerVersion: DISCLAIMER_VERSION },
  })
  if (existing) {
    return NextResponse.json({ ok: true, alreadyAcknowledged: true })
  }
  await db.earningsDisclaimerAck.create({
    data: { userId: user.id, disclaimerVersion: DISCLAIMER_VERSION },
  })
  return NextResponse.json({ ok: true })
}
