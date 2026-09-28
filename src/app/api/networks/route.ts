// GET /api/networks — list active ad networks (for the monetization onboarding UI)
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const networks = await db.adNetwork.findMany({
    where: { status: 'ACTIVE', code: { not: 'platform' } },
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
    })),
  })
}
