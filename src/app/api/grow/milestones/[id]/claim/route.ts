// POST /api/grow/milestones/[id]/claim — claim a milestone (mark as seen)
//
// Per spec section 26: milestones are non-financial achievements.
// Claiming triggers a confetti celebration in the UI.
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

  // Find the UserMilestone row
  const um = await db.userMilestone.findFirst({
    where: { userId: user.id, milestoneId: id },
    include: { milestone: true },
  })

  if (!um) {
    return NextResponse.json({ error: 'Milestone not achieved yet' }, { status: 404 })
  }

  if (um.claimed) {
    return NextResponse.json({ ok: true, alreadyClaimed: true, milestone: um.milestone })
  }

  const updated = await db.userMilestone.update({
    where: { id: um.id },
    data: { claimed: true, claimedAt: new Date() },
    include: { milestone: true },
  })

  return NextResponse.json({ ok: true, milestone: updated.milestone })
}
