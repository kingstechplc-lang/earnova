// /api/admin/pages — list all pages (with filters) for moderation
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const state = searchParams.get('state') || ''
  const search = searchParams.get('search') || ''

  const where: any = {}
  if (state && state !== 'ALL') where.moderationState = state
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { slug: { contains: search } },
    ]
  }

  const pages = await db.specialPage.findMany({
    where,
    select: {
      id: true, slug: true, title: true, pageType: true,
      moderationState: true, publishedAt: true, createdAt: true, updatedAt: true,
      owner: { select: { id: true, email: true, name: true } },
      campaign: { select: { id: true, title: true } },
      _count: { select: { blocks: true, placements: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({ pages })
}
