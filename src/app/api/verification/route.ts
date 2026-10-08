// POST /api/verification    — submit a verification request
// GET /api/verification     — get the current user's latest verification request
//
// Per spec section 39 (IMPERSONATION / VERIFICATION):
//   - Only ONE pending request at a time per user. If they already have a
//     pending request, the new submission is rejected with the existing
//     request returned.
//   - Re-submission after REJECTED is allowed.
//   - Body: { type, realName, bio?, websiteUrl?, socialLinks?, evidenceUrls? }
//     socialLinks is JSON: [{platform, url}]  — stored as a JSON string.
//     evidenceUrls is JSON: [url1, url2, ...] — stored as a JSON string.
//
// NOTE: For MVP, approval logs the action. A verified badge can be added to
// the User model later (per spec). The admin approve/reject endpoints live at
// /api/admin/verification/[id]/approve + /reject.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { VerificationType } from '@prisma/client'

const VALID_TYPES: VerificationType[] = ['CREATOR', 'BUSINESS']
const MAX_REAL_NAME = 200
const MAX_BIO = 2000
const MAX_URL = 500

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { type, realName, bio, websiteUrl, socialLinks, evidenceUrls } = body as {
    type?: string
    realName?: string
    bio?: string
    websiteUrl?: string
    socialLinks?: any
    evidenceUrls?: any
  }

  if (!type || !VALID_TYPES.includes(type as VerificationType)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  const trimmedRealName = (realName || '').trim()
  if (!trimmedRealName || trimmedRealName.length > MAX_REAL_NAME) {
    return NextResponse.json({ error: `realName is required and must be ≤ ${MAX_REAL_NAME} chars` }, { status: 400 })
  }
  const trimmedBio = (bio || '').trim()
  if (trimmedBio.length > MAX_BIO) {
    return NextResponse.json({ error: `bio must be ≤ ${MAX_BIO} chars` }, { status: 400 })
  }
  const trimmedWebsite = (websiteUrl || '').trim()
  if (trimmedWebsite.length > MAX_URL) {
    return NextResponse.json({ error: `websiteUrl must be ≤ ${MAX_URL} chars` }, { status: 400 })
  }

  // socialLinks: expect array of {platform, url}. Stringify for DB storage.
  let socialLinksJson: string | null = null
  if (socialLinks != null) {
    if (!Array.isArray(socialLinks)) {
      return NextResponse.json({ error: 'socialLinks must be an array of {platform, url}' }, { status: 400 })
    }
    const cleaned = socialLinks
      .filter((s: any) => s && typeof s === 'object' && typeof s.platform === 'string' && typeof s.url === 'string')
      .slice(0, 20)
      .map((s: any) => ({ platform: String(s.platform).slice(0, 50), url: String(s.url).slice(0, MAX_URL) }))
    socialLinksJson = JSON.stringify(cleaned)
  }

  // evidenceUrls: expect array of URL strings. Stringify for DB storage.
  let evidenceJson: string | null = null
  if (evidenceUrls != null) {
    if (!Array.isArray(evidenceUrls)) {
      return NextResponse.json({ error: 'evidenceUrls must be an array of URL strings' }, { status: 400 })
    }
    const cleaned = evidenceUrls
      .filter((u: any) => typeof u === 'string')
      .slice(0, 20)
      .map((u: string) => u.slice(0, MAX_URL))
    evidenceJson = JSON.stringify(cleaned)
  }

  // Block submission if user already has a PENDING request.
  const pending = await db.verificationRequest.findFirst({
    where: { userId: user.id, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
  })
  if (pending) {
    return NextResponse.json({
      error: 'You already have a pending verification request. Our team will review it.',
      request: pending,
    }, { status: 409 })
  }

  const request = await db.verificationRequest.create({
    data: {
      userId: user.id,
      type: type as VerificationType,
      realName: trimmedRealName,
      bio: trimmedBio || null,
      websiteUrl: trimmedWebsite || null,
      socialLinks: socialLinksJson,
      evidenceUrls: evidenceJson,
    },
  })

  return NextResponse.json({ request }, { status: 201 })
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Return the user's most recent verification request, regardless of status.
  const request = await db.verificationRequest.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ request })
}
