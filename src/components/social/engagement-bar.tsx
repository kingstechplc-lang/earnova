'use client'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { safeFetch } from '@/lib/safe-fetch'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { CurrentVisitor } from './use-current-user'
import {
  MessageCircle, Bookmark, Share2, ThumbsUp, Loader2, LogIn,
} from 'lucide-react'

/**
 * EngagementBar — the social action row that sits below a public post's
 * content. Contains:
 *
 *   [Reactions]   a "Like" pill that expands (desktop hover, mobile tap)
 *                 to show 6 reaction emojis (👍 ❤️ 😂 😮 😢 😠).
 *   [Comments]    shows the comment count, clicks scroll to the comments
 *                 section (via onScrollToComments).
 *   [Save]        bookmark icon — toggles saved state.
 *   [Share]       re-uses the parent's share handler.
 *
 * The reactions API uses 6 ReactionType values: LIKE, LOVE, HAHA, WOW,
 * SAD, ANGRY. The bar fetches aggregate counts + the visitor's reaction
 * on mount, then optimistically updates local state on every click.
 *
 * If the visitor is not logged in, the Like / Save buttons become
 * "Log in to ..." CTAs that call onLogin.
 */
const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'LIKE',  emoji: '👍', label: 'Like' },
  { type: 'LOVE',  emoji: '❤️', label: 'Love' },
  { type: 'HAHA',  emoji: '😂', label: 'Haha' },
  { type: 'WOW',   emoji: '😮', label: 'Wow' },
  { type: 'SAD',   emoji: '😢', label: 'Sad' },
  { type: 'ANGRY', emoji: '😠', label: 'Angry' },
]

type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY'

type ReactionsData = {
  counts: Partial<Record<ReactionType, number>>
  total: number
  myReaction: ReactionType | null
}

export function EngagementBar({
  postId,
  currentUser,
  commentCount,
  onScrollToComments,
  onShare,
  onLogin,
}: {
  postId: string
  currentUser: CurrentVisitor | null
  commentCount: number
  onScrollToComments: () => void
  onShare: () => void | Promise<void>
  onLogin?: () => void
}) {
  const [data, setData] = useState<ReactionsData>({ counts: {}, total: 0, myReaction: null })
  const [saved, setSaved] = useState(false)
  const [savedLoaded, setSavedLoaded] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [pending, setPending] = useState<ReactionType | null>(null)
  const [savePending, setSavePending] = useState(false)
  const [sharePending, setSharePending] = useState(false)
  // Long-press / hover detection — we don't want the picker to flicker
  // open while the user is just moving the mouse across the bar.
  const hoverTimer = useRef<number | null>(null)

  // ── Fetch reaction state on mount ───────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await safeFetch<ReactionsData>(`/api/reactions/${encodeURIComponent(postId)}`)
      if (cancelled) return
      if (!res.error && res.data) {
        setData(res.data)
      }
    })()
    return () => { cancelled = true }
  }, [postId])

  // ── Fetch saved state on mount (only if logged in) ──────────────────────
  useEffect(() => {
    if (!currentUser) {
      setSaved(false)
      setSavedLoaded(true)
      return
    }
    let cancelled = false
    ;(async () => {
      const res = await safeFetch<{ saved: boolean }>(`/api/saves/${encodeURIComponent(postId)}`)
      if (cancelled) return
      if (!res.error && res.data) {
        setSaved(res.data.saved)
      }
      setSavedLoaded(true)
    })()
    return () => { cancelled = true }
  }, [postId, currentUser])

  // ── Reaction picker hover handlers (desktop) ─────────────────────────────
  const openPicker = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setShowReactions(true), 250)
  }
  const closePicker = () => {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    hoverTimer.current = window.setTimeout(() => setShowReactions(false), 200)
  }

  useEffect(() => {
    return () => {
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
    }
  }, [])

  // ── Set / change / remove reaction ───────────────────────────────────────
  async function react(type: ReactionType) {
    if (!currentUser) {
      onLogin?.()
      return
    }
    // Clicking the active reaction again should remove it (toggle off).
    if (data.myReaction === type) {
      return removeReaction()
    }
    setPending(type)
    setShowReactions(false)
    // Optimistic update — flip the local state immediately.
    setData(prev => {
      const next = { ...prev }
      if (prev.myReaction) {
        const prevCount = next.counts[prev.myReaction] || 0
        if (prevCount > 0) next.counts[prev.myReaction] = prevCount - 1
      } else {
        // First reaction — total goes up by one
        next.total = prev.total + 1
      }
      next.counts[type] = (next.counts[type] || 0) + 1
      next.myReaction = type
      return next
    })

    const res = await safeFetch<{ reaction: { type: ReactionType } }>(
      `/api/reactions/${encodeURIComponent(postId)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) }
    )
    setPending(null)
    if (res.error) {
      // Revert on failure.
      setData(prev => {
        const next = { ...prev }
        if (next.counts[type]) next.counts[type] = next.counts[type]! - 1
        next.myReaction = null
        next.total = Math.max(0, prev.total - 1)
        return next
      })
      toast({ title: 'Could not react', description: res.error, variant: 'destructive' })
    }
  }

  async function removeReaction() {
    if (!currentUser || !data.myReaction) return
    const prevType = data.myReaction
    setPending('LIKE') // any non-null signals "pending" in the UI
    setShowReactions(false)
    // Optimistic — remove the visitor's reaction immediately.
    setData(prev => {
      const next = { ...prev }
      if (next.counts[prevType]) next.counts[prevType] = next.counts[prevType]! - 1
      next.total = Math.max(0, prev.total - 1)
      next.myReaction = null
      return next
    })

    const res = await safeFetch<{ removed: boolean }>(
      `/api/reactions/${encodeURIComponent(postId)}`,
      { method: 'DELETE' }
    )
    setPending(null)
    if (res.error) {
      // Revert
      setData(prev => {
        const next = { ...prev }
        next.counts[prevType] = (next.counts[prevType] || 0) + 1
        next.total = prev.total + 1
        next.myReaction = prevType
        return next
      })
      toast({ title: 'Could not remove reaction', description: res.error, variant: 'destructive' })
    }
  }

  // ── Save toggle ──────────────────────────────────────────────────────────
  async function toggleSave() {
    if (!currentUser) {
      onLogin?.()
      return
    }
    if (!savedLoaded || savePending) return
    setSavePending(true)
    const prev = saved
    setSaved(!prev)

    const res = await safeFetch<{ saved: boolean }>(
      `/api/saves/${encodeURIComponent(postId)}`,
      { method: prev ? 'DELETE' : 'POST' }
    )
    setSavePending(false)
    if (res.error) {
      setSaved(prev)
      toast({ title: prev ? 'Could not unsave' : 'Could not save', description: res.error, variant: 'destructive' })
      return
    }
    if (res.data) {
      setSaved(res.data.saved)
      toast({
        title: res.data.saved ? 'Saved' : 'Removed',
        description: res.data.saved ? 'Post added to your saved list.' : 'Post removed from your saved list.',
      })
    }
  }

  async function handleShareClick() {
    setSharePending(true)
    try {
      await onShare()
    } finally {
      setSharePending(false)
    }
  }

  // Active reaction emoji for the like button label.
  const activeReaction = data.myReaction
    ? REACTIONS.find(r => r.type === data.myReaction)
    : null

  return (
    <div
      className="relative my-8"
      onMouseEnter={!currentUser ? undefined : openPicker}
      onMouseLeave={!currentUser ? undefined : closePicker}
    >
      {/* The engagement bar — a single rounded card with dividers */}
      <div className="glass-card rounded-2xl border border-border/60 px-2 py-1.5 flex items-center gap-1 sm:gap-2">
        {/* Reactions */}
        <div className="relative flex-1 sm:flex-none">
          <button
            onClick={() => {
              if (!currentUser) {
                onLogin?.()
                return
              }
              // On mobile (no hover), clicking the Like button toggles the picker.
              // On desktop, hover opens it — but a click on the button with no
              // existing reaction defaults to LIKE; with an existing reaction it
              // removes it.
              if (activeReaction) {
                removeReaction()
              } else {
                react('LIKE')
              }
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all w-full sm:w-auto justify-center',
              activeReaction
                ? 'bg-evergreen/10 text-evergreen'
                : 'text-foreground/80 hover:bg-muted/60'
            )}
            aria-label={activeReaction ? `Reacted with ${activeReaction.label}, click to remove` : 'React'}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : activeReaction ? (
              <span className="text-base leading-none">{activeReaction.emoji}</span>
            ) : (
              <ThumbsUp className={cn('h-4 w-4', !activeReaction && 'text-evergreen/70')} />
            )}
            <span>
              {activeReaction ? activeReaction.label : 'Like'}
              {data.total > 0 && (
                <span className="ml-1 text-xs tabular-nums text-muted-foreground">
                  · {data.total}
                </span>
              )}
            </span>
          </button>

          {/* Reaction picker — desktop hover, mobile tap-then-click */}
          <AnimatePresence>
            {showReactions && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.85 }}
                transition={{ duration: 0.18 }}
                className="absolute -top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-0.5 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-elevated px-1.5 py-1"
                onMouseEnter={() => {
                  if (hoverTimer.current) window.clearTimeout(hoverTimer.current)
                  setShowReactions(true)
                }}
                onMouseLeave={closePicker}
                role="menu"
              >
                {REACTIONS.map(r => (
                  <motion.button
                    key={r.type}
                    whileHover={{ scale: 1.35, y: -4 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    onClick={() => react(r.type)}
                    className={cn(
                      'inline-flex h-9 w-9 items-center justify-center rounded-full text-xl transition-colors',
                      activeReaction?.type === r.type ? 'bg-evergreen/15 ring-2 ring-evergreen/40' : 'hover:bg-muted'
                    )}
                    aria-label={r.label}
                    title={r.label}
                  >
                    {r.emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden sm:block w-px h-6 bg-border/60" />

        {/* Comments */}
        <button
          onClick={onScrollToComments}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted/60 transition-all"
          aria-label="View comments"
        >
          <MessageCircle className="h-4 w-4 text-evergreen/70" />
          <span>
            Comments
            <span className="ml-1 text-xs tabular-nums text-muted-foreground">
              · {commentCount}
            </span>
          </span>
        </button>

        <div className="hidden sm:block w-px h-6 bg-border/60" />

        {/* Save */}
        <button
          onClick={toggleSave}
          disabled={!savedLoaded || savePending}
          className={cn(
            'flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all',
            saved
              ? 'bg-gold/15 text-gold-dark'
              : 'text-foreground/80 hover:bg-muted/60',
            'disabled:opacity-60 disabled:cursor-not-allowed'
          )}
          aria-label={saved ? 'Saved — click to unsave' : 'Save post'}
          title={saved ? 'Saved' : 'Save'}
        >
          {savePending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Bookmark className="h-4 w-4 fill-current" />
          ) : (
            <Bookmark className="h-4 w-4 text-gold-dark/70" />
          )}
          <span className="hidden sm:inline">
            {saved ? 'Saved' : 'Save'}
          </span>
        </button>

        <div className="hidden sm:block w-px h-6 bg-border/60" />

        {/* Share */}
        <button
          onClick={handleShareClick}
          disabled={sharePending}
          className={cn(
            'flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all',
            'text-foreground/80 hover:bg-muted/60 disabled:opacity-60 disabled:cursor-not-allowed'
          )}
          aria-label="Share post"
        >
          {sharePending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4 text-gold-dark/70" />
          )}
          <span className="hidden sm:inline">Share</span>
        </button>
      </div>

      {/* "Log in to ..." ghost hint when logged out — replaces nothing
          inline (the buttons themselves open login on click) so this
          is just a subtle nudge for clarity. */}
      {!currentUser && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground inline-flex items-center gap-1 whitespace-nowrap">
          <LogIn className="h-3 w-3" /> Log in to react & save
        </div>
      )}
    </div>
  )
}
