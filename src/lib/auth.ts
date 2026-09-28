// Simple session-based auth (no NextAuth dependency for MVP)
// Stores user ID in HTTP-only cookie, looks up user on each request.
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'

const SESSION_COOKIE = 'gep_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  const session = await db.session.create({
    data: { userId, expiresAt },
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
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: sessionId } }).catch(() => {})
    return null
  }
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

// Simple password hashing (MVP only — production should use argon2/bcrypt)
import { createHash, randomBytes } from 'crypto'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = createHash('sha256').update(salt + password).digest('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const computed = createHash('sha256').update(salt + password).digest('hex')
  return computed === hash
}
