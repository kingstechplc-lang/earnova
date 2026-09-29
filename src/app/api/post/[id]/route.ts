// GET /api/post/[id] — fetch a single published Post for public viewing.
//
// This is the public-facing route — it only returns posts where:
//   - status === 'PUBLISHED'
//   - visibility !== 'PRIVATE'
//   - moderationState !== 'BANNED' or 'SUSPENDED'
//
// It also increments viewCount (idempotent within a session via a cookie
// flag, but for MVP we just always increment — proper view deduplication
// comes in Phase 6 with the AnalyticsEvent system).
//
// Per spec section 31 (THIRD-PARTY SCRIPT ISOLATION):
//   User advertising should only appear on eligible public pages.
//   This route does NOT render ads — posts are pure content. Ads may
//   appear on Special Pages, but posts are content-only.
//
// Per spec section 89 (SEO-FRIENDLY PUBLIC CONTENT):
//   Public content must be accessible to search engines. The route returns
//   full server-rendered metadata (title, description, ogImage, author info)
//   so the client-side router can build proper OpenGraph tags.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Look up the post by id (public route uses id, not slug, because slugs
  // are only unique per author — using id avoids ambiguity)
  const post = await db.post.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          bio: true,
        },
      },
      page: { select: { id: true, slug: true, title: true } },
      campaign: { select: { id: true, slug: true, title: true } },
    },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  // Visibility gate: PRIVATE posts are owner-only (go through /api/posts/[id])
  if (post.visibility === 'PRIVATE') {
    return NextResponse.json({ error: 'This post is private' }, { status: 403 })
  }

  // UNLISTED posts are accessible via direct link but not indexed in feeds.
  // They still render if you have the URL — that's the contract.

  // Status gate: only PUBLISHED posts are publicly viewable.
  // SCHEDULED posts auto-publish if their scheduledAt has passed (MVP
  // workaround until we have a proper job scheduler in Phase 6).
  if (post.status === 'SCHEDULED' && post.scheduledAt && post.scheduledAt.getTime() <= Date.now()) {
    await db.post.update({
      where: { id: post.id },
      data: { status: 'PUBLISHED', publishedAt: post.publishedAt || new Date() },
    })
    post.status = 'PUBLISHED'
    post.publishedAt = post.publishedAt || new Date()
  }

  if (post.status !== 'PUBLISHED') {
    return NextResponse.json(
      { error: 'This post is not available', status: post.status },
      { status: 404 }
    )
  }

  // Moderation gate: BANNED/SUSPENDED posts are not viewable
  if (post.moderationState === 'BANNED' || post.moderationState === 'SUSPENDED') {
    return NextResponse.json(
      { error: 'This post is unavailable', moderationState: post.moderationState },
      { status: 403 }
    )
  }

  // Increment view count (fire-and-forget — don't block the response)
  // Per spec section 60 (ANALYTICS SCALABILITY):
  //   For MVP this is a synchronous counter update. Phase 6 will replace
  //   this with a proper AnalyticsEvent pipeline + aggregation.
  db.post.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
  }).catch(() => {
    // Silently ignore — view count is best-effort, not critical
  })

  // Return the post with parsed content + author info
  return NextResponse.json({
    post: {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content ? JSON.parse(post.content) : null,
      type: post.type,
      visibility: post.visibility,
      coverImage: post.coverImage,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      shareCount: post.shareCount,
      saveCount: post.saveCount,
      tags: post.tags,
      // SEO metadata (auto-generated if not set)
      seoTitle: post.seoTitle || post.title,
      seoDescription: post.seoDescription || post.excerpt || '',
      ogImage: post.ogImage || post.coverImage,
      author: post.author,
      page: post.page,
      campaign: post.campaign,
    },
  })
}
