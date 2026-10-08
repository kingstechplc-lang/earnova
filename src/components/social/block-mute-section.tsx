'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { motion, AnimatePresence } from 'framer-motion'
import { safeFetch } from '@/lib/safe-fetch'
import { toast } from '@/hooks/use-toast'
import { FadeIn } from '@/components/animated/motion'
import {
  ShieldOff, VolumeOff, Loader2, UserX, ExternalLink, RefreshCw,
} from 'lucide-react'
import type { View } from '@/app/page'

type BlockedUser = {
  id: string
  name: string | null
  username: string | null
  image: string | null
  bio: string | null
  createdAt: string
}

type MutedUser = {
  id: string
  name: string | null
  username: string | null
  image: string | null
  bio: string | null
  createdAt: string
}

/**
 * BlockMuteSection — a self-contained management UI for the current user's
 * block + mute lists. Designed to drop into the profile-setup view (or any
 * settings surface). Lists both lists side-by-side on desktop, stacked on
 * mobile, with "Unblock"/"Unmute" buttons per row.
 *
 * Fetches /api/block and /api/mute on mount. Actions:
 *   - Unblock → DELETE /api/block/[username] (optimistic removal)
 *   - Unmute → DELETE /api/mute/[username] (optimistic removal)
 */
export function BlockMuteSection({ navigate }: { navigate?: (v: View) => void }) {
  const [blocked, setBlocked] = useState<BlockedUser[]>([])
  const [muted, setMuted] = useState<MutedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const [bRes, mRes] = await Promise.all([
      safeFetch<{ blocked?: { id: string; createdAt: string; user: BlockedUser }[] }>('/api/block'),
      safeFetch<{ muted?: { id: string; createdAt: string; user: MutedUser }[] }>('/api/mute'),
    ])
    if (bRes.error || mRes.error) {
      setError(bRes.error || mRes.error || 'Failed to load')
    }
    setBlocked((bRes.data?.blocked || []).map(b => ({ ...b.user, createdAt: b.createdAt })))
    setMuted((mRes.data?.muted || []).map(m => ({ ...m.user, createdAt: m.createdAt })))
    setLoading(false)
  }

  useEffect(() => {
    const id = window.setTimeout(load, 0)
    return () => window.clearTimeout(id)
  }, [])

  async function unblock(u: BlockedUser) {
    if (!u.username) return
    setActingId(u.id)
    // Optimistic
    setBlocked(prev => prev.filter(x => x.id !== u.id))
    const res = await safeFetch(`/api/block/${encodeURIComponent(u.username)}`, { method: 'DELETE' })
    setActingId(null)
    if (res.error) {
      // Revert
      setBlocked(prev => [...prev, u])
      toast({ title: 'Could not unblock', description: res.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Unblocked', description: `@${u.username} can now interact with you again.` })
  }

  async function unmute(u: MutedUser) {
    if (!u.username) return
    setActingId(u.id)
    setMuted(prev => prev.filter(x => x.id !== u.id))
    const res = await safeFetch(`/api/mute/${encodeURIComponent(u.username)}`, { method: 'DELETE' })
    setActingId(null)
    if (res.error) {
      setMuted(prev => [...prev, u])
      toast({ title: 'Could not unmute', description: res.error, variant: 'destructive' })
      return
    }
    toast({ title: 'Unmuted', description: `You'll see @${u.username}'s content in your feeds again.` })
  }

  if (loading) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {[1, 2].map(i => <div key={i} className="h-48 rounded-xl shimmer-bg" />)}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-cranberry/40">
        <CardContent className="py-6 text-center">
          <Alert variant="destructive" className="border-cranberry/40 bg-cranberry/5 mb-3">
            <AlertDescription className="text-cranberry">{error}</AlertDescription>
          </Alert>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" /> Try again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {/* Blocked list */}
      <FadeIn>
        <Card className="overflow-hidden h-full">
          <div className="h-0.5 w-full bg-gradient-to-r from-cranberry to-berry" />
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <ShieldOff className="h-4 w-4 text-cranberry" />
                Blocked users
              </h4>
              <span className="inline-flex items-center justify-center rounded-full bg-cranberry/10 text-cranberry text-[10px] font-bold px-2 py-0.5">
                {blocked.length}
              </span>
            </div>

            {blocked.length === 0 ? (
              <div className="py-6 text-center">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-evergreen/10 text-evergreen mb-2">
                  <ShieldOff className="h-5 w-5 opacity-50" />
                </div>
                <p className="text-sm font-medium text-foreground">No one blocked</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[28ch] mx-auto">
                  When you block someone, they&apos;ll appear here. You can unblock them anytime.
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {blocked.map(u => {
                    const name = u.name || u.username || 'Anonymous'
                    const initial = name[0]?.toUpperCase() || '?'
                    return (
                      <motion.li
                        key={u.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
                      >
                        {u.image ? (
                          <img src={u.image} alt={name} className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cranberry to-berry text-cream text-sm font-bold flex-shrink-0">
                            {initial}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{name}</p>
                          {u.username && (
                            <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => unblock(u)}
                          disabled={actingId === u.id}
                          className="h-8 px-2 text-muted-foreground hover:text-evergreen hover:bg-evergreen/5"
                          title="Unblock"
                        >
                          {actingId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Unblock'}
                        </Button>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </ul>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Muted list */}
      <FadeIn delay={0.05}>
        <Card className="overflow-hidden h-full">
          <div className="h-0.5 w-full bg-gradient-to-r from-gold to-gold-dark" />
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <VolumeOff className="h-4 w-4 text-gold-dark" />
                Muted users
              </h4>
              <span className="inline-flex items-center justify-center rounded-full bg-gold/15 text-gold-dark text-[10px] font-bold px-2 py-0.5">
                {muted.length}
              </span>
            </div>

            {muted.length === 0 ? (
              <div className="py-6 text-center">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-evergreen/10 text-evergreen mb-2">
                  <VolumeOff className="h-5 w-5 opacity-50" />
                </div>
                <p className="text-sm font-medium text-foreground">No one muted</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[28ch] mx-auto">
                  Muting hides someone&apos;s content from your feed without blocking them.
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                <AnimatePresence initial={false}>
                  {muted.map(u => {
                    const name = u.name || u.username || 'Anonymous'
                    const initial = name[0]?.toUpperCase() || '?'
                    return (
                      <motion.li
                        key={u.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className="flex items-center gap-2.5 p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
                      >
                        {u.image ? (
                          <img src={u.image} alt={name} className="h-9 w-9 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-cream text-sm font-bold flex-shrink-0">
                            {initial}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{name}</p>
                          {u.username && (
                            <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                          )}
                        </div>
                        {u.username && navigate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate({ name: 'public-profile', username: u.username! })}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-evergreen hover:bg-evergreen/5"
                            title="View profile"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => unmute(u)}
                          disabled={actingId === u.id}
                          className="h-8 px-2 text-muted-foreground hover:text-gold-dark hover:bg-gold/5"
                          title="Unmute"
                        >
                          {actingId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Unmute'}
                        </Button>
                      </motion.li>
                    )
                  })}
                </AnimatePresence>
              </ul>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Helper note */}
      <div className="md:col-span-2">
        <Alert className="bg-muted/30 border-border/60">
          <UserX className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-xs text-muted-foreground">
            <strong className="text-foreground">Block</strong> removes someone&apos;s content from your feeds and stops them from following you.{' '}
            <strong className="text-foreground">Mute</strong> is gentler — it hides their content but they can still follow or react.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
