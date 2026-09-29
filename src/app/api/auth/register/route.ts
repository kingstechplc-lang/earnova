// POST /api/auth/register — with Argon2id hashing, email verification, rate limiting
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword, createSession, setSessionCookie, createEmailVerificationToken,
  rateLimitRegister, auditLog,
} from '@/lib/auth'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  // Rate limit: 3 registrations per hour per IP
  const rl = rateLimitRegister(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) }
      }
    )
  }

  const body = await req.json()
  const { email, name, password } = body as { email: string; name?: string; password: string }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }
  if (!email.includes('@') || email.length > 255) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  // Argon2id password hashing (replaces SHA-256)
  const passwordHash = await hashPassword(password)

  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      name: name || null,
      passwordHash,
      role: 'USER',
      // emailVerified is null until verified
    },
  })

  // Create email verification token
  const verifyToken = await createEmailVerificationToken(user.id)

  // In production, send email here. For now, return the token (dev only).
  // In production: await sendVerificationEmail(user.email, verifyToken)
  const verifyUrl = `${req.nextUrl.origin}/api/auth/verify-email?token=${verifyToken}`

  // Create session (user is logged in but email is unverified)
  const session = await createSession(user.id, {
    userAgent: req.headers.get('user-agent') || undefined,
    ipAddress: ip,
  })
  await setSessionCookie(session.id)

  // Audit log
  await auditLog({
    actorId: user.id,
    action: 'user.registered',
    resource: `user:${user.id}`,
    ipAddress: ip,
    userAgent: req.headers.get('user-agent') || undefined,
  })

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: null },
    // Dev only: return verification URL. Remove in production.
    verificationUrl: process.env.NODE_ENV === 'development' ? verifyUrl : undefined,
  })
}
