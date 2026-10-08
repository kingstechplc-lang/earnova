// GET /api/admin/reports — list all reports (admin/moderator only)
//
// Supports cursor pagination + status filter. Returns reports sorted by
// createdAt DESC. Includes the reporter's basic info (id, name, username,
// email, image) so the admin queue can attribute reports without a second
// round-trip.
//
// Query params:
//   ?status=PENDING|UNDER_REVIEW|RESOLVED|DISMISSED|ESCALATED  (optional)
//   ?cursor=<reportId>                                          (optional)
//   ?limit=<1..50>                                              (default 20)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ReportStatus } from '@prisma/client'

const VALID_STATUSES: ReportStatus[] = ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'ESCALATED']

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status')
  const cursor = url.searchParams.get('cursor')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50)

  const where: any = {}
  if (statusFilter && VALID_STATUSES.includes(statusFilter as ReportStatus)) {
    where.status = statusFilter as ReportStatus
  }

  const reports = await db.report.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      reporter: {
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          image: true,
        },
      },
      resolver: {
        select: { id: true, name: true, username: true, email: true },
      },
    },
  })

  const hasMore = reports.length > limit
  const items = hasMore ? reports.slice(0, -1) : reports
  return NextResponse.json({
    reports: items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  })
}
