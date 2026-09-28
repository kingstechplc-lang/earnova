// POST /api/pages/[id]/publish — publish (or unpublish) a Special Page
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { recomputeTrustScoreForPage } from '@/lib/trust-score'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const page = await db.specialPage.findFirst({ where: { id, ownerId: user.id } })
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { publish } = body as { publish?: boolean }

  // On first publish, auto-compute Trust Score (shadow mode)
  if (publish && !page.publishedAt) {
    await recomputeTrustScoreForPage(page.id)
  }

  const updated = await db.specialPage.update({
    where: { id },
    data: { publishedAt: publish ? new Date() : null },
  })
  return NextResponse.json({ page: updated })
}
