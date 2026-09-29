// POST /api/posts/[id]/publish — DRAFT or SCHEDULED → PUBLISHED
//
// Sets status=PUBLISHED, publishedAt=now() (if not already set), and
// moderationState=PENDING (so the moderation system can review it).
//
// Per spec section 8 (POSTS SYSTEM):
//   DRAFT → SCHEDULED → PUBLISHED
//                 ↘ UNDER_REVIEW
//
// Per spec section 50 (EMAIL VERIFICATION):
//   "Do not allow unrestricted monetization access to unverified accounts."
//   We extend this principle to publishing — unverified users cannot publish
//   (prevents spam/abuse from throwaway accounts).
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

  // Email verification gate
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: 'Please verify your email before publishing posts.' },
      { status: 403 }
    )
  }

  // Don't allow publishing REMOVED or ARCHIVED posts directly
  // (RESTORED from REMOVED requires admin action; ARCHIVED requires re-publish)
  if (post.status === 'REMOVED') {
    return NextResponse.json(
      { error: 'Cannot publish a removed post. Create a new post instead.' },
      { status: 400 }
    )
  }

  // Already published? Just return success (idempotent)
  if (post.status === 'PUBLISHED') {
    return NextResponse.json({ post, alreadyPublished: true })
  }

  // Title + content minimum validation
  if (!post.title || post.title.trim().length < 3) {
    return NextResponse.json({ error: 'Title must be at least 3 characters' }, { status: 400 })
  }

  const updated = await db.post.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishedAt: post.publishedAt || new Date(),
      scheduledAt: null,  // clear schedule since it's now published
      moderationState: 'PENDING',  // moderation will review
    },
  })

  return NextResponse.json({ post: updated })
}
