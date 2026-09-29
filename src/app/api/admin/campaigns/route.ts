// /api/admin/campaigns — list all campaigns (including inactive) + create new
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const campaigns = await db.campaign.findMany({
    include: { _count: { select: { pages: true } } },
    orderBy: [{ featured: 'desc' }, { startsAt: 'desc' }],
  })
  return NextResponse.json({ campaigns })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const body = await req.json()
  const { slug, title, description, startsAt, endsAt, isActive, featured } = body as {
    slug: string; title: string; description?: string
    startsAt: string; endsAt: string; isActive?: boolean; featured?: boolean
  }
  if (!slug || !title || !startsAt || !endsAt) {
    return NextResponse.json({ error: 'slug, title, startsAt, endsAt required' }, { status: 400 })
  }
  if (new Date(startsAt) >= new Date(endsAt)) {
    return NextResponse.json({ error: 'startsAt must be before endsAt' }, { status: 400 })
  }
  const existing = await db.campaign.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
  }
  const campaign = await db.campaign.create({
    data: {
      slug,
      title,
      description: description || null,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      isActive: isActive ?? true,
      featured: featured ?? false,
    },
  })
  return NextResponse.json({ campaign })
}
