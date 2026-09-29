'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Sparkles, Mail, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { safeFetch } from '@/lib/safe-fetch'
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
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [forgotError, setForgotError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await safeFetch<{ user?: CurrentUser; error?: string }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    setLoading(false)
    if (res.error || !res.data?.user) {
      setError(res.error || 'Login failed')
      return
    }
    onAuth(res.data.user)
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault()
    setForgotError('')
    setForgotLoading(true)
    const res = await safeFetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail }),
    })
    setForgotLoading(false)
    if (res.error) { setForgotError(res.error); return }
    setForgotSent(true)
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 overflow-hidden">
      <div className="absolute inset-0 mesh-bg" />
      <FloatingOrbs count={4} colors={['evergreen', 'gold', 'berry', 'sage']} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative"
      >
        <Card className="overflow-hidden shadow-elevated border-evergreen/20 glass-strong">
          <div className="h-1.5 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
          <CardHeader>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive overflow-hidden">
                <Sparkles className="h-4 w-4 relative z-10" />
                <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-gold/30 to-transparent animate-pulse" />
              </span>
              <span className="font-bold">Earnova</span>
            </div>
            <CardTitle className="font-serif text-2xl">
              {showForgot ? 'Reset password' : 'Welcome back'}
            </CardTitle>
            <CardDescription>
              {showForgot ? 'Enter your email and we will send you a reset link.' : 'Log in to manage your Special Pages.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Login form */}
            {!showForgot && (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-background" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button type="button" onClick={() => { setShowForgot(true); setForgotEmail(email) }}
                      className="text-xs text-evergreen underline decoration-gold/50 decoration-2 underline-offset-2 hover:decoration-gold">
                      Forgot password?
                    </button>
                  </div>
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-background" />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 p-2.5 rounded-md border border-destructive/20">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 anim-wiggle" />
                    <span>{error}</span>
                  </div>
                )}
                <Button type="submit" disabled={loading} className="w-full bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive h-11 btn-glow relative overflow-hidden group">
                  <span className="relative z-10 flex items-center justify-center">
                    {loading ? (
                      <><span className="h-4 w-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin mr-2" />Logging in…</>
                    ) : (
                      <>Log in<Sparkles className="h-3.5 w-3.5 ml-2 anim-sparkle-pulse" /></>
                    )}
                  </span>
                </Button>
              </form>
            )}

            {/* Forgot password form */}
            {showForgot && !forgotSent && (
              <form onSubmit={submitForgot} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgotEmail"><Mail className="inline h-3 w-3 mr-1" />Email</Label>
                  <Input id="forgotEmail" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required className="bg-background" placeholder="your@email.com" />
                </div>
                {forgotError && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 p-2.5 rounded-md border border-destructive/20">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}
                <Button type="submit" disabled={forgotLoading} className="w-full bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive h-11">
                  {forgotLoading ? 'Sending…' : 'Send reset link'}
                </Button>
                <button type="button" onClick={() => setShowForgot(false)} className="w-full text-xs text-muted-foreground hover:text-foreground">← Back to login</button>
              </form>
            )}

            {/* Forgot password sent confirmation */}
            {showForgot && forgotSent && (
              <div className="space-y-4 text-center py-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-evergreen/10 mb-2">
                  <Mail className="h-5 w-5 text-evergreen" />
                </div>
                <p className="font-medium">Check your email</p>
                <p className="text-sm text-muted-foreground">If an account exists with that email, a reset link has been sent.</p>
                <Button variant="outline" size="sm" onClick={() => { setShowForgot(false); setForgotSent(false) }}>← Back to login</Button>
              </div>
            )}

            {/* Demo accounts */}
            {!showForgot && (
              <div className="mt-5 pt-5 border-t border-border/60">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Demo accounts</p>
                <div className="space-y-1.5">
                  <button onClick={() => { setEmail('kingsley@example.com'); setPassword('demo1234') }}
                    className="w-full flex items-center gap-2 text-xs font-mono bg-muted/40 hover:bg-evergreen/10 px-3 py-2 rounded-md border border-border/60 transition-colors group">
                    <span className="h-2 w-2 rounded-full bg-evergreen group-hover:animate-pulse" />
                    <span className="flex-1 text-left">kingsley@example.com / demo1234</span>
                    <span className="ml-auto text-muted-foreground text-[10px] uppercase">creator</span>
                  </button>
                  <button onClick={() => { setEmail('admin@example.com'); setPassword('admin1234') }}
                    className="w-full flex items-center gap-2 text-xs font-mono bg-muted/40 hover:bg-gold/10 px-3 py-2 rounded-md border border-border/60 transition-colors group">
                    <span className="h-2 w-2 rounded-full bg-gold-dark group-hover:animate-pulse" />
                    <span className="flex-1 text-left">admin@example.com / admin1234</span>
                    <span className="ml-auto text-muted-foreground text-[10px] uppercase">admin</span>
                  </button>
                </div>
              </div>
            )}

            {!showForgot && (
              <p className="text-center text-sm text-muted-foreground mt-5">
                Don&apos;t have an account?{' '}
                <button className="text-evergreen underline decoration-gold/50 decoration-2 underline-offset-2 font-medium hover:decoration-gold transition-all" onClick={() => navigate({ name: 'signup' })}>
                  Sign up
                </button>
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
