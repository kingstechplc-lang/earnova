'use client'
import { useEffect, useState } from 'react'
import { safeFetch } from '@/lib/safe-fetch'

/**
 * useCurrentUser — small client hook for public views that need to know
 * whether the visitor is logged in (and, if so, their id + name).
 *
 * Public views (public-profile-view, public-post-view) don't receive a `user`
 * prop from the page shell — they need to call /api/auth/me themselves to
 * decide whether to show the Follow button / engagement bar / comment box.
 *
 * Returns:
 *   - { loading: true,  user: null,     isOwn: false } while fetching
 *   - { loading: false, user: null,     isOwn: false } when not logged in
 *   - { loading: false, user: {...},    isOwn: <compare user.id === profileUserId> } when logged in
 *
 * Pass `profileUserId` to compute isOwn automatically.
 */
export type CurrentVisitor = {
  id: string
  email: string
  name: string | null
  role: string
}

export function useCurrentUser(profileUserId?: string) {
  const [user, setUser] = useState<CurrentVisitor | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOwn, setIsOwn] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await safeFetch<{ user: CurrentVisitor | null }>('/api/auth/me')
      if (cancelled) return
      if (res.error) {
        // Treat any error (including network) as "not logged in".
        setUser(null)
        setIsOwn(false)
      } else {
        const u = res.data?.user ?? null
        setUser(u)
        setIsOwn(!!u && !!profileUserId && u.id === profileUserId)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [profileUserId])

  return { user, loading, isOwn }
}
