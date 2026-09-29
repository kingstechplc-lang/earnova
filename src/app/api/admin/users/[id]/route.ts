// /api/admin/users/[id] — get one user's details + their pages + integrations
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const target = await db.user.findUnique({
    where: { id },
    select: {
      id: true, email: true, name: true, role: true, bio: true, locale: true, createdAt: true,
      pages: {
        select: {
          id: true, slug: true, title: true, pageType: true,
          moderationState: true, publishedAt: true, createdAt: true,
          _count: { select: { blocks: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      adIntegrations: {
        where: { lifecycleState: { not: 'DELETED' } },
        include: { adNetwork: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ user: target })
}

// Update user role / profile
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const body = await req.json()
  const { role, name, bio, locale } = body as {
    role?: 'USER' | 'MODERATOR' | 'ADMIN'
    name?: string | null
    bio?: string | null
    locale?: string
  }
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Prevent admin from demoting themselves
  if (target.id === user.id && role && role !== 'ADMIN') {
    return NextResponse.json({ error: 'You cannot demote yourself.' }, { status: 400 })
  }

  const data: any = {}
  if (role !== undefined) data.role = role
  if (name !== undefined) data.name = name
  if (bio !== undefined) data.bio = bio
  if (locale !== undefined) data.locale = locale

  const updated = await db.user.update({ where: { id }, data, select: { id: true, email: true, name: true, role: true, bio: true, locale: true } })
  return NextResponse.json({ user: updated })
}
