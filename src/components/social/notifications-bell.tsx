'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { safeFetch } from '@/lib/safe-fetch'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/relative-time'
import type { CurrentUser } from '@/app/page'
import {
  Bell, BellOff, CheckCheck, Loader2,
} from 'lucide-react'

/**
 * NotificationsBell — header dropdown for viewing + acknowledging
 * notifications.
 *
 * Behavior:
 *   - Polls /api/notifications/unread-count every 60s (and on mount).
 *     Renders a gold badge on the bell with the unread count when > 0.
 *   - On click, opens a dropdown showing the latest 10 notifications.
 *     Each notification shows actor avatar, title, body (truncated),
 *     relative time, and a gold dot on the left if unread.
 *   - Clicking a notification marks it as read (PATCH /api/notifications/[id])
 *     and (if the notification is about a post or comment) the user can
 *     dismiss the dropdown.
 *   - "Mark all as read" button at the bottom calls PATCH /api/notifications
 *     with no body (server marks all as read).
 *   - Closes on outside click via a window mousedown listener.
 *   - If not logged in (user prop null), the bell is not rendered at all.
 *
 * `onNavigateToPost` and `onNavigateToProfile` are optional callbacks the
 * parent can wire up so clicking a notification can deep-link to the
 * relevant view.
 */
type NotificationActor = {
  id: string
  name: string | null
  username: string | null
  image: string | null
} | null

type Notification = {
  id: string
  type: string
  userId: string
  actorId: string | null
  entityId: string | null
  entityType: string | null
  title: string
  body: string | null
  read: boolean
  readAt: string | null
  createdAt: string
  actor: NotificationActor
}

type UnreadCountResponse = { count: number }
type ListResponse = { notifications: Notification[]; nextCursor: string | null }

export function NotificationsBell({
  user,
  onNavigateToPost,
  onNavigateToProfile,
  className,
}: {
  user: CurrentUser
  onNavigateToPost?: (postId: string) => void
  onNavigateToProfile?: (username: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<Notification[]>([])
  // Start in the loading state so the very first dropdown open shows a
  // spinner rather than the "all caught up" empty state for a frame.
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [markingOne, setMarkingOne] = useState<string | null>(null)
  // The bell wrapper — used to detect outside clicks for closing.
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // ── Poll unread count on mount + every 60s ───────────────────────────────
  useEffect(() => {
    if (!user) return
    let cancelled = false

    const tick = async () => {
      const res = await safeFetch<UnreadCountResponse>('/api/notifications/unread-count')
      if (cancelled) return
      if (!res.error && res.data) {
        setUnread(res.data.count || 0)
      }
    }
    tick()
    const interval = window.setInterval(tick, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [user])

  // ── Fetch notifications when the dropdown opens ──────────────────────────
  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await safeFetch<ListResponse>('/api/notifications?limit=10')
      if (cancelled) return
      if (!res.error && res.data) {
        setItems(res.data.notifications)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [open])

  // ── Close on outside click + on Escape ────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  // ── Navigate based on notification entity (post → public-post view, etc.) ─
  const maybeNavigate = useCallback((n: Notification) => {
    if (n.entityType === 'post' && n.entityId && onNavigateToPost) {
      setOpen(false)
      onNavigateToPost(n.entityId)
    } else if (n.entityType === 'user' && n.actor?.username && onNavigateToProfile) {
      setOpen(false)
      onNavigateToProfile(n.actor.username)
    }
  }, [onNavigateToPost, onNavigateToProfile])

  // ── Mark one as read ──────────────────────────────────────────────────────
  const markRead = useCallback(async (n: Notification) => {
    if (n.read) {
      // Already read — just attempt to navigate (if applicable).
      maybeNavigate(n)
      return
    }
    setMarkingOne(n.id)
    // Optimistic local update
    setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true, readAt: new Date().toISOString() } : x))
    setUnread(prev => Math.max(0, prev - 1))

    const res = await safeFetch(`/api/notifications/${encodeURIComponent(n.id)}`, { method: 'PATCH' })
    setMarkingOne(null)
    if (res.error) {
      // Revert
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: false, readAt: null } : x))
      setUnread(prev => prev + 1)
      toast({ title: 'Could not mark notification', description: res.error, variant: 'destructive' })
      return
    }
    maybeNavigate(n)
  }, [maybeNavigate])

  // ── Mark all as read ──────────────────────────────────────────────────────
  async function markAllRead() {
    if (markingAll || unread === 0) return
    setMarkingAll(true)
    // Optimistic
    const previousItems = items.map(x => ({ ...x }))
    setItems(prev => prev.map(x => ({ ...x, read: true, readAt: new Date().toISOString() })))
    setUnread(0)
    const res = await safeFetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setMarkingAll(false)
    if (res.error) {
      // Revert
      setItems(previousItems)
      const count = previousItems.filter(x => !x.read).length
      setUnread(count)
      toast({ title: 'Could not mark all as read', description: res.error, variant: 'destructive' })
      return
    }
    toast({ title: 'All caught up!', description: 'Marked all as read.' })
  }

  const displayCount = unread > 99 ? '99+' : String(unread)

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={unread > 0 ? `Notifications — ${unread} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
          open
            ? 'bg-evergreen/10 text-evergreen'
            : 'text-foreground/70 hover:text-foreground hover:bg-muted/60'
        )}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <motion.span
            key={displayCount}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-cranberry text-cream text-[9px] font-bold tabular-nums ring-2 ring-background"
          >
            {displayCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="fixed right-2 left-2 top-16 sm:absolute sm:left-auto sm:top-full sm:right-0 sm:w-[min(92vw,22rem)] origin-top-right z-50 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-elevated overflow-hidden"
            role="dialog"
            aria-label="Notifications"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60 bg-gradient-to-r from-evergreen/5 to-gold/5">
              <div className="flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-evergreen" />
                <span className="text-sm font-semibold">Notifications</span>
                {unread > 0 && (
                  <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full bg-cranberry/15 text-cranberry">
                    {displayCount} new
                  </span>
                )}
              </div>
              <button
                onClick={markAllRead}
                disabled={markingAll || unread === 0}
                className="inline-flex items-center gap-1 text-xs text-evergreen hover:bg-evergreen/10 px-2 py-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Mark all as read"
              >
                {markingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                Mark all
              </button>
            </div>

            {/* List */}
            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center py-10 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mb-2" />
                  <span className="text-sm">Loading notifications…</span>
                </div>
              ) : items.length === 0 ? (
                <div className="py-10 text-center px-6">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                    <BellOff className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium mb-0.5">You&apos;re all caught up</p>
                  <p className="text-xs text-muted-foreground">
                    Notifications about new followers, comments, and reactions will appear here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  <AnimatePresence initial={false}>
                    {items.map(n => (
                      <NotificationRow
                        key={n.id}
                        n={n}
                        marking={markingOne === n.id}
                        onClick={() => markRead(n)}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/60 bg-muted/30 px-3 py-2 text-center">
              <span className="text-[11px] text-muted-foreground">
                Showing latest {items.length || 0} notification{items.length === 1 ? '' : 's'} ·
                unread count refreshes every 60s
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Single notification row ────────────────────────────────────────────────
function NotificationRow({
  n,
  marking,
  onClick,
}: {
  n: Notification
  marking: boolean
  onClick: () => void
}) {
  const actorName = n.actor?.name || n.actor?.username || 'Earnova'
  const actorInitial = actorName[0]?.toUpperCase() || 'E'
  const clickable = n.entityType === 'post' || n.entityType === 'user' || n.entityType === 'comment'

  return (
    <li>
      <button
        onClick={onClick}
        disabled={marking}
        className={cn(
          'w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors disabled:cursor-not-allowed',
          n.read ? 'hover:bg-muted/40' : 'bg-gold/5 hover:bg-gold/10',
          clickable && 'cursor-pointer'
        )}
      >
        {/* Unread indicator */}
        <span className="mt-1.5 flex-shrink-0 self-start">
          {n.read ? (
            <span className="block h-1.5 w-1.5 rounded-full bg-transparent" />
          ) : (
            <motion.span
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="block h-2 w-2 rounded-full bg-gold shadow-[0_0_6px_rgba(212,164,55,0.6)]"
            />
          )}
        </span>

        {/* Actor avatar */}
        <span className="flex-shrink-0">
          {n.actor?.image ? (
            <img
              src={n.actor.image}
              alt={actorName}
              className="h-8 w-8 rounded-full object-cover border border-border"
            />
          ) : (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-evergreen to-evergreen-dark text-cream text-xs font-bold">
              {actorInitial}
            </span>
          )}
        </span>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm leading-snug', !n.read && 'font-medium')}>
            {n.title}
          </p>
          {n.body && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {n.body}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            {relativeTime(n.createdAt)}
          </p>
        </div>

        {/* Pending spinner */}
        {marking && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground flex-shrink-0 mt-1.5" />
        )}
      </button>
    </li>
  )
}
