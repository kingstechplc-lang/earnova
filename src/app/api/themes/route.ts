// GET /api/themes — list all available themes
// POST /api/themes — create a new theme (admin only, future)
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const themes = await db.theme.findMany({
    orderBy: [{ isPremium: 'asc' }, { category: 'asc' }],
  })
  return NextResponse.json({
    themes: themes.map(t => ({
      ...t,
      cssVars: t.cssVars ? JSON.parse(t.cssVars) : {},
    })),
  })
}
