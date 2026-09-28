// GET /api/pages — list current user's pages
// POST /api/pages — create new Special Page
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

function slugify(s: string): string {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const pages = await db.specialPage.findMany({
    where: { ownerId: user.id },
    include: { campaign: true, _count: { select: { blocks: true } } },
    orderBy: { updatedAt: 'desc' },
  })
  return NextResponse.json({ pages })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, description, pageType, campaignId } = body as {
    title: string; description?: string; pageType?: string; campaignId?: string
  }
  if (!title || title.trim().length < 3) {
    return NextResponse.json({ error: 'Title must be at least 3 characters' }, { status: 400 })
  }

  let slug = slugify(title)
  // Ensure uniqueness
  let suffix = 0
  while (await db.specialPage.findUnique({ where: { slug } })) {
    suffix += 1
    slug = `${slugify(title)}-${suffix}`
  }

  const page = await db.specialPage.create({
    data: {
      slug,
      title: title.trim(),
      description: description?.trim() || null,
      pageType: (pageType as any) || 'PERSONAL',
      ownerId: user.id,
      campaignId: campaignId || null,
      moderationState: 'PENDING',
    },
  })

  // Auto-add platform ad placements (Layer 2) on every new page
  await db.adPlacement.createMany({
    data: [
      { pageId: page.id, source: 'PLATFORM_NETWORK', slot: 'HEADER', priority: 10, enabled: true },
      { pageId: page.id, source: 'PLATFORM_NETWORK', slot: 'BEFORE_FOOTER', priority: 90, enabled: true },
    ],
  })

  return NextResponse.json({ page })
}
