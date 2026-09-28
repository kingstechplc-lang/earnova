// /api/page-builder/[pageId]/blocks — GET (list), POST (create new block)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const page = await db.specialPage.findFirst({ where: { id: pageId, ownerId: user.id } })
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const blocks = await db.contentBlock.findMany({ where: { pageId }, orderBy: { order: 'asc' } })
  return NextResponse.json({ blocks })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const page = await db.specialPage.findFirst({ where: { id: pageId, ownerId: user.id } })
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { type, data } = body as { type: string; data: any }
  if (!type) return NextResponse.json({ error: 'Block type required' }, { status: 400 })

  const existingCount = await db.contentBlock.count({ where: { pageId } })
  const block = await db.contentBlock.create({
    data: {
      pageId,
      type: type as any,
      data: JSON.stringify(data ?? {}),
      order: existingCount,
    },
  })
  return NextResponse.json({ block })
}

// PUT — bulk reorder blocks (ids in new order)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const page = await db.specialPage.findFirst({ where: { id: pageId, ownerId: user.id } })
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { orderedIds } = body as { orderedIds: string[] }
  if (!Array.isArray(orderedIds)) {
    return NextResponse.json({ error: 'orderedIds must be an array' }, { status: 400 })
  }
  await db.$transaction(
    orderedIds.map((id, idx) =>
      db.contentBlock.update({ where: { id, pageId }, data: { order: idx } })
    )
  )
  return NextResponse.json({ ok: true })
}
