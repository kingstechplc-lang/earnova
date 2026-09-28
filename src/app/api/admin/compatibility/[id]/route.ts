// /api/admin/compatibility/[id] — update / delete a compatibility rule
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const body = await req.json()
  const { verdict, maxSimultaneousUnits, minVerticalSeparationPx, requiredContentClassBetween, notes } = body as {
    verdict?: 'ALLOWED' | 'ALLOWED_WITH_LIMITS' | 'FORBIDDEN'
    maxSimultaneousUnits?: number | null
    minVerticalSeparationPx?: number | null
    requiredContentClassBetween?: string | null
    notes?: string | null
  }
  const existing = await db.adNetworkCompatibility.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: any = {}
  if (verdict !== undefined) data.verdict = verdict
  if (maxSimultaneousUnits !== undefined) data.maxSimultaneousUnits = maxSimultaneousUnits
  if (minVerticalSeparationPx !== undefined) data.minVerticalSeparationPx = minVerticalSeparationPx
  if (requiredContentClassBetween !== undefined) data.requiredContentClassBetween = requiredContentClassBetween
  if (notes !== undefined) data.notes = notes

  const updated = await db.adNetworkCompatibility.update({ where: { id }, data, include: { networkA: true, networkB: true } })
  return NextResponse.json({ rule: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const existing = await db.adNetworkCompatibility.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.adNetworkCompatibility.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
