// /api/admin/campaigns/[id] — update / delete a campaign
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const body = await req.json()
  const { slug, title, description, startsAt, endsAt, isActive, featured } = body as {
    slug?: string; title?: string; description?: string | null
    startsAt?: string; endsAt?: string; isActive?: boolean; featured?: boolean
  }
  const existing = await db.campaign.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If slug is changing, check uniqueness
  if (slug && slug !== existing.slug) {
    const conflict = await db.campaign.findUnique({ where: { slug } })
    if (conflict) return NextResponse.json({ error: 'Slug already in use' }, { status: 409 })
  }
  if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
    return NextResponse.json({ error: 'startsAt must be before endsAt' }, { status: 400 })
  }

  const data: any = {}
  if (slug !== undefined) data.slug = slug
  if (title !== undefined) data.title = title
  if (description !== undefined) data.description = description || null
  if (startsAt !== undefined) data.startsAt = new Date(startsAt)
  if (endsAt !== undefined) data.endsAt = new Date(endsAt)
  if (isActive !== undefined) data.isActive = isActive
  if (featured !== undefined) data.featured = featured

  const updated = await db.campaign.update({ where: { id }, data })
  return NextResponse.json({ campaign: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const existing = await db.campaign.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check if any pages use this campaign
  const pagesCount = await db.specialPage.count({ where: { campaignId: id } })
  if (pagesCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${pagesCount} page(s) are still attached to this campaign. Detach them first.` },
      { status: 409 }
    )
  }
  await db.campaign.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
