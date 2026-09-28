'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { View, CurrentUser } from '@/app/page'

export default function LoginView({
  onAuth, navigate,
}: {
  onAuth: (u: CurrentUser) => void
  navigate: (v: View) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || 'Login failed')
      return
    }
    onAuth(data.user)
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Log in</CardTitle>
          <CardDescription>Welcome back. Log in to manage your Special Pages.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Logging in…' : 'Log in'}
            </Button>
          </form>
          <div className="mt-4 text-sm text-muted-foreground">
            <p className="mb-2">Demo accounts:</p>
            <p className="font-mono text-xs">kingsley@example.com / demo1234</p>
            <p className="font-mono text-xs">admin@example.com / admin1234</p>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <button className="underline text-foreground" onClick={() => navigate({ name: 'signup' })}>
              Sign up
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
