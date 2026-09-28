// /api/admin/pending
// GET — list integrations pending review (admin/mod only)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'ADMIN' && user.role !== 'MODERATOR')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const integrations = await db.adIntegration.findMany({
    where: { lifecycleState: 'PENDING_REVIEW' },
    include: { adNetwork: true, user: { select: { id: true, email: true, name: true, createdAt: true } } },
    orderBy: { updatedAt: 'asc' },
  })
  return NextResponse.json({ integrations })
}
