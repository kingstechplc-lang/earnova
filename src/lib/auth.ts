// Authentication & Security — Phase 1 upgrade
// Replaces SHA-256 with Argon2id password hashing
// Adds email verification, password reset, session management, rate limiting

import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { randomBytes, timingSafeEqual } from 'crypto'
import { hash, verify } from '@node-rs/argon2'

const SESSION_COOKIE = 'earnova_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

// ─── PASSWORD HASHING (Argon2id) ────────────────────────────────────────────

const ARGON2_OPTIONS = {
  algorithm: 2,        // Argon2id
  memoryCost: 19456,   // 19 MB
  timeCost: 2,          // 2 iterations
  parallelism: 1,
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS)
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    return verify(storedHash, password)
  } catch {
    return false
  }
}

// Legacy SHA-256 verification — used ONLY for migrating old hashes to Argon2id
import { createHash } from 'crypto'
export function verifyLegacyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const computed = createHash('sha256').update(salt + password).digest('hex')
  // Use timingSafeEqual to prevent timing attacks
  if (computed.length !== hash.length) return false
  return timingSafeEqual(Buffer.from(computed), Buffer.from(hash))
}

export async function migratePasswordHash(userId: string, password: string): Promise<void> {
  const newHash = await hashPassword(password)
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  })
}

// ─── TOKEN GENERATION ────────────────────────────────────────────────────────

export function generateSecureToken(): string {
  return randomBytes(32).toString('hex')
}

// ─── SESSION MANAGEMENT ──────────────────────────────────────────────────────

export async function createSession(userId: string, metadata?: { userAgent?: string; ipAddress?: string }) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  const session = await db.session.create({
    data: {
      userId,
      expiresAt,
      userAgent: metadata?.userAgent || null,
      ipAddress: metadata?.ipAddress || null,
      lastActivity: new Date(),
    },
  })
  return session
}

export async function getCurrentUser() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionId) return null

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })

  if (!session) return null

  // Check if revoked
  if (session.revokedAt) return null

  // Check if expired
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: sessionId } }).catch(() => {})
    return null
  }

  // Update last activity (fire-and-forget, non-blocking)
  db.session.update({
    where: { id: sessionId },
    data: { lastActivity: new Date() },
  }).catch(() => {})

  return session.user
}

export async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
    throw new Error('FORBIDDEN')
  }
  return user
}

export async function requireSuperAdmin() {
  const user = await requireUser()
  if (user.role !== 'ADMIN') {
    throw new Error('FORBIDDEN')
  }
  return user
}

// ─── EMAIL VERIFICATION ─────────────────────────────────────────────────────

export async function createEmailVerificationToken(userId: string): Promise<string> {
  const token = generateSecureToken()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours

  await db.emailVerificationToken.create({
    data: { userId, token, expiresAt },
  })

  return token
}

export async function verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
  const record = await db.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!record) {
    return { success: false, message: 'Invalid verification token.' }
  }

  if (record.usedAt) {
    return { success: false, message: 'This verification link has already been used.' }
  }

  if (record.expiresAt < new Date()) {
    return { success: false, message: 'This verification link has expired. Please request a new one.' }
  }

  // Mark token as used + verify user email
  await db.$transaction([
    db.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
  ])

  // Audit log
  await db.auditLog.create({
    data: {
      actorId: record.userId,
      action: 'user.email_verified',
      resource: `user:${record.userId}`,
    },
  }).catch(() => {})

  return { success: true, message: 'Email verified successfully.' }
}

// ─── PASSWORD RESET ────────────────────────────────────────────────────────

export async function createPasswordResetToken(userId: string): Promise<string> {
  // Invalidate any existing tokens for this user
  await db.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  })

  const token = generateSecureToken()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30) // 30 minutes

  await db.passwordResetToken.create({
    data: { userId, token, expiresAt },
  })

  return token
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const record = await db.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!record) {
    return { success: false, message: 'Invalid reset token.' }
  }

  if (record.usedAt) {
    return { success: false, message: 'This reset link has already been used.' }
  }

  if (record.expiresAt < new Date()) {
    return { success: false, message: 'This reset link has expired. Please request a new one.' }
  }

  const newHash = await hashPassword(newPassword)

  // Mark token as used + update password + revoke all sessions
  await db.$transaction([
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: newHash },
    }),
    db.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ])

  // Audit log
  await db.auditLog.create({
    data: {
      actorId: record.userId,
      action: 'user.password_reset',
      resource: `user:${record.userId}`,
    },
  }).catch(() => {})

  return { success: true, message: 'Password reset successfully. Please log in with your new password.' }
}

// ─── RATE LIMITING (in-memory, per-IP) ──────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || record.resetAt < now) {
    // New window
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs }
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }

  record.count++
  return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt }
}

// Convenience rate limiters
export function rateLimitLogin(ip: string) {
  return rateLimit(`login:${ip}`, 5, 1000 * 60 * 15) // 5 attempts per 15 min
}

export function rateLimitRegister(ip: string) {
  return rateLimit(`register:${ip}`, 3, 1000 * 60 * 60) // 3 per hour
}

export function rateLimitPasswordReset(ip: string) {
  return rateLimit(`reset:${ip}`, 3, 1000 * 60 * 60) // 3 per hour
}

export function rateLimitEmailVerify(ip: string) {
  return rateLimit(`verify:${ip}`, 5, 1000 * 60 * 15) // 5 per 15 min
}

// ─── AUDIT LOGGING ──────────────────────────────────────────────────────────

export async function auditLog(params: {
  actorId?: string
  action: string
  resource?: string
  previousState?: any
  newState?: any
  reason?: string
  ipAddress?: string
  userAgent?: string
  requestId?: string
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId || null,
        action: params.action,
        resource: params.resource || null,
        previousState: params.previousState ? JSON.stringify(params.previousState) : null,
        newState: params.newState ? JSON.stringify(params.newState) : null,
        reason: params.reason || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        requestId: params.requestId || null,
      },
    })
  } catch (err) {
    // Audit log failures should never break the request
    console.error('Audit log failed:', err)
  }
}
