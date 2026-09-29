// POST /api/auth/resend-verification — resend email verification token
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createEmailVerificationToken, rateLimitEmailVerify } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  const rl = rateLimitEmailVerify(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.emailVerified) {
    return NextResponse.json({ error: 'Email is already verified' }, { status: 400 })
  }

  const token = await createEmailVerificationToken(user.id)
  const verifyUrl = `${req.nextUrl.origin}/api/auth/verify-email?token=${token}`

  // In production: send email here
  // await sendVerificationEmail(user.email, token)

  return NextResponse.json({
    success: true,
    message: 'Verification email sent.',
    // Dev only
    verificationUrl: process.env.NODE_ENV === 'development' ? verifyUrl : undefined,
  })
}
