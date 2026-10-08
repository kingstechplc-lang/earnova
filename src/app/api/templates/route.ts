// GET /api/templates — list all available page templates
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const templates = await db.pageTemplate.findMany({
    orderBy: [{ isPremium: 'asc' }, { category: 'asc' }],
  })
  return NextResponse.json({
    templates: templates.map(t => ({
      ...t,
      blocks: t.blocks ? JSON.parse(t.blocks) : [],
    })),
  })
}
