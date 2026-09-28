// GET /api/analytics/[pageId] — fetch analytics for owner
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { recomputeTrustScoreForPage } from '@/lib/trust-score'

export async function GET(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const page = await db.specialPage.findFirst({ where: { id: pageId, ownerId: user.id } })
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [analytics, latestScore] = await Promise.all([
    db.pageAnalytics.findUnique({ where: { pageId } }),
    db.trustScore.findFirst({ where: { pageId }, orderBy: { computedAt: 'desc' } }),
  ])

  return NextResponse.json({
    analytics,
    trustScore: latestScore,
  })
}

// POST — manually trigger trust score recomputation (admin or page owner)
export async function POST(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const page = await db.specialPage.findFirst({ where: { id: pageId, ownerId: user.id } })
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const result = await recomputeTrustScoreForPage(pageId)
  return NextResponse.json({ trustScore: result })
}
