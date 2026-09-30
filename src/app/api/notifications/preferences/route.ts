// GET  /api/notifications/preferences — list the user's notification preferences
// PATCH /api/notifications/preferences — update preferences
//
// Per spec section 15 — user can control in-app + email per notification type.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import type { NotificationType } from '@prisma/client'

const ALL_TYPES: NotificationType[] = [
  'NEW_FOLLOWER', 'NEW_REACTION', 'NEW_COMMENT', 'NEW_REPLY', 'NEW_SHARE',
  'NEW_SAVE', 'NEW_POST_FROM_FOLLOWED', 'PAGE_PUBLISHED', 'CAMPAIGN',
  'MODERATION_ACTION', 'AD_INTEGRATION_APPROVED', 'AD_INTEGRATION_REJECTED',
  'SECURITY_ALERT', 'ACCOUNT_VERIFICATION', 'CREATOR_MILESTONE',
]

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await db.notificationPreference.findMany({
    where: { userId: user.id },
  })
  const map = new Map(existing.map(p => [p.type, p]))

  // Return all types with defaults for missing ones
  const preferences = ALL_TYPES.map(type => {
    const p = map.get(type)
    return {
      type,
      inAppEnabled: p?.inAppEnabled ?? true,
      emailEnabled: p?.emailEnabled ?? false,
    }
  })

  return NextResponse.json({ preferences })
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, inAppEnabled, emailEnabled } = body as {
    type: string
    inAppEnabled?: boolean
    emailEnabled?: boolean
  }

  if (!type || !ALL_TYPES.includes(type as NotificationType)) {
    return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
  }

  const data: any = {}
  if (typeof inAppEnabled === 'boolean') data.inAppEnabled = inAppEnabled
  if (typeof emailEnabled === 'boolean') data.emailEnabled = emailEnabled

  const pref = await db.notificationPreference.upsert({
    where: { userId_type: { userId: user.id, type: type as NotificationType } },
    create: { userId: user.id, type: type as NotificationType, ...data },
    update: data,
  })

  return NextResponse.json({ preference: pref })
}
