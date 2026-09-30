// GET /api/followers/[username] — list a user's followers (paginated)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params
  const target = await db.user.findUnique({
    where: { usernameLower: username.toLowerCase() },
    select: { id: true },
  })
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const url = new URL(req.url)
  const cursor = url.searchParams.get('cursor')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50)

  const follows = await db.follow.findMany({
    where: { followeeId: target.id },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      follower: {
        select: {
          id: true, name: true, username: true, image: true, bio: true,
        },
      },
    },
  })

  const hasMore = follows.length > limit
  const items = hasMore ? follows.slice(0, -1) : follows
  return NextResponse.json({
    followers: items.map(f => f.follower),
    nextCursor: hasMore ? items[items.length - 1].id : null,
  })
}
