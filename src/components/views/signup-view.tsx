'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Sparkles, Check } from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'

export default function SignupView({
  onAuth, navigate,
}: {
  onAuth: (u: CurrentUser) => void
  navigate: (v: View) => void
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || 'Sign up failed')
      return
    }
    onAuth(data.user)
  }

  return (
    <div className="view-fade min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 right-1/4 h-64 w-64 rounded-full bg-evergreen/10 blur-3xl" />
        <div className="absolute bottom-20 left-1/4 h-64 w-64 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-48 w-48 rounded-full bg-berry/10 blur-3xl" />
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
            <CardTitle className="font-serif text-2xl">Create your account</CardTitle>
            <CardDescription>Free to start. No payment information required.</CardDescription>
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
                <Label htmlFor="name">Display name (optional)</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password (min 6 characters)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
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
                {loading ? 'Creating account…' : 'Sign up — free'}
              </Button>
            </form>

            {/* Perks */}
            <div className="mt-5 pt-5 border-t border-border/60">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">What you get</p>
              <ul className="space-y-2">
                {[
                  'Unlimited Special Pages',
                  'Drag-and-drop page builder',
                  'Share on WhatsApp, social, anywhere',
                  'Optionally connect Adsterra / Monetag',
                ].map(perk => (
                  <li key={perk} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-evergreen/15 text-evergreen">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-5">
              Already have an account?{' '}
              <button className="text-evergreen underline decoration-gold/50 decoration-2 underline-offset-2 font-medium hover:decoration-gold" onClick={() => navigate({ name: 'login' })}>
                Log in
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
