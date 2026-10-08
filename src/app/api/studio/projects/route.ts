// GET  /api/studio/projects — list current user's studio projects
// POST /api/studio/projects — create a new studio project
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import type { StudioProjectType } from '@prisma/client'

const VALID_TYPES: StudioProjectType[] = [
  'GREETING_CARD', 'SOCIAL_CARD', 'BIRTHDAY_WISH', 'CHRISTMAS_WISH',
  'QUOTE', 'POSTER', 'ANNOUNCEMENT', 'QUIZ', 'POLL', 'COUNTDOWN',
  'INVITATION', 'EVENT_PAGE',
]

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const type = url.searchParams.get('type') as StudioProjectType | null

  const where: any = { ownerId: user.id }
  if (type && VALID_TYPES.includes(type)) where.type = type

  const projects = await db.studioProject.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({
    projects: projects.map(p => ({
      ...p,
      data: p.data ? JSON.parse(p.data) : {},
    })),
  })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, title, data, aiGenerated, aiPrompt, pageId } = body as {
    type: string
    title: string
    data?: Record<string, any>
    aiGenerated?: boolean
    aiPrompt?: string
    pageId?: string
  }

  if (!type || !VALID_TYPES.includes(type as StudioProjectType)) {
    return NextResponse.json({ error: 'Invalid project type' }, { status: 400 })
  }
  if (!title || title.trim().length < 1) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  // If pageId provided, verify ownership
  if (pageId) {
    const page = await db.specialPage.findUnique({ where: { id: pageId }, select: { id: true, ownerId: true } })
    if (!page || page.ownerId !== user.id) {
      return NextResponse.json({ error: 'Page not found or not owned' }, { status: 403 })
    }
  }

  const project = await db.studioProject.create({
    data: {
      ownerId: user.id,
      type: type as StudioProjectType,
      title: title.trim(),
      data: data ? JSON.stringify(data) : '{}',
      aiGenerated: aiGenerated || false,
      aiPrompt: aiPrompt || null,
      pageId: pageId || null,
    },
  })

  return NextResponse.json({
    project: { ...project, data: project.data ? JSON.parse(project.data) : {} },
  })
}
