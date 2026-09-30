// GET /api/public/post/[username]/[slug] — fetch a published Post by author username + post slug.
//
// This is the PUBLIC-facing shareable URL — uses the author's @username + the
// post's slug (unique per author) instead of the raw cuid postId.
//
// Example: /api/public/post/kingsley/welcome-to-earnova
//
// This makes shared links trustworthy + memorable, e.g.:
//   https://earnova.example/#/post/kingsley/welcome-to-earnova
//
// Instead of the old ugly URL:
//   https://earnova.example/#/post/cmun64lna0001r2ar694jmpdy
//
// NOTE: This route is at /api/public/post/[username]/[slug] (under /api/public/)
// to avoid Next.js routing conflicts with /api/posts/[id] (owner CRUD).
// The client-side hash URL is still #/post/[username]/[slug] (singular "post")
// for cleaner public-facing URLs.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchPublicPostById } from '@/lib/fetch-public-post'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string; slug: string }> }
) {
  const { username, slug } = await params

  // Look up the post by author username (case-insensitive) + slug
  const post = await db.post.findFirst({
    where: {
      slug,
      author: { usernameLower: decodeURIComponent(username).toLowerCase() },
    },
    select: { id: true },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  // Delegate to the shared helper
  return fetchPublicPostById(post.id)
}
