// POST /api/auth/login
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, password } = body as { email: string; password: string }
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  const session = await createSession(user.id)
  await setSessionCookie(session.id)
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } })
}
