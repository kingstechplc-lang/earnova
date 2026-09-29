// POST /api/posts/[id]/schedule — DRAFT → SCHEDULED
//
// Sets status=SCHEDULED + scheduledAt=<datetime>.
// A background job (to be added in Phase 6 — Analytics) will later pick up
// SCHEDULED posts whose scheduledAt has passed and flip them to PUBLISHED.
//
// For MVP, we also support a "publish now if scheduled time has passed"
// behavior on read — the /api/post/[slug] public route checks if a SCHEDULED
// post's scheduledAt is in the past and auto-publishes it on first read.
// This is a pragmatic workaround until we have a proper job scheduler.
//
// Body: { scheduledAt: string (ISO 8601) }
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(
  req: NextRequest,
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

  const body = await req.json()
  const { scheduledAt } = body as { scheduledAt?: string }

  if (!scheduledAt) {
    return NextResponse.json({ error: 'scheduledAt is required (ISO 8601 datetime)' }, { status: 400 })
  }

  const scheduledDate = new Date(scheduledAt)
  if (isNaN(scheduledDate.getTime())) {
    return NextResponse.json({ error: 'Invalid scheduledAt datetime' }, { status: 400 })
  }

  // Don't allow scheduling in the past
  if (scheduledDate.getTime() < Date.now()) {
    return NextResponse.json(
      { error: 'scheduledAt must be in the future. Use the publish endpoint to publish immediately.' },
      { status: 400 }
    )
  }

  // Don't allow scheduling REMOVED or ARCHIVED posts
  if (post.status === 'REMOVED' || post.status === 'ARCHIVED') {
    return NextResponse.json(
      { error: `Cannot schedule a post with status=${post.status}` },
      { status: 400 }
    )
  }

  // Email verification gate (same as publish)
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: 'Please verify your email before scheduling posts.' },
      { status: 403 }
    )
  }

  const updated = await db.post.update({
    where: { id },
    data: {
      status: 'SCHEDULED',
      scheduledAt: scheduledDate,
    },
  })

  return NextResponse.json({ post: updated })
}
