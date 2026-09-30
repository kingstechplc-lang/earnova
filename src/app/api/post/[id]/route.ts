// GET /api/post/[id] — fetch a single published Post by ID.
//
// This is the legacy route — kept for backward compatibility (notification
// bell uses entityId which is the postId). Public-facing shareable URLs now
// use /api/public/post/[username]/[slug] instead.
//
// The logic is shared via src/lib/fetch-public-post.ts.
import { NextRequest } from 'next/server'
import { fetchPublicPostById } from '@/lib/fetch-public-post'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return fetchPublicPostById(id)
}
