'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Sparkles, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { safeFetch } from '@/lib/safe-fetch'
import { useConfetti } from '@/components/animated/confetti'
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
  const { fire: fireConfetti, ConfettiLayer } = useConfetti()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await safeFetch<{ user?: CurrentUser; error?: string }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    })
    setLoading(false)
    if (res.error || !res.data?.user) {
      setError(res.error || 'Sign up failed')
      return
    }
    // Celebrate the new account creation!
    fireConfetti({ count: 200, spread: 100, y: 0.3 })
    // Delay navigation slightly so confetti is visible
    setTimeout(() => onAuth(res.data!.user!), 600)
  }

  const perks = [
    'Unlimited Special Pages',
    'Drag-and-drop page builder',
    'Share on WhatsApp, social, anywhere',
    'Optionally connect Adsterra / Monetag',
  ]

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 overflow-hidden">
      {ConfettiLayer}
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
            <CardTitle className="font-serif text-2xl">Create your account</CardTitle>
            <CardDescription>Free to start. No payment information required.</CardDescription>
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
                transition={{ delay: 0.35 }}
                className="space-y-2"
              >
                <Label htmlFor="name">Display name (optional)</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="bg-background transition-all focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label htmlFor="password">Password (min 6 characters)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
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
                        Creating account…
                      </>
                    ) : (
                      <>
                        Sign up — free
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
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">What you get</p>
              <ul className="space-y-2">
                {perks.map((perk, i) => (
                  <motion.li
                    key={perk}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + i * 0.08 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-evergreen/15 text-evergreen">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    {perk}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <p className="text-center text-sm text-muted-foreground mt-5">
              Already have an account?{' '}
              <button
                className="text-evergreen underline decoration-gold/50 decoration-2 underline-offset-2 font-medium hover:decoration-gold transition-all"
                onClick={() => navigate({ name: 'login' })}
              >
                Log in
              </button>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
