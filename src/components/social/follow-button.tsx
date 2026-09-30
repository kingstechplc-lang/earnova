'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, UserCheck, Loader2, LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { safeFetch } from '@/lib/safe-fetch'
import { toast } from '@/hooks/use-toast'
import type { CurrentVisitor } from './use-current-user'

/**
 * FollowButton — renders the correct Follow state for a creator's profile.
 *
 * Variants:
 *   - 'hero'   — large, for the profile hero (cream glass on dark cover)
 *   - 'list'   — compact, for follower/following user-card rows
 *
 * Behavior:
 *   - Logged-out visitor → renders a "Log in to follow" CTA (calls onLogin).
 *   - Logged-in + own profile → renders nothing (caller should hide).
 *   - Logged-in otherwise → optimistic follow/unfollow via POST/DELETE.
 *
 * `following` initial state is passed in by the parent (caller fetches
 * /api/follow/[username] once on mount). The button then owns the local
 * state and notifies the parent via onFollowingChange when it changes —
 * so the parent can keep its displayed follower count in sync.
 */
export function FollowButton({
  username,
  initialFollowing,
  currentUser,
  variant = 'hero',
  onLogin,
  onFollowingChange,
}: {
  username: string
  initialFollowing: boolean
  currentUser: CurrentVisitor | null
  variant?: 'hero' | 'list'
  onLogin?: () => void
  onFollowingChange?: (following: boolean) => void
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [pending, setPending] = useState(false)

  // Visitor is not logged in — show the login CTA.
  if (!currentUser) {
    if (variant === 'list') {
      return null
    }
    return (
      <button
        onClick={onLogin}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
          'bg-cream/15 text-cream hover:bg-cream/25 border-cream/20 backdrop-blur-sm',
          'btn-glow overflow-hidden transition-all'
        )}
      >
        <LogIn className="h-4 w-4" /> Log in to follow
      </button>
    )
  }

  async function toggle() {
    if (pending) return
    const prev = following
    setPending(true)
    // Optimistic update — flip the local state immediately for snappy UX.
    setFollowing(!prev)
    onFollowingChange?.(!prev)

    const method = prev ? 'DELETE' : 'POST'
    const res = await safeFetch<{ following: boolean }>(
      `/api/follow/${encodeURIComponent(username)}`,
      { method }
    )
    setPending(false)

    if (res.error) {
      // Revert on failure + surface a toast.
      setFollowing(prev)
      onFollowingChange?.(prev)
      toast({
        title: 'Could not update follow',
        description: res.error,
        variant: 'destructive',
      })
      return
    }
    // Confirm with server-truth (res.data.following is authoritative).
    if (res.data && res.data.following !== !prev) {
      setFollowing(res.data.following)
      onFollowingChange?.(res.data.following)
    }
    // Light feedback on follow success.
    if (!prev && res.data?.following) {
      toast({
        title: 'Following',
        description: `You'll see @${username}'s new posts in your feed.`,
      })
    }
  }

  // ── List variant — compact pill ─────────────────────────────────────────
  if (variant === 'list') {
    return (
      <button
        onClick={toggle}
        disabled={pending}
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          following
            ? 'bg-muted text-muted-foreground hover:bg-cranberry/10 hover:text-cranberry'
            : 'bg-evergreen text-cream hover:bg-evergreen-dark shadow-sm'
        )}
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> :
          following ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
        {following ? 'Following' : 'Follow'}
      </button>
    )
  }

  // ── Hero variant — larger, styled for the dark cover panel ─────────────
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={toggle}
      disabled={pending}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium',
        'btn-glow overflow-hidden border backdrop-blur-sm transition-colors',
        'disabled:opacity-70 disabled:cursor-not-allowed',
        following
          ? 'bg-cream/15 text-cream border-cream/30 hover:bg-cranberry/20 hover:border-cranberry/40'
          : 'bg-gold text-evergreen-dark border-gold hover:bg-gold-light'
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={pending ? 'pending' : following ? 'on' : 'off'}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="inline-flex items-center gap-1.5"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> :
            following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {following ? 'Following' : 'Follow'}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}
