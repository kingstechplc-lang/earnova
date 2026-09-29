// GET /api/auth/verify-email?token=xxx — verify email with token
import { NextRequest, NextResponse } from 'next/server'
import { verifyEmail, rateLimitEmailVerify } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  const rl = rateLimitEmailVerify(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many verification attempts. Please try again later.' },
      { status: 429 }
    )
  }

  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Verification token required' }, { status: 400 })
  }

  const result = await verifyEmail(token)

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, message: result.message })
}
