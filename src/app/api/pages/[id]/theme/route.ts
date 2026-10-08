// PATCH /api/pages/[id]/theme — apply/remove a theme on a page
//
// Body: { themeId: string | null }  (null = remove theme)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const page = await db.specialPage.findUnique({ where: { id }, select: { id: true, ownerId: true } })
  if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 })
  if (page.ownerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { themeId } = body as { themeId: string | null }

  // If themeId is provided, verify it exists
  if (themeId) {
    const theme = await db.theme.findUnique({ where: { id: themeId } })
    if (!theme) return NextResponse.json({ error: 'Theme not found' }, { status: 404 })
  }

  const updated = await db.specialPage.update({
    where: { id },
    data: { themeId: themeId || null },
    select: { id: true, themeId: true, theme: true },
  })

  return NextResponse.json({ page: updated })
}
