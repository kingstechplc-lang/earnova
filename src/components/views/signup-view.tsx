'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Sparkles, Check, Mail, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { useConfetti } from '@/components/animated/confetti'
import { safeFetch } from '@/lib/safe-fetch'
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
  const [registered, setRegistered] = useState(false)
  const [verifyUrl, setVerifyUrl] = useState('')
  const { fire: fireConfetti, ConfettiLayer } = useConfetti()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await safeFetch<{ user?: CurrentUser; error?: string; verificationUrl?: string }>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, password }),
    })
    setLoading(false)
    if (res.error || !res.data?.user) {
      setError(res.error || 'Sign up failed')
      return
    }
    // Celebrate
    fireConfetti({ count: 200, spread: 100, y: 0.3 })
    // Show verification message (dev mode returns the URL)
    if (res.data.verificationUrl) {
      setVerifyUrl(res.data.verificationUrl)
    }
    setRegistered(true)
    // Auto-login after a short delay
    setTimeout(() => onAuth(res.data!.user!), 2500)
  }

  // Post-registration verification screen
  if (registered) {
    return (
      <div className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 overflow-hidden">
        {ConfettiLayer}
        <div className="absolute inset-0 mesh-bg" />
        <FloatingOrbs count={3} colors={['evergreen', 'gold', 'berry']} />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full max-w-md relative"
        >
          <Card className="overflow-hidden shadow-elevated border-evergreen/20 glass-strong">
            <div className="h-1.5 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
            <CardContent className="py-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-evergreen/10 mb-4"
              >
                <Check className="h-7 w-7 text-evergreen" />
              </motion.div>
              <h2 className="font-serif text-2xl font-bold mb-2">Account created!</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Welcome to Earnova. We have sent a verification link to <strong className="text-foreground">{email}</strong>.
              </p>

              {/* Dev mode: show verify link */}
              {verifyUrl && (
                <div className="p-3 rounded-lg bg-gold/5 border border-gold/30 mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Development mode — click to verify:</p>
                  <a href={verifyUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-evergreen underline decoration-gold/50 hover:decoration-gold">
                    <Mail className="h-3.5 w-3.5" /> Verify email now
                  </a>
                </div>
              )}

              <p className="text-xs text-muted-foreground">Redirecting you to your dashboard…</p>
              <div className="mt-3 h-1 w-full bg-muted/30 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 2.5, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-evergreen to-gold"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    )
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
            <CardTitle className="font-serif text-2xl">Create your account</CardTitle>
            <CardDescription>Free to start. No payment information required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Display name (optional)</Label>
                <Input id="name" type="text" value={name} onChange={e => setName(e.target.value)} className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password (min 6 characters)</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} className="bg-background" />
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
                    <><span className="h-4 w-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin mr-2" />Creating account…</>
                  ) : (
                    <>Sign up — free<Sparkles className="h-3.5 w-3.5 ml-2 anim-sparkle-pulse" /></>
                  )}
                </span>
              </Button>
            </form>

            <div className="mt-5 pt-5 border-t border-border/60">
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
            </div>

            <p className="text-center text-sm text-muted-foreground mt-5">
              Already have an account?{' '}
              <button className="text-evergreen underline decoration-gold/50 decoration-2 underline-offset-2 font-medium hover:decoration-gold transition-all" onClick={() => navigate({ name: 'login' })}>
                Log in
              </button>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
