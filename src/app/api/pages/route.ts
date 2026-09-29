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

  // Auto-add platform + user ad placements based on AdSlotConfig defaults.
  //
  // The admin's AdSlotConfig table controls which (slot, source) pairs are
  // enabled by default on every new page. The placement engine + /api/p/[slug]
  // route will further filter these at render time based on:
  //   - whether a VERIFIED platform integration exists for that slot
  //   - whether the page owner has an APPROVED user integration for that slot
  //   - the visibility rule (ALWAYS / ONLY_WHEN_AD_AVAILABLE / NEVER)
  //
  // We seed one AdPlacement row per enabled (slot, source) pair from
  // AdSlotConfig. This means the admin can change default slots without
  // editing this code.
  const { getEnabledSlotsForSource } = await import('@/lib/slot-config')
  const platformSlots = await getEnabledSlotsForSource('PLATFORM_NETWORK')
  const userSlots = await getEnabledSlotsForSource('USER_INTEGRATION')

  const placementsData: Array<{
    pageId: string
    source: 'PLATFORM_NETWORK' | 'USER_INTEGRATION'
    slot: any
    priority: number
    enabled: boolean
  }> = [
    ...platformSlots.map(s => ({
      pageId: page.id,
      source: 'PLATFORM_NETWORK' as const,
      slot: s.slot,
      priority: s.priority,
      enabled: true,
    })),
    // User placements are seeded but won't render until the owner attaches
    // an APPROVED integration to the page. The placement-engine filters
    // out placements with no APPROVED integration (line 96).
    ...userSlots.map(s => ({
      pageId: page.id,
      source: 'USER_INTEGRATION' as const,
      slot: s.slot,
      priority: s.priority,
      enabled: true,
    })),
  ]

  if (placementsData.length > 0) {
    await db.adPlacement.createMany({ data: placementsData })
  }

  return NextResponse.json({ page })
}
