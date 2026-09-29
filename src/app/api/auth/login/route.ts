// POST /api/auth/login — with Argon2id verification + legacy hash migration + rate limiting
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyPassword, verifyLegacyPassword, migratePasswordHash,
  createSession, setSessionCookie, rateLimitLogin, auditLog,
} from '@/lib/auth'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'

  // Rate limit: 5 login attempts per 15 min per IP
  const rl = rateLimitLogin(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) }
      }
    )
  }

  const body = await req.json()
  const { email, password } = body as { email: string; password: string }

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  // Try Argon2id verification first
  let valid = await verifyPassword(password, user.passwordHash)

  // If Argon2id fails, try legacy SHA-256 (for users with old hashes)
  if (!valid && user.passwordHash.includes(':') && user.passwordHash.length < 100) {
    valid = verifyLegacyPassword(password, user.passwordHash)
    // If legacy verification succeeds, migrate to Argon2id
    if (valid) {
      await migratePasswordHash(user.id, password)
    }
  }

  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const session = await createSession(user.id, {
    userAgent: req.headers.get('user-agent') || undefined,
    ipAddress: ip,
  })
  await setSessionCookie(session.id)

  // Audit log
  await auditLog({
    actorId: user.id,
    action: 'user.login',
    resource: `user:${user.id}`,
    ipAddress: ip,
    userAgent: req.headers.get('user-agent') || undefined,
  })

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
    }
  })
}
