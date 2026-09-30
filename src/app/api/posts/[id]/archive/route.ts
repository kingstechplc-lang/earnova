// POST /api/posts/[id]/archive — PUBLISHED → ARCHIVED
//
// Archiving takes a post off the public feed without deleting it.
// The post is still accessible via direct URL (depending on visibility)
// but doesn't appear in feeds/search. The author can re-publish later.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const post = await db.post.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  if (post.authorId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Only published posts can be archived
  if (post.status !== 'PUBLISHED') {
    return NextResponse.json(
      { error: `Cannot archive a post with status=${post.status}. Only PUBLISHED posts can be archived.` },
      { status: 400 }
    )
  }

  const updated = await db.post.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  })

  return NextResponse.json({ post: updated })
}
