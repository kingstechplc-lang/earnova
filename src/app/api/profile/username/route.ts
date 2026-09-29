// /api/profile/username
// POST — claim a username (checks availability, validates, assigns)
// GET — check if username is available (query param: ?check=kingsley)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, auditLog } from '@/lib/auth'
import { validateUsername, normalizeUsername, generateUsernameSuggestions } from '@/lib/username'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const check = searchParams.get('check')

  if (!check) {
    return NextResponse.json({ error: 'Missing "check" query parameter' }, { status: 400 })
  }

  const validation = validateUsername(check.toLowerCase())
  if (!validation.valid) {
    return NextResponse.json({ available: false, reason: validation.error })
  }

  const normalized = normalizeUsername(check)
  const existing = await db.user.findUnique({
    where: { usernameLower: normalized },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json({
      available: false,
      reason: 'This username is already taken.',
      suggestions: generateUsernameSuggestions(check),
    })
  }

  return NextResponse.json({ available: true })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { username } = body as { username: string }

  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 })
  }

  const normalized = normalizeUsername(username)

  // Validate format
  const validation = validateUsername(normalized)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  // Check if already taken (including by other users)
  const existing = await db.user.findUnique({
    where: { usernameLower: normalized },
    select: { id: true },
  })

  if (existing && existing.id !== user.id) {
    return NextResponse.json({
      error: 'This username is already taken.',
      suggestions: generateUsernameSuggestions(username),
    }, { status: 409 })
  }

  // Claim or update username
  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      username: normalized,
      usernameLower: normalized,
    },
    select: { id: true, username: true, usernameLower: true },
  })

  // Audit log
  await auditLog({
    actorId: user.id,
    action: 'user.username_claimed',
    resource: `user:${user.id}`,
    newState: { username: normalized },
  })

  return NextResponse.json({ user: updated })
}
