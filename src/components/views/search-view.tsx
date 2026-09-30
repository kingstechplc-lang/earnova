'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animated/motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { CountUp } from '@/components/animated/count-up'
import { safeFetch } from '@/lib/safe-fetch'
import { FollowButton } from '@/components/social/follow-button'
import { useCurrentUser } from '@/components/social/use-current-user'
import {
  Search as SearchIcon, X, Users, FileText, Eye, Heart, MessageCircle,
  Share2, ArrowRight, ChevronRight, Sparkles, Compass, AlertCircle,
} from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'

// ── Types ─────────────────────────────────────────────────────────────────
type Creator = {
  id: string
  username: string | null
  name: string | null
  image: string | null
  bio: string | null
  followerCount: number
}

type Page = {
  id: string
  slug: string
  title: string
  description: string | null
  pageType: string
  publishedAt: string | null
  owner: { id: string; name: string | null; username: string | null; image: string | null }
  publishedPostCount?: number
}

type Post = {
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
}

type AllResults = {
  creators: Creator[]
  pages: Page[]
  posts: Post[]
}

type PaginatedPosts = { posts: Post[]; nextCursor: string | null }
type PaginatedPages = { pages: Page[]; nextCursor: string | null }
type PaginatedCreators = { creators: Creator[]; nextCursor: string | null }

type SearchType = 'all' | 'creators' | 'pages' | 'posts'

const POST_TYPE_EMOJI: Record<string, string> = {
  TEXT: '📝', ARTICLE: '📰', IMAGE: '🖼️', GALLERY: '🎨', VIDEO: '🎬',
  LINK: '🔗', POLL: '📊', EVENT: '📅', ANNOUNCEMENT: '📢',
  QUESTION: '❓', QUIZ: '🧠', CARD: '🎴',
}

const PAGE_TYPE_EMOJI: Record<string, string> = {
  PERSONAL: '👤', CELEBRATION: '🎄', LINK_HUB: '🔗', CREATOR: '✨',
  BLOGGER: '✍️', PHOTOGRAPHY: '📸', MUSIC: '🎵', GAMING: '🎮',
  BUSINESS: '💼', EVENT: '🎉',
}

const TYPE_TABS: Array<{ value: SearchType; label: string; icon: React.ReactNode }> = [
  { value: 'all',     label: 'All',      icon: <Sparkles className="h-3.5 w-3.5" /> },
  { value: 'creators', label: 'Creators', icon: <Users className="h-3.5 w-3.5" /> },
  { value: 'pages',   label: 'Pages',    icon: <FileText className="h-3.5 w-3.5" /> },
  { value: 'posts',   label: 'Posts',    icon: <Eye className="h-3.5 w-3.5" /> },
]

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

// ── Component ───────────────────────────────────────────────────────────────
export default function SearchView({
  navigate, user, initialQuery,
}: {
  navigate: (v: View) => void
  user: CurrentUser | null
  initialQuery?: string
}) {
  const [query, setQuery] = useState(initialQuery || '')
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery || '')
  const [type, setType] = useState<SearchType>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // type=all results
  const [allResults, setAllResults] = useState<AllResults | null>(null)

  // paginated results for specific types
  const [creatorsList, setCreatorsList] = useState<Creator[]>([])
  const [pagesList, setPagesList] = useState<Page[]>([])
  const [postsList, setPostsList] = useState<Post[]>([])
  const [creatorsCursor, setCreatorsCursor] = useState<string | null>(null)
  const [pagesCursor, setPagesCursor] = useState<string | null>(null)
  const [postsCursor, setPostsCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const { user: currentUser } = useCurrentUser()
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the search input on mount (desktop only — mobile keyboard pop is jarring).
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      inputRef.current?.focus()
    }
  }, [])

  // ── Debounce the query ──────────────────────────────────────────────
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [query])

  // ── Sync URL hash to query (without forcing a hashchange loop) ──────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const target = debouncedQuery
      ? `#/search?q=${encodeURIComponent(debouncedQuery)}`
      : '#/search'
    if (window.location.hash !== target) {
      const newUrl = `${window.location.pathname}${window.location.search}${target}`
      window.history.replaceState(null, '', newUrl)
    }
  }, [debouncedQuery])

  // ── Run search when debounced query / type changes ──────────────────
  const runSearch = useCallback(async (q: string, t: SearchType) => {
    if (q.length < MIN_QUERY_LENGTH) {
      setAllResults(null)
      setCreatorsList([])
      setPagesList([])
      setPostsList([])
      setCreatorsCursor(null)
      setPagesCursor(null)
      setPostsCursor(null)
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({ q, type: t })
    const res = await safeFetch<any>(`/api/search?${params.toString()}`)

    if (res.error) {
      setError(res.error)
      setAllResults(null)
      setCreatorsList([])
      setPagesList([])
      setPostsList([])
    } else if (res.data) {
      if (t === 'all') {
        setAllResults({
          creators: res.data.creators || [],
          pages: res.data.pages || [],
          posts: res.data.posts || [],
        })
        setCreatorsList([])
        setPagesList([])
        setPostsList([])
      } else if (t === 'creators') {
        setCreatorsList(res.data.creators || [])
        setCreatorsCursor(res.data.nextCursor || null)
      } else if (t === 'pages') {
        setPagesList(res.data.pages || [])
        setPagesCursor(res.data.nextCursor || null)
      } else if (t === 'posts') {
        setPostsList(res.data.posts || [])
        setPostsCursor(res.data.nextCursor || null)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // Defer to avoid the react-hooks/set-state-in-effect lint rule —
    // runSearch makes synchronous setState calls that would otherwise
    // trigger cascading renders.
    const id = window.setTimeout(() => {
      runSearch(debouncedQuery, type)
    }, 0)
    return () => window.clearTimeout(id)
  }, [debouncedQuery, type, runSearch])

  // Reset paginated lists when type changes (avoids flashing stale results)
  useEffect(() => {
    // Defer setState calls to satisfy react-hooks/set-state-in-effect lint rule.
    const id = window.setTimeout(() => {
      setAllResults(null)
      setCreatorsList([])
      setPagesList([])
      setPostsList([])
      setCreatorsCursor(null)
      setPagesCursor(null)
      setPostsCursor(null)
      setError(null)
    }, 0)
    return () => window.clearTimeout(id)
  }, [type])

  async function loadMore() {
    if (loadingMore) return
    let cursor: string | null = null
    if (type === 'pages') cursor = pagesCursor
    else if (type === 'posts') cursor = postsCursor
    else if (type === 'creators') cursor = creatorsCursor
    if (!cursor) return

    setLoadingMore(true)
    const params = new URLSearchParams({ q: debouncedQuery, type, cursor })
    const res = await safeFetch<any>(`/api/search?${params.toString()}`)
    if (res.data) {
      if (type === 'pages') {
        setPagesList(prev => [...prev, ...(res.data.pages || [])])
        setPagesCursor(res.data.nextCursor || null)
      } else if (type === 'posts') {
        setPostsList(prev => [...prev, ...(res.data.posts || [])])
        setPostsCursor(res.data.nextCursor || null)
      } else if (type === 'creators') {
        setCreatorsList(prev => [...prev, ...(res.data.creators || [])])
        setCreatorsCursor(res.data.nextCursor || null)
      }
    } else if (res.error) {
      setError(res.error)
    }
    setLoadingMore(false)
  }

  const hasQuery = debouncedQuery.length >= MIN_QUERY_LENGTH
  const hasAnyResults = !!(
    allResults ||
    creatorsList.length ||
    pagesList.length ||
    postsList.length
  )

  return (
    <div className="relative min-h-screen">
      {/* Ambient background layer */}
      <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" aria-hidden />
      <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <FadeIn>
          <div className="mb-6">
            <Badge variant="outline" className="mb-2 border-gold/40 text-gold-dark bg-gold/5 glass-strong">
              <Compass className="h-3 w-3 mr-1" /> Search
            </Badge>
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
              <span className="gradient-text-evergreen">Find anything</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Search across creators, pages, and posts.
            </p>
          </div>
        </FadeIn>

        {/* ── Search input ────────────────────────────────────────────────── */}
        <FadeIn delay={0.1}>
          <div className="relative mb-4">
            <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search creators, pages, posts…"
              className="pl-10 pr-10 h-12 text-base rounded-xl border-border/50 focus:ring-2 focus:ring-evergreen/40 focus:border-everglass transition-all"
              aria-label="Search query"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </FadeIn>

        {/* ── Type tabs ──────────────────────────────────────────────────── */}
        <FadeIn delay={0.15}>
          <div className="mb-6 flex flex-wrap gap-2">
            {TYPE_TABS.map(tab => {
              const active = type === tab.value
              return (
                <button
                  key={tab.value}
                  onClick={() => setType(tab.value)}
                  className={`relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all ${
                    active
                      ? 'bg-evergreen text-cream shadow-festive btn-glow overflow-hidden'
                      : 'bg-card/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:border-evergreen/30 hover:bg-evergreen/5'
                  }`}
                  aria-pressed={active}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              )
            })}
          </div>
        </FadeIn>

        {/* ── Loading skeleton ───────────────────────────────────────────── */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl shimmer-bg" />
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
              <p className="font-medium text-foreground mb-1">Search failed</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runSearch(debouncedQuery, type)}
                className="border-cranberry/30 text-cranberry hover:bg-cranberry/5"
              >
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Empty states ───────────────────────────────────────────────── */}
        {!loading && !error && !hasQuery && (
          <Card className="border-dashed border-border/60 bg-card/40 backdrop-blur-sm">
            <CardContent className="py-16 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-evergreen/10 to-gold/8 text-evergreen/70 mb-3"
              >
                <SearchIcon className="h-6 w-6" />
              </motion.div>
              <p className="font-medium text-foreground mb-1">Search for creators, pages, or posts</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Type at least {MIN_QUERY_LENGTH} characters to start searching.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && hasQuery && !hasAnyResults && (
          <Card className="border-dashed border-border/60 bg-card/40 backdrop-blur-sm">
            <CardContent className="py-16 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 text-muted-foreground mb-3"
              >
                <SearchIcon className="h-6 w-6" />
              </motion.div>
              <p className="font-medium text-foreground mb-1">No results for &ldquo;{debouncedQuery}&rdquo;</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                Try a different keyword or check your spelling.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ name: 'explore' })}
                className="border-evergreen/30 text-evergreen hover:bg-evergreen/5 btn-glow overflow-hidden"
              >
                <Compass className="h-4 w-4 mr-1.5" /> Explore instead
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Results: type=all ───────────────────────────────────────────── */}
        {!loading && !error && allResults && (
          <div className="space-y-8">
            {/* Creators */}
            {allResults.creators.length > 0 && (
              <ResultsSection
                title="Creators"
                count={allResults.creators.length}
                icon={<Users className="h-4 w-4 text-evergreen" />}
                onSeeAll={allResults.creators.length >= 10 ? () => setType('creators') : undefined}
              >
                <StaggerContainer className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {allResults.creators.slice(0, 6).map(c => (
                    <StaggerItem key={c.id}>
                      <CreatorCard
                        creator={c}
                        navigate={navigate}
                        currentUser={currentUser}
                        onLogin={() => navigate({ name: 'login' })}
                      />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </ResultsSection>
            )}

            {/* Pages */}
            {allResults.pages.length > 0 && (
              <ResultsSection
                title="Pages"
                count={allResults.pages.length}
                icon={<FileText className="h-4 w-4 text-sage" />}
                onSeeAll={allResults.pages.length >= 10 ? () => setType('pages') : undefined}
              >
                <StaggerContainer className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {allResults.pages.slice(0, 6).map(p => (
                    <StaggerItem key={p.id}>
                      <PageCard page={p} navigate={navigate} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </ResultsSection>
            )}

            {/* Posts */}
            {allResults.posts.length > 0 && (
              <ResultsSection
                title="Posts"
                count={allResults.posts.length}
                icon={<Eye className="h-4 w-4 text-gold-dark" />}
                onSeeAll={allResults.posts.length >= 10 ? () => setType('posts') : undefined}
              >
                <StaggerContainer className="grid gap-3 md:grid-cols-2">
                  {allResults.posts.slice(0, 6).map(p => (
                    <StaggerItem key={p.id}>
                      <PostCard post={p} navigate={navigate} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </ResultsSection>
            )}
          </div>
        )}

        {/* ── Results: type=creators (paginated) ────────────────────────── */}
        {!loading && !error && type === 'creators' && creatorsList.length > 0 && (
          <div>
            <StaggerContainer className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {creatorsList.map(c => (
                <StaggerItem key={c.id}>
                  <CreatorCard
                    creator={c}
                    navigate={navigate}
                    currentUser={currentUser}
                    onLogin={() => navigate({ name: 'login' })}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>
            {creatorsCursor && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="border-evergreen/30 text-evergreen hover:bg-evergreen/5 btn-glow overflow-hidden"
                >
                  {loadingMore ? (
                    <>
                      <span className="h-4 w-4 border-2 border-evergreen/30 border-t-evergreen rounded-full animate-spin mr-1.5" />
                      Loading…
                    </>
                  ) : (
                    <>Load more <ArrowRight className="h-4 w-4 ml-1.5" /></>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Results: type=pages (paginated) ────────────────────────────── */}
        {!loading && !error && type === 'pages' && pagesList.length > 0 && (
          <div>
            <StaggerContainer className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pagesList.map(p => (
                <StaggerItem key={p.id}>
                  <PageCard page={p} navigate={navigate} />
                </StaggerItem>
              ))}
            </StaggerContainer>
            {pagesCursor && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="border-evergreen/30 text-evergreen hover:bg-evergreen/5 btn-glow overflow-hidden"
                >
                  {loadingMore ? (
                    <>
                      <span className="h-4 w-4 border-2 border-evergreen/30 border-t-evergreen rounded-full animate-spin mr-1.5" />
                      Loading…
                    </>
                  ) : (
                    <>Load more <ArrowRight className="h-4 w-4 ml-1.5" /></>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Results: type=posts (paginated) ────────────────────────────── */}
        {!loading && !error && type === 'posts' && postsList.length > 0 && (
          <div>
            <StaggerContainer className="grid gap-3 md:grid-cols-2">
              {postsList.map(p => (
                <StaggerItem key={p.id}>
                  <PostCard post={p} navigate={navigate} />
                </StaggerItem>
              ))}
            </StaggerContainer>
            {postsCursor && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="border-evergreen/30 text-evergreen hover:bg-evergreen/5 btn-glow overflow-hidden"
                >
                  {loadingMore ? (
                    <>
                      <span className="h-4 w-4 border-2 border-evergreen/30 border-t-evergreen rounded-full animate-spin mr-1.5" />
                      Loading…
                    </>
                  ) : (
                    <>Load more <ArrowRight className="h-4 w-4 ml-1.5" /></>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ResultsSection({
  title, count, icon, onSeeAll, children,
}: {
  title: string
  count: number
  icon: React.ReactNode
  onSeeAll?: () => void
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <h2 className="font-serif text-lg font-bold tracking-tight">{title}</h2>
          <Badge variant="outline" className="text-[10px] bg-muted/40 text-muted-foreground border-border/50">
            <CountUp value={count} duration={800} />
          </Badge>
        </div>
        {onSeeAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSeeAll}
            className="text-evergreen hover:bg-evergreen/5 hover:text-evergreen -mr-2"
          >
            See all
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
      {children}
    </section>
  )
}

function CreatorCard({
  creator, navigate, currentUser, onLogin,
}: {
  creator: Creator
  navigate: (v: View) => void
  currentUser: ReturnType<typeof useCurrentUser>['user']
  onLogin?: () => void
}) {
  const username = creator.username
  const displayName = creator.name || creator.username || 'Anonymous'
  return (
    <Card className="overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 hover:border-evergreen/30 bg-card/80 backdrop-blur-sm h-full flex flex-col">
      <div className="h-1 w-full bg-gradient-to-r from-evergreen to-evergreen-light" />
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-3">
          <button
            onClick={() => username && navigate({ name: 'public-profile', username })}
            disabled={!username}
            className="flex-shrink-0"
          >
            {creator.image ? (
              <img
                src={creator.image}
                alt={displayName}
                className="h-12 w-12 rounded-full object-cover border-2 border-background shadow-festive"
              />
            ) : (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-evergreen to-evergreen-dark text-cream font-bold text-lg shadow-festive">
                {displayName[0]?.toUpperCase() || '?'}
              </span>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <button
              onClick={() => username && navigate({ name: 'public-profile', username })}
              disabled={!username}
              className="block text-left min-w-0 w-full hover:text-evergreen transition-colors"
            >
              <p className="font-medium text-sm truncate">{displayName}</p>
              {username && <p className="text-xs text-muted-foreground truncate">@{username}</p>}
            </button>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              <Users className="h-2.5 w-2.5 inline mr-0.5" />
              <CountUp value={creator.followerCount} duration={1000} /> followers
            </p>
          </div>
        </div>
        {creator.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{creator.bio}</p>
        )}
        <div className="flex items-center gap-2 pt-2 border-t border-border/40">
          {username && (
            <FollowButton
              username={username}
              initialFollowing={false}
              currentUser={currentUser}
              variant="list"
              onLogin={onLogin}
            />
          )}
          {username && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate({ name: 'public-profile', username })}
              className="text-xs text-muted-foreground hover:text-evergreen hover:bg-evergreen/5 -mr-2 ml-auto"
            >
              View <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function PageCard({ page, navigate }: { page: Page; navigate: (v: View) => void }) {
  const emoji = PAGE_TYPE_EMOJI[page.pageType] || '📄'
  return (
    <Card
      className="overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 hover:border-evergreen/30 bg-card/80 backdrop-blur-sm h-full flex flex-col cursor-pointer"
      onClick={() => {
        window.location.hash = `/p/${page.slug}`
        navigate({ name: 'public', slug: page.slug })
      }}
    >
      <div className="h-1 w-full bg-gradient-to-r from-evergreen to-gold" />
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-3">
          <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-evergreen/10 to-gold/8 text-xl">
            {emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm truncate">{page.title}</h4>
            <p className="text-[10px] text-muted-foreground font-mono truncate">/p/{page.slug}</p>
          </div>
        </div>
        {page.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{page.description}</p>
        )}
        <div className="flex items-center gap-2 pt-2 border-t border-border/40 flex-wrap">
          {page.owner && (
            <div className="flex items-center gap-1.5 min-w-0">
              {page.owner.image ? (
                <img
                  src={page.owner.image}
                  alt={page.owner.name || page.owner.username || 'Owner'}
                  className="h-5 w-5 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-cream text-[10px] font-bold flex-shrink-0">
                  {(page.owner.name || page.owner.username || '?')[0]?.toUpperCase()}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground truncate">
                {page.owner.name || page.owner.username || 'Unknown'}
              </span>
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-evergreen hover:bg-evergreen/5 -mr-2 text-xs h-7"
            onClick={(e) => {
              e.stopPropagation()
              window.location.hash = `/p/${page.slug}`
              navigate({ name: 'public', slug: page.slug })
            }}
          >
            View <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PostCard({ post, navigate }: { post: Post; navigate: (v: View) => void }) {
  const typeEmoji = POST_TYPE_EMOJI[post.type] || '📄'
  return (
    <Card
      className="overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 hover:border-evergreen/30 bg-card/80 backdrop-blur-sm h-full flex flex-col cursor-pointer"
      onClick={() => post.author.username && navigate({
        name: 'public-post',
        postId: post.id,
        username: post.author.username,
        slug: post.slug,
      })}
    >
      <div className="h-1 w-full bg-gradient-to-r from-evergreen to-gold" />
      {post.coverImage && (
        <div className="relative h-28 overflow-hidden bg-muted/30">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
        </div>
      )}
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] bg-evergreen/5 text-evergreen border-evergreen/30">
            <span className="mr-0.5">{typeEmoji}</span>{post.type}
          </Badge>
        </div>
        <h3 className="font-serif text-base font-bold leading-snug mb-1 line-clamp-2">{post.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
          {post.excerpt || 'No excerpt available.'}
        </p>
        <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground mb-3 flex-wrap">
          <span className="inline-flex items-center gap-0.5" title="Views">
            <Eye className="h-3 w-3" /> <CountUp value={post.viewCount} duration={1000} />
          </span>
          <span className="inline-flex items-center gap-0.5" title="Likes">
            <Heart className="h-3 w-3" /> <CountUp value={post.likeCount} duration={1000} />
          </span>
          <span className="inline-flex items-center gap-0.5" title="Comments">
            <MessageCircle className="h-3 w-3" /> <CountUp value={post.commentCount} duration={1000} />
          </span>
        </div>
        {post.author && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            {post.author.image ? (
              <img
                src={post.author.image}
                alt={post.author.name || post.author.username || 'Author'}
                className="h-5 w-5 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-evergreen to-evergreen-dark text-cream text-[10px] font-bold flex-shrink-0">
                {(post.author.name || post.author.username || '?')[0]?.toUpperCase()}
              </span>
            )}
            <span className="text-[10px] font-medium truncate min-w-0">
              {post.author.name || post.author.username || 'Anonymous'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
