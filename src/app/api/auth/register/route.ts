// POST /api/auth/register
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, name, password } = body as { email: string; name?: string; password: string }
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }
  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      name: name || null,
      passwordHash: hashPassword(password),
      role: 'USER',
    },
  })
  const session = await createSession(user.id)
  await setSessionCookie(session.id)
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } })
}
