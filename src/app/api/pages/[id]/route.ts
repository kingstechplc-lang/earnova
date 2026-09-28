// /api/pages/[id] — GET (single page with blocks) / PATCH (update metadata) / DELETE
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const page = await db.specialPage.findFirst({
    where: { id, ownerId: user.id },
    include: { blocks: { orderBy: { order: 'asc' } }, campaign: true, placements: true },
  })
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ page })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const { title, description, pageType, campaignId, moderationState, publishedAt } = body as {
    title?: string; description?: string; pageType?: string; campaignId?: string | null; moderationState?: string; publishedAt?: string | null
  }

  const existing = await db.specialPage.findFirst({ where: { id, ownerId: user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const data: any = {}
  if (title !== undefined) data.title = title.trim()
  if (description !== undefined) data.description = description?.trim() || null
  if (pageType !== undefined) data.pageType = pageType
  if (campaignId !== undefined) data.campaignId = campaignId || null
  if (publishedAt !== undefined) data.publishedAt = publishedAt ? new Date(publishedAt) : null
  if (moderationState !== undefined && (user.role === 'ADMIN' || user.role === 'MODERATOR')) {
    data.moderationState = moderationState
  }

  const updated = await db.specialPage.update({ where: { id }, data })
  return NextResponse.json({ page: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const existing = await db.specialPage.findFirst({ where: { id, ownerId: user.id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.specialPage.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
