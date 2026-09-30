// GET /api/saves — list posts the current user has saved (bookmarked)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const cursor = url.searchParams.get('cursor')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50)

  const saves = await db.save.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      post: {
        select: {
          id: true, slug: true, title: true, excerpt: true, type: true,
          coverImage: true, publishedAt: true, viewCount: true, likeCount: true,
          commentCount: true, tags: true,
          author: { select: { id: true, name: true, username: true, image: true } },
        },
      },
    },
  })

  const hasMore = saves.length > limit
  const items = hasMore ? saves.slice(0, -1) : saves
  return NextResponse.json({
    posts: items.map(s => s.post),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  })
}
