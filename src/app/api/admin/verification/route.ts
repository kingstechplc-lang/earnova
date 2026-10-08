// GET /api/admin/verification — list pending verification requests (admin only)
//
// Returns PENDING requests ordered by createdAt ASC (oldest first — fair queue
// ordering). Includes the submitting user's basic profile info.
//
// Query params:
//   ?status=PENDING|APPROVED|REJECTED|EXPIRED  (default: PENDING)
//   ?cursor=<id>                                (optional)
//   ?limit=<1..50>                              (default: 20)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { VerificationStatus } from '@prisma/client'

const VALID_STATUSES: VerificationStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED']

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const statusParam = url.searchParams.get('status') || 'PENDING'
  const cursor = url.searchParams.get('cursor')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50)

  const where: any = {}
  if (VALID_STATUSES.includes(statusParam as VerificationStatus)) {
    where.status = statusParam as VerificationStatus
  }

  const requests = await db.verificationRequest.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: {
        select: {
          id: true, email: true, name: true, username: true, image: true, bio: true, createdAt: true,
        },
      },
      reviewer: {
        select: { id: true, name: true, username: true, email: true },
      },
    },
  })

  const hasMore = requests.length > limit
  const items = hasMore ? requests.slice(0, -1) : requests
  return NextResponse.json({
    requests: items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  })
}
