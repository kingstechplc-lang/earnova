// POST /api/auth/reset-password — reset password with token
import { NextRequest, NextResponse } from 'next/server'
import { resetPassword, rateLimitPasswordReset } from '@/lib/auth'

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
  const { token, password } = body as { token: string; password: string }

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and new password required' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const result = await resetPassword(token, password)

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, message: result.message })
}
