'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Sparkles } from 'lucide-react'
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
    <div className="view-fade min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 left-1/4 h-64 w-64 rounded-full bg-evergreen/10 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-64 w-64 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-48 w-48 rounded-full bg-berry/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        <Card className="overflow-hidden shadow-festive border-evergreen/20">
          <div className="h-1.5 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
          <CardHeader>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="font-bold">Global Creator Pages</span>
            </div>
            <CardTitle className="font-serif text-2xl">Welcome back</CardTitle>
            <CardDescription>Log in to manage your Special Pages.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="bg-background"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 p-2.5 rounded-md border border-destructive/20">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive h-11"
              >
                {loading ? 'Logging in…' : 'Log in'}
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-border/60">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Demo accounts</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono bg-muted/40 px-3 py-2 rounded-md border border-border/60">
                  <span className="text-evergreen">●</span>
                  <span>kingsley@example.com / demo1234</span>
                  <span className="ml-auto text-muted-foreground">creator</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono bg-muted/40 px-3 py-2 rounded-md border border-border/60">
                  <span className="text-gold-dark">●</span>
                  <span>admin@example.com / admin1234</span>
                  <span className="ml-auto text-muted-foreground">admin</span>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-5">
              Don&apos;t have an account?{' '}
              <button className="text-evergreen underline decoration-gold/50 decoration-2 underline-offset-2 font-medium hover:decoration-gold" onClick={() => navigate({ name: 'signup' })}>
                Sign up
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
