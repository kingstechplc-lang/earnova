'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animated/motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { CountUp } from '@/components/animated/count-up'
import { safeFetch } from '@/lib/safe-fetch'
import {
  Rss, Sparkles, TrendingUp, Clock, Users, RefreshCw, Eye, Heart,
  MessageCircle, Share2, Bookmark, Layers, AlertCircle, Compass,
  LogIn, ArrowRight, Flame,
} from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'

// ── Types (mirror of /api/feed response) ────────────────────────────────────
type FeedPost = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  type: string
  coverImage: string | null
  publishedAt: string | null
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  saveCount: number
  tags: string | null
  author: { id: string; name: string | null; username: string | null; image: string | null }
  page: { id: string; slug: string; title: string } | null
  campaign: { id: string; slug: string; title: string } | null
  categories: Array<{ id: string; slug: string; name: string; icon: string | null; color: string | null }>
}

type FeedResponse = {
  posts: FeedPost[]
  nextCursor: string | null
  message?: string
}

type Tab = 'for-you' | 'following' | 'trending' | 'latest'

const TABS: Array<{ value: Tab; label: string; icon: React.ReactNode }> = [
  { value: 'for-you',   label: 'For You',   icon: <Sparkles className="h-3.5 w-3.5" /> },
  { value: 'following', label: 'Following', icon: <Users className="h-3.5 w-3.5" /> },
  { value: 'trending', label: 'Trending',   icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { value: 'latest',   label: 'Latest',    icon: <Clock className="h-3.5 w-3.5" /> },
]

const POST_TYPE_EMOJI: Record<string, string> = {
  TEXT: '📝', ARTICLE: '📰', IMAGE: '🖼️', GALLERY: '🎨', VIDEO: '🎬',
  LINK: '🔗', POLL: '📊', EVENT: '📅', ANNOUNCEMENT: '📢',
  QUESTION: '❓', QUIZ: '🧠', CARD: '🎴',
}

// ── Component ───────────────────────────────────────────────────────────────
export default function FeedView({
  navigate, user, initialTab,
}: {
  navigate: (v: View) => void
  user: CurrentUser | null
  initialTab?: string
}) {
  // Validate initialTab against the known tab list; fall back to 'for-you'.
  const initialValidTab: Tab = TABS.some(t => t.value === initialTab)
    ? (initialTab as Tab)
    : 'for-you'

  const [tab, setTab] = useState<Tab>(initialValidTab)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // ── Sync URL hash to tab (replaceState so it doesn't spam history) ─────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const target = `#/feed?tab=${tab}`
    if (window.location.hash !== target) {
      const newUrl = `${window.location.pathname}${window.location.search}${target}`
      window.history.replaceState(null, '', newUrl)
    }
  }, [tab])

  // ── Fetch posts when tab changes ────────────────────────────────────────
  const fetchPosts = useCallback(async (t: Tab, cursor?: string) => {
    const params = new URLSearchParams({ tab: t, limit: '20' })
    if (cursor) params.set('cursor', cursor)
    return safeFetch<FeedResponse>(`/api/feed?${params.toString()}`)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      setMessage(null)
      setPosts([])
      setNextCursor(null)
      const res = await fetchPosts(tab)
      if (cancelled) return
      if (res.error) {
        setError(res.error)
      } else if (res.data) {
        setPosts(res.data.posts || [])
        setNextCursor(res.data.nextCursor)
        if (res.data.message) setMessage(res.data.message)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [tab, fetchPosts])

  // ── Load more (infinite scroll trigger) ────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !nextCursor) return
    setLoadingMore(true)
    const res = await fetchPosts(tab, nextCursor)
    if (res.data) {
      setPosts(prev => [...prev, ...(res.data!.posts || [])])
      setNextCursor(res.data.nextCursor)
    } else if (res.error) {
      setError(res.error)
    }
    setLoadingMore(false)
  }, [tab, nextCursor, loadingMore, fetchPosts])

  // ── Infinite scroll observer ────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && nextCursor && !loadingMore && !loading) {
            loadMore()
          }
        }
      },
      { rootMargin: '400px 0px', threshold: 0 }
    )
    observerRef.current.observe(sentinel)
    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [nextCursor, loadingMore, loading, loadMore])

  // ── Pull-to-refresh: refetch from scratch ────────────────────────────────
  async function refresh() {
    if (refreshing) return
    setRefreshing(true)
    setError(null)
    const res = await fetchPosts(tab)
    if (res.data) {
      setPosts(res.data.posts || [])
      setNextCursor(res.data.nextCursor)
      if (res.data.message) setMessage(res.data.message)
    } else if (res.error) {
      setError(res.error)
    }
    setRefreshing(false)
  }

  // ── Following tab + not logged in → show login CTA ──────────────────────
  const showFollowingLoginCta = tab === 'following' && !user

  return (
    <div className="relative min-h-screen">
      {/* Ambient background layer */}
      <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" aria-hidden />
      <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-3xl">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <FadeIn>
          <div className="relative flex flex-wrap items-end justify-between gap-4 mb-6">
            <div className="absolute -inset-x-3 -inset-y-4 rounded-3xl bg-gradient-to-br from-evergreen/8 via-gold/4 to-berry/5 pointer-events-none" aria-hidden />
            <div className="relative">
              <Badge variant="outline" className="mb-2 border-gold/40 text-gold-dark bg-gold/5 glass-strong">
                <Rss className="h-3 w-3 mr-1" /> Feed
              </Badge>
              <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
                <span className="gradient-text-evergreen">Your Feed</span>
              </h1>
              <p className="text-muted-foreground mt-1">
                Fresh posts from creators you love.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={refreshing}
              className="border-evergreen/30 text-evergreen hover:bg-evergreen/5 btn-glow overflow-hidden"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </FadeIn>

        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <FadeIn delay={0.1}>
          <div className="mb-6 sticky top-2 z-20">
            <div className="relative inline-flex flex-wrap gap-1 p-1 rounded-full bg-card/80 backdrop-blur-md border border-border/50 shadow-sm">
              {TABS.map(t => {
                const active = tab === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => setTab(t.value)}
                    className={`relative inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                      active
                        ? 'bg-evergreen text-cream shadow-festive'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }`}
                    aria-pressed={active}
                  >
                    {t.icon}
                    {t.label}
                    {active && (
                      <motion.span
                        layoutId="feed-tab-underline"
                        className="absolute -bottom-1 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-evergreen via-gold to-berry"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </FadeIn>

        {/* ── Following tab login CTA ───────────────────────────────────── */}
        {showFollowingLoginCta && (
          <Card className="border-dashed border-evergreen/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-evergreen/10 to-gold/8 text-evergreen/70 mb-3"
              >
                <LogIn className="h-6 w-6" />
              </motion.div>
              <p className="font-medium text-foreground mb-1">Log in to see posts from creators you follow</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                Follow creators and their new posts will show up here in real time.
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Button
                  onClick={() => navigate({ name: 'login' })}
                  className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
                >
                  <LogIn className="h-4 w-4 mr-1.5" /> Log in
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate({ name: 'explore' })}
                  className="border-evergreen/30 text-evergreen hover:bg-evergreen/5"
                >
                  <Compass className="h-4 w-4 mr-1.5" /> Explore creators
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Loading skeleton ───────────────────────────────────────────── */}
        {loading && !showFollowingLoginCta && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 rounded-xl shimmer-bg" />
            ))}
          </div>
        )}

        {/* ── Error state ─────────────────────────────────────────────────── */}
        {!loading && error && (
          <Card className="border-dashed border-cranberry/40">
            <CardContent className="py-12 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cranberry/10 mb-3">
                <AlertCircle className="h-5 w-5 text-cranberry" />
              </div>
              <p className="font-medium text-foreground mb-1">Couldn&apos;t load feed</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                className="border-cranberry/30 text-cranberry hover:bg-cranberry/5 btn-glow overflow-hidden"
              >
                <RefreshCw className="h-4 w-4 mr-1.5" /> Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Empty states per tab ───────────────────────────────────────── */}
        {!loading && !error && !showFollowingLoginCta && posts.length === 0 && (
          <FeedEmptyState tab={tab} navigate={navigate} message={message || undefined} />
        )}

        {/* ── Message (e.g. "Log in to see posts from creators you follow") ─ */}
        {!loading && !error && !showFollowingLoginCta && posts.length > 0 && message && (
          <Card className="mb-4 border-gold/30 bg-gold/5">
            <CardContent className="py-3 px-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold-dark flex-shrink-0" />
              <p className="text-sm text-foreground">{message}</p>
            </CardContent>
          </Card>
        )}

        {/* ── Post feed ───────────────────────────────────────────────────── */}
        {!loading && !error && !showFollowingLoginCta && posts.length > 0 && (
          <>
            <StaggerContainer className="grid gap-4">
              {posts.map(p => (
                <StaggerItem key={p.id} y={15}>
                  <FeedPostCard post={p} navigate={navigate} />
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4 w-full" aria-hidden />

            {/* "Loading more…" spinner */}
            {loadingMore && (
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span className="h-4 w-4 border-2 border-evergreen/30 border-t-evergreen rounded-full animate-spin" />
                Loading more…
              </div>
            )}

            {/* End-of-feed marker */}
            {!nextCursor && !loadingMore && posts.length > 0 && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 backdrop-blur-sm border border-border/50 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-gold-dark" />
                  You&apos;re all caught up
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function FeedPostCard({ post, navigate }: { post: FeedPost; navigate: (v: View) => void }) {
  const typeEmoji = POST_TYPE_EMOJI[post.type] || '📄'
  const authorName = post.author.name || post.author.username || 'Anonymous'
  const publishedDate = post.publishedAt
    ? formatRelativeTime(new Date(post.publishedAt))
    : null

  return (
    <Card
      className="overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 hover:border-evergreen/30 bg-card/80 backdrop-blur-sm cursor-pointer"
      onClick={() => post.author.username && navigate({
        name: 'public-post',
        postId: post.id,
        username: post.author.username,
        slug: post.slug,
      })}
    >
      <div className="h-1 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />

      {post.coverImage && (
        <div className="relative h-44 sm:h-56 overflow-hidden bg-muted/30">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-card/10 to-transparent" />
        </div>
      )}

      <CardContent className="p-4 sm:p-5">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] bg-evergreen/5 text-evergreen border-evergreen/30">
            <span className="mr-0.5">{typeEmoji}</span>{post.type}
          </Badge>
          {post.categories.slice(0, 2).map(c => (
            <Badge key={c.id} variant="outline" className="text-[10px] bg-gold/8 text-gold-dark border-gold/30">
              {c.icon && <span className="mr-0.5">{c.icon}</span>}{c.name}
            </Badge>
          ))}
          {post.campaign && (
            <Badge variant="outline" className="text-[10px] bg-berry/8 text-berry border-berry/30">
              <Flame className="h-2.5 w-2.5 mr-1" /> {post.campaign.title}
            </Badge>
          )}
        </div>

        {/* Title + excerpt */}
        <h3 className="font-serif text-lg sm:text-xl font-bold leading-snug mb-1 line-clamp-2">
          {post.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {post.excerpt || 'No excerpt available.'}
        </p>

        {/* Author row */}
        <div className="flex items-center gap-2 mb-3">
          {post.author.image ? (
            <img
              src={post.author.image}
              alt={authorName}
              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-evergreen to-evergreen-dark text-cream text-xs font-bold flex-shrink-0">
              {authorName[0]?.toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (post.author.username) {
                  navigate({ name: 'public-profile', username: post.author.username })
                }
              }}
              className="block text-left min-w-0 w-full hover:text-evergreen transition-colors"
            >
              <span className="block text-xs font-medium truncate">{authorName}</span>
              {post.author.username && (
                <span className="block text-[10px] text-muted-foreground truncate">
                  @{post.author.username}
                </span>
              )}
            </button>
          </div>
          {publishedDate && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
              <Clock className="h-2.5 w-2.5" /> {publishedDate}
            </span>
          )}
        </div>

        {/* Engagement pills */}
        <div className="flex items-center gap-2.5 pt-3 border-t border-border/40 text-xs text-muted-foreground flex-wrap">
          <span className="inline-flex items-center gap-1" title="Views">
            <Eye className="h-3.5 w-3.5" /> <CountUp value={post.viewCount} duration={1200} />
          </span>
          <span className="inline-flex items-center gap-1" title="Likes">
            <Heart className="h-3.5 w-3.5" /> <CountUp value={post.likeCount} duration={1200} />
          </span>
          <span className="inline-flex items-center gap-1" title="Comments">
            <MessageCircle className="h-3.5 w-3.5" /> <CountUp value={post.commentCount} duration={1200} />
          </span>
          <span className="inline-flex items-center gap-1" title="Shares">
            <Share2 className="h-3.5 w-3.5" /> <CountUp value={post.shareCount} duration={1200} />
          </span>
          <span className="inline-flex items-center gap-1" title="Saves">
            <Bookmark className="h-3.5 w-3.5" /> <CountUp value={post.saveCount} duration={1200} />
          </span>
          {post.page && (
            <span className="inline-flex items-center gap-1 text-evergreen/70 ml-auto" title={`Belongs to ${post.page.title}`}>
              <Layers className="h-3 w-3" /> {post.page.title}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function FeedEmptyState({
  tab, navigate, message,
}: {
  tab: Tab
  navigate: (v: View) => void
  message?: string
}) {
  const config: Record<Tab, { icon: React.ReactNode; title: string; body: string; cta?: { label: string; target: View } }> = {
    'for-you': {
      icon: <Sparkles className="h-6 w-6" />,
      title: 'No posts to show yet',
      body: 'Try following some creators to personalize your For You feed.',
      cta: { label: 'Explore →', target: { name: 'explore' } },
    },
    following: {
      icon: <Users className="h-6 w-6" />,
      title: "You're not following anyone yet",
      body: 'Explore creators and follow them to see their new posts here.',
      cta: { label: 'Explore creators →', target: { name: 'explore' } },
    },
    trending: {
      icon: <TrendingUp className="h-6 w-6" />,
      title: 'No trending posts right now',
      body: 'The trending shelf refreshes every hour — check back later!',
    },
    latest: {
      icon: <Clock className="h-6 w-6" />,
      title: 'No posts yet',
      body: 'Be the first to publish on Earnova!',
      cta: { label: 'Create a post →', target: { name: 'post-editor' } },
    },
  }
  const c = config[tab]
  return (
    <Card className="border-dashed border-evergreen/30 bg-card/60 backdrop-blur-sm">
      <CardContent className="py-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-evergreen/10 to-gold/8 text-evergreen/70 mb-3"
        >
          {c.icon}
        </motion.div>
        <p className="font-medium text-foreground mb-1">{c.title}</p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
          {message || c.body}
        </p>
        {c.cta && (
          <Button
            onClick={() => navigate(c.cta!.target)}
            className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
          >
            {c.cta.label}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatRelativeTime(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
