// /api/page-builder/[pageId]/blocks/[blockId] — PATCH (update) / DELETE
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ pageId: string; blockId: string }> }) {
  const { pageId, blockId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const page = await db.specialPage.findFirst({ where: { id: pageId, ownerId: user.id } })
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const body = await req.json()
  const { data, type } = body as { data?: any; type?: string }
  const update: any = {}
  if (data !== undefined) update.data = JSON.stringify(data)
  if (type !== undefined) update.type = type
  const block = await db.contentBlock.update({ where: { id: blockId, pageId }, data: update })
  return NextResponse.json({ block })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ pageId: string; blockId: string }> }) {
  const { pageId, blockId } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const page = await db.specialPage.findFirst({ where: { id: pageId, ownerId: user.id } })
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await db.contentBlock.delete({ where: { id: blockId, pageId } })
  return NextResponse.json({ ok: true })
}
