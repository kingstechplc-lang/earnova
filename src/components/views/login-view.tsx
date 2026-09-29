'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { Sparkles as SparklesComponent } from '@/components/animated/sparkles'
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

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Animated background */}
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
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex items-center gap-2.5 mb-2"
            >
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive overflow-hidden">
                <Sparkles className="h-4 w-4 relative z-10" />
                <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-gold/30 to-transparent animate-pulse" />
              </span>
              <span className="font-bold">PageNova</span>
            </motion.div>
            <CardTitle className="font-serif text-2xl">Welcome back</CardTitle>
            <CardDescription>Log in to manage your Special Pages.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-background transition-all focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="bg-background transition-all focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </motion.div>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 text-sm text-destructive bg-destructive/5 p-2.5 rounded-md border border-destructive/20"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0 anim-wiggle" />
                  <span>{error}</span>
                </motion.div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive h-11 btn-glow relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {loading ? (
                      <>
                        <span className="h-4 w-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin mr-2" />
                        Logging in…
                      </>
                    ) : (
                      <>
                        Log in
                        <Sparkles className="h-3.5 w-3.5 ml-2 anim-sparkle-pulse" />
                      </>
                    )}
                  </span>
                </Button>
              </motion.div>
            </form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-5 pt-5 border-t border-border/60"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Demo accounts</p>
              <div className="space-y-1.5">
                <button
                  onClick={() => { setEmail('kingsley@example.com'); setPassword('demo1234') }}
                  className="w-full flex items-center gap-2 text-xs font-mono bg-muted/40 hover:bg-evergreen/10 px-3 py-2 rounded-md border border-border/60 transition-colors group"
                >
                  <span className="h-2 w-2 rounded-full bg-evergreen group-hover:animate-pulse" />
                  <span className="flex-1 text-left">kingsley@example.com / demo1234</span>
                  <span className="text-muted-foreground text-[10px] uppercase">creator</span>
                </button>
                <button
                  onClick={() => { setEmail('admin@example.com'); setPassword('admin1234') }}
                  className="w-full flex items-center gap-2 text-xs font-mono bg-muted/40 hover:bg-gold/10 px-3 py-2 rounded-md border border-border/60 transition-colors group"
                >
                  <span className="h-2 w-2 rounded-full bg-gold-dark group-hover:animate-pulse" />
                  <span className="flex-1 text-left">admin@example.com / admin1234</span>
                  <span className="text-muted-foreground text-[10px] uppercase">admin</span>
                </button>
              </div>
            </motion.div>

            <p className="text-center text-sm text-muted-foreground mt-5">
              Don&apos;t have an account?{' '}
              <button
                className="text-evergreen underline decoration-gold/50 decoration-2 underline-offset-2 font-medium hover:decoration-gold transition-all"
                onClick={() => navigate({ name: 'signup' })}
              >
                Sign up
              </button>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
