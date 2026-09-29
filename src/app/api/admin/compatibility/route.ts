// /api/admin/compatibility — list all compatibility rules + create new
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const rules = await db.adNetworkCompatibility.findMany({
    include: { networkA: true, networkB: true },
    orderBy: { networkAId: 'asc' },
  })
  return NextResponse.json({
    rules: rules.map(r => ({
      id: r.id,
      networkA: { id: r.networkA.id, code: r.networkA.code, displayName: r.networkA.displayName },
      networkB: { id: r.networkB.id, code: r.networkB.code, displayName: r.networkB.displayName },
      verdict: r.verdict,
      maxSimultaneousUnits: r.maxSimultaneousUnits,
      minVerticalSeparationPx: r.minVerticalSeparationPx,
      requiredContentClassBetween: r.requiredContentClassBetween,
      notes: r.notes,
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const body = await req.json()
  const { networkAId, networkBId, verdict, maxSimultaneousUnits, minVerticalSeparationPx, requiredContentClassBetween, notes } = body as {
    networkAId: string; networkBId: string; verdict: 'ALLOWED' | 'ALLOWED_WITH_LIMITS' | 'FORBIDDEN'
    maxSimultaneousUnits?: number; minVerticalSeparationPx?: number
    requiredContentClassBetween?: string; notes?: string
  }
  if (!networkAId || !networkBId || !verdict) {
    return NextResponse.json({ error: 'networkAId, networkBId, verdict required' }, { status: 400 })
  }
  if (networkAId === networkBId) {
    return NextResponse.json({ error: 'Cannot create a compatibility rule between a network and itself — use ALLOWED_WITH_LIMITS to cap density.' }, { status: 400 })
  }
  const existing = await db.adNetworkCompatibility.findUnique({
    where: { networkAId_networkBId: { networkAId, networkBId } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Rule already exists. Use PATCH to update.' }, { status: 409 })
  }
  const rule = await db.adNetworkCompatibility.create({
    data: {
      networkAId, networkBId, verdict,
      maxSimultaneousUnits: maxSimultaneousUnits ?? null,
      minVerticalSeparationPx: minVerticalSeparationPx ?? null,
      requiredContentClassBetween: requiredContentClassBetween ?? null,
      notes: notes ?? null,
    },
    include: { networkA: true, networkB: true },
  })
  return NextResponse.json({ rule })
}
