// GET    /api/studio/projects/[id] — get one studio project (owner only)
// PATCH  /api/studio/projects/[id] — update project data/title
// DELETE /api/studio/projects/[id] — delete a project
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const project = await db.studioProject.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (project.ownerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({
    project: { ...project, data: project.data ? JSON.parse(project.data) : {} },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const project = await db.studioProject.findUnique({ where: { id }, select: { id: true, ownerId: true } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (project.ownerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { title, data, isPublished, aiGenerated, aiPrompt, pageId } = body as {
    title?: string
    data?: Record<string, any>
    isPublished?: boolean
    aiGenerated?: boolean
    aiPrompt?: string
    pageId?: string | null
  }

  const updateData: any = {}
  if (title !== undefined) updateData.title = title.trim()
  if (data !== undefined) updateData.data = JSON.stringify(data)
  if (isPublished !== undefined) updateData.isPublished = isPublished
  if (aiGenerated !== undefined) updateData.aiGenerated = aiGenerated
  if (aiPrompt !== undefined) updateData.aiPrompt = aiPrompt
  if (pageId !== undefined) updateData.pageId = pageId

  const updated = await db.studioProject.update({ where: { id }, data: updateData })

  return NextResponse.json({
    project: { ...updated, data: updated.data ? JSON.parse(updated.data) : {} },
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const project = await db.studioProject.findUnique({ where: { id }, select: { id: true, ownerId: true } })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  if (project.ownerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.studioProject.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
