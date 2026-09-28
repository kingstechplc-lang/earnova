// /api/admin/users — list users (with role/pages count) + optional search
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const role = searchParams.get('role') || ''

  const where: any = {}
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { name: { contains: search } },
    ]
  }
  if (role && role !== 'ALL') where.role = role

  const users = await db.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      bio: true,
      locale: true,
      createdAt: true,
      _count: { select: { pages: true, adIntegrations: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({ users })
}
