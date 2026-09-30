'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { safeFetch } from '@/lib/safe-fetch'
import { FollowButton } from './follow-button'
import type { CurrentVisitor } from './use-current-user'
import { Loader2, Users, UserCheck, ChevronRight } from 'lucide-react'

/**
 * FollowersDialog — a modal listing a creator's followers + following.
 *
 * Two tabs: "Followers" (people who follow this creator) and "Following"
 * (people the creator follows). Each row is a user card with avatar,
 * name, @username, and (for logged-in visitors who aren't viewing their
 * own profile) a per-user Follow button.
 *
 * Uses cursor pagination — a "Load more" button appends the next page.
 * Pre-fetches both counts on dialog open (for the tab labels) and the
 * first page of whichever tab is active.
 *
 * On any row click, calls onNavigate(username) so the parent can route
 * to that profile.
 */
type UserRow = {
  id: string
  name: string | null
  username: string | null
  image: string | null
  bio: string | null
}

type TabKey = 'followers' | 'following'

export function FollowersDialog({
  open,
  onOpenChange,
  username,
  profileUserId,
  currentUser,
  initialFollowersCount,
  initialFollowingCount,
  defaultTab = 'followers',
  onNavigate,
  onLogin,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  username: string
  profileUserId: string
  currentUser: CurrentVisitor | null
  initialFollowersCount: number
  initialFollowingCount: number
  defaultTab?: TabKey
  onNavigate: (username: string) => void
  onLogin?: () => void
}) {
  const [tab, setTab] = useState<TabKey>(defaultTab)
  const [items, setItems] = useState<UserRow[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  // Start in the loading state so the first dialog open shows a spinner
  // (not an empty "No followers yet" placeholder) while the fetch is in
  // flight. Subsequent tab switches bump loading back to true from inside
  // the async IIFE.
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  // Local follow-state per row, so we can render the FollowButton with the
  // correct initial state. The FollowButton manages its own optimistic UI
  // after the first render — this map is just for the initial seed.
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({})

  // Derived-state pattern (per React docs) to sync `tab` with `defaultTab`
  // when the parent requests a different starting tab. Doing this in render
  // (rather than inside useEffect) avoids the cascading-renders lint warning
  // and is the canonical way to "adjust state when a prop changes".
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [lastDefaultTab, setLastDefaultTab] = useState<TabKey>(defaultTab)
  if (defaultTab !== lastDefaultTab) {
    setLastDefaultTab(defaultTab)
    setTab(defaultTab)
  }

  // Reset everything when the dialog opens or the tab changes.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      setItems([])
      setCursor(null)
      const url = `/api/${tab}/${encodeURIComponent(username)}?limit=20`
      const res = await safeFetch<{ nextCursor: string | null; [k: string]: any }>(url)
      if (cancelled) return
      if (res.error) {
        setError(res.error)
      } else if (res.data) {
        const rows = (res.data[tab] as UserRow[]) || []
        setItems(rows)
        setCursor(res.data.nextCursor ?? null)
        // On the "following" tab, every row is one the visitor follows.
        if (tab === 'following' && currentUser) {
          setFollowMap(prev => {
            const next = { ...prev }
            for (const r of rows) if (r.username) next[r.username] = true
            return next
          })
        }
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [open, tab, username, currentUser])

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    const url = `/api/${tab}/${encodeURIComponent(username)}?limit=20&cursor=${cursor}`
    const res = await safeFetch<{ nextCursor: string | null; [k: string]: any }>(url)
    setLoadingMore(false)
    if (res.error) {
      setError(res.error)
      return
    }
    if (res.data) {
      const rows = (res.data[tab] as UserRow[]) || []
      setItems(prev => [...prev, ...rows])
      setCursor(res.data.nextCursor ?? null)
    }
  }, [cursor, loadingMore, tab, username])

  const handleRowFollowChange = useCallback((rowUsername: string, following: boolean) => {
    setFollowMap(prev => ({ ...prev, [rowUsername]: following }))
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tab === 'followers' ? <Users className="h-4 w-4 text-evergreen" /> : <UserCheck className="h-4 w-4 text-evergreen" />}
            @{username}
          </DialogTitle>
          <DialogDescription>
            {tab === 'followers'
              ? `People following @${username}`
              : `People @${username} follows`}
          </DialogDescription>
        </DialogHeader>

        {/* Tabs — we hand-roll these to control styling */}
        <div className="flex p-1 bg-muted/60 rounded-lg gap-1">
          <button
            onClick={() => setTab('followers')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              tab === 'followers' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Followers
            <span className="ml-1 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full bg-evergreen/10 text-evergreen">
              {initialFollowersCount}
            </span>
          </button>
          <button
            onClick={() => setTab('following')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              tab === 'following' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Following
            <span className="ml-1 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full bg-evergreen/10 text-evergreen">
              {initialFollowingCount}
            </span>
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1 min-h-[200px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mb-2" />
              <span className="text-sm">Loading {tab}…</span>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-cranberry">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                {tab === 'followers' ? <Users className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
              </div>
              <p className="text-sm font-medium mb-0.5">No {tab} yet</p>
              <p className="text-xs text-muted-foreground">
                {tab === 'followers' ? 'When people follow this creator, they will appear here.' : 'When this creator follows people, they will appear here.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              <AnimatePresence initial={false}>
                {items.map(user => {
                  const name = user.name || user.username || 'Anonymous'
                  const initial = name[0]?.toUpperCase() || '?'
                  const rowFollowing = followMap[user.username || ''] ?? false
                  return (
                    <motion.li
                      key={user.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="group flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition-colors"
                    >
                      <button
                        onClick={() => user.username && onNavigate(user.username)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        disabled={!user.username}
                      >
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={name}
                            className="h-9 w-9 rounded-full object-cover border border-border flex-shrink-0"
                          />
                        ) : (
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-evergreen to-evergreen-dark text-cream text-sm font-bold flex-shrink-0">
                            {initial}
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium truncate group-hover:text-evergreen transition-colors">
                            {name}
                          </span>
                          {user.username && (
                            <span className="block text-xs text-muted-foreground truncate group-hover:text-evergreen/70 transition-colors">
                              @{user.username}
                            </span>
                          )}
                          {user.bio && (
                            <span className="block text-xs text-muted-foreground/80 line-clamp-1 mt-0.5">
                              {user.bio}
                            </span>
                          )}
                        </span>
                      </button>
                      {currentUser && user.username && user.id !== currentUser.id && (
                        <FollowButton
                          username={user.username}
                          initialFollowing={rowFollowing}
                          currentUser={currentUser}
                          variant="list"
                          onFollowingChange={(f) => handleRowFollowChange(user.username!, f)}
                        />
                      )}
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>
          )}
        </div>

        {/* Load more / footer */}
        {cursor && !loading && !error && (
          <div className="pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full text-evergreen hover:bg-evergreen/5"
            >
              {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <ChevronRight className="h-3.5 w-3.5 mr-1" />}
              Load more
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
