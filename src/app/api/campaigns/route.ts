// GET /api/campaigns — list active campaigns
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const now = new Date()
  const campaigns = await db.campaign.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    include: { _count: { select: { pages: true } } },
    orderBy: { featured: 'desc' },
  })
  return NextResponse.json({ campaigns })
}
