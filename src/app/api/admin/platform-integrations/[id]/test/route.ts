// /api/admin/platform-integrations/[id]/test
// POST — simulate (forced recompile) a test request to the ad network (MVP mock — in production this would
// actually fetch the ad tag and verify it returns a creative)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const existing = await db.platformAdNetworkIntegration.findUnique({
    where: { id },
    include: { adNetwork: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Simulate network latency (200-800ms)
  const latencyMs = 200 + Math.floor(Math.random() * 600)
  await new Promise(resolve => setTimeout(resolve, latencyMs))

  // Mock test result — 85% pass rate, with realistic failure modes for the 15%
  const rand = Math.random()
  let result: { ok: boolean; status?: number; message: string; latencyMs: number; details?: string }

  if (rand < 0.85) {
    // Pass — simulate a successful ad-network response
    result = {
      ok: true,
      status: 200,
      message: `${existing.adNetwork.displayName} responded successfully for zone ${existing.zoneIdentifier}.`,
      latencyMs,
      details: `Returned a creative of type ${existing.integrationType}. Tag reference ${existing.scriptReference} is valid.`,
    }
  } else if (rand < 0.92) {
    // Fail — zone not found at network
    result = {
      ok: false,
      status: 404,
      message: `Zone ${existing.zoneIdentifier} not found at ${existing.adNetwork.displayName}. Verify the zone ID in your publisher dashboard.`,
      latencyMs,
      details: 'The ad network returned 404 — the zone identifier may be incorrect, or the zone may have been deleted.',
    }
  } else {
    // Fail — site not verified at network
    result = {
      ok: false,
      status: 403,
      message: `${existing.adNetwork.displayName} reports the platform domain is not verified. Complete site verification in your publisher dashboard first.`,
      latencyMs,
      details: 'The ad network returned 403 — site ownership has not been verified (DNS TXT record or meta tag required).',
    }
  }

  // Move to VERIFYING state if currently UNVERIFIED and test passed
  const newState = existing.verificationState === 'UNVERIFIED' && result.ok
    ? 'VERIFYING'
    : existing.verificationState

  await db.platformAdNetworkIntegration.update({
    where: { id },
    data: {
      lastTestedAt: new Date(),
      lastTestResult: JSON.stringify(result),
      verificationState: newState as any,
    },
  })

  return NextResponse.json({ result, verificationState: newState })
}
