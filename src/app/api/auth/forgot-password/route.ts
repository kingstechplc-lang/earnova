// POST /api/auth/forgot-password — request password reset
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createPasswordResetToken, rateLimitPasswordReset } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  const rl = rateLimitPasswordReset(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many reset attempts. Please try again later.' },
      { status: 429 }
    )
  }

  const body = await req.json()
  const { email } = body as { email: string }

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })

  // Always return success to prevent email enumeration
  if (!user) {
    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.',
    })
  }

  const token = await createPasswordResetToken(user.id)
  const resetUrl = `${req.nextUrl.origin}/#/reset-password?token=${token}`

  // In production: send email here
  // await sendPasswordResetEmail(user.email, token)

  return NextResponse.json({
    success: true,
    message: 'If an account exists with that email, a reset link has been sent.',
    // Dev only
    resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined,
  })
}
