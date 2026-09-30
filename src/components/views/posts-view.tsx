'use client'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { motion } from 'framer-motion'
import { CountUp } from '@/components/animated/count-up'
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animated/motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { TiltCard } from '@/components/animated/tilt-card'
import { safeFetch } from '@/lib/safe-fetch'
import {
  Plus, Eye, Edit3, FileText, Sparkles, BarChart3, AlertCircle,
  Heart, MessageCircle, Share2, ArrowRight, RefreshCw, Layers, Calendar,
} from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'

// ── Types ──────────────────────────────────────────────────────────────────
type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED' | 'REMOVED' | 'UNDER_REVIEW'

type Post = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: any[] | null
  type: string
  status: PostStatus
  visibility: string
  coverImage: string | null
  scheduledAt: string | null
  publishedAt: string | null
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  saveCount: number
  tags: string | null
  createdAt: string
  updatedAt: string
  page: { id: string; slug: string; title: string } | null
  campaign: { id: string; slug: string; title: string } | null
  author: { id: string; name: string | null; username: string | null; image: string | null } | null
}

type ListResponse = { posts: Post[]; nextCursor: string | null }

// ── Static maps ────────────────────────────────────────────────────────────
const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: 'ALL',        label: 'All' },
  { value: 'PUBLISHED',  label: 'Published' },
  { value: 'DRAFT',      label: 'Drafts' },
  { value: 'SCHEDULED',  label: 'Scheduled' },
  { value: 'ARCHIVED',   label: 'Archived' },
]

const STATUS_BADGE: Record<PostStatus, { label: string; cls: string }> = {
  DRAFT:        { label: 'Draft',        cls: 'pill-draft' },
  SCHEDULED:    { label: 'Scheduled',    cls: 'pill-pending' },
  PUBLISHED:    { label: 'Published',    cls: 'pill-approved' },
  ARCHIVED:     { label: 'Archived',     cls: 'pill-restricted' },
  REMOVED:      { label: 'Removed',      cls: 'pill-banned' },
  UNDER_REVIEW: { label: 'Under review', cls: 'pill-pending' },
}

const POST_TYPE_EMOJI: Record<string, string> = {
  TEXT:         '📝',
  ARTICLE:      '📰',
  IMAGE:        '🖼️',
  GALLERY:      '🎨',
  VIDEO:        '🎬',
  LINK:         '🔗',
  POLL:         '📊',
  EVENT:        '📅',
  ANNOUNCEMENT: '📢',
  QUESTION:     '❓',
  QUIZ:         '🧠',
  CARD:         '🎴',
}

// ── Component ───────────────────────────────────────────────────────────────
export default function PostsView({
  user, navigate,
}: {
  user: CurrentUser
  navigate: (v: View) => void
}) {
  const [posts, setPosts] = useState<Post[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)

  const fetchPosts = useCallback(async (status: string, cursor?: string) => {
    const params = new URLSearchParams()
    if (status !== 'ALL') params.set('status', status)
    if (cursor) params.set('cursor', cursor)
    params.set('limit', '20')
    const qs = params.toString() ? `?${params.toString()}` : ''
    return safeFetch<ListResponse>(`/api/posts${qs}`)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      setPosts([])
      setNextCursor(null)
      const res = await fetchPosts(statusFilter)
      if (cancelled) return
      if (res.error) {
        setLoadError(res.error)
      } else if (res.data) {
        setPosts(res.data.posts || [])
        setNextCursor(res.data.nextCursor)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [statusFilter, fetchPosts])

  async function loadMore() {
    if (!nextCursor) return
    setLoadingMore(true)
    const res = await fetchPosts(statusFilter, nextCursor)
    if (res.data) {
      setPosts(prev => [...prev, ...(res.data!.posts || [])])
      setNextCursor(res.data.nextCursor)
    } else if (res.error) {
      setLoadError(res.error)
    }
    setLoadingMore(false)
  }

  // Derived stats — computed from the "ALL" filter set when status filter is ALL.
  // When a filter is active, we show counts for the current filtered list.
  const publishedCount = posts.filter(p => p.status === 'PUBLISHED').length
  const draftCount     = posts.filter(p => p.status === 'DRAFT').length
  const totalViews      = posts.reduce((sum, p) => sum + (p.viewCount || 0), 0)

  return (
    <div className="relative min-h-screen">
      {/* Ambient background layer — subtle mesh + drifting orbs, matches dashboard. */}
      <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" aria-hidden />
      <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <FadeIn>
          <div className="relative flex flex-wrap items-end justify-between gap-4 mb-8">
            <div className="absolute -inset-x-3 -inset-y-4 rounded-3xl bg-gradient-to-br from-evergreen/8 via-gold/4 to-berry/5 pointer-events-none" aria-hidden />
            <div className="relative">
              <Badge variant="outline" className="mb-2 border-gold/40 text-gold-dark bg-gold/5 glass-strong">
                <Sparkles className="h-3 w-3 mr-1" /> Posts
              </Badge>
              <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
                <span className="gradient-text-evergreen">Your Posts</span>
              </h1>
              <p className="text-muted-foreground mt-1">Publish fresh content. Build your audience.</p>
            </div>
            <motion.div className="relative" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => navigate({ name: 'post-editor' })}
                className="bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive btn-glow overflow-hidden"
              >
                <Plus className="h-4 w-4 mr-2" />
                New post
              </Button>
            </motion.div>
          </div>
        </FadeIn>

        {/* Stats row */}
        <StaggerContainer className="grid gap-4 mb-8 grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <TiltCard intensity={5}>
              <Card className="relative overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-1 border-evergreen/30">
                <div className="absolute inset-0 bg-gradient-to-br from-evergreen/8 via-evergreen/3 to-transparent" />
                <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-evergreen/15 blur-2xl animate-pulse" />
                <div className="h-1.5 w-full bg-gradient-to-r from-evergreen to-evergreen-light" />
                <CardContent className="relative py-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive">
                      <FileText className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-evergreen/60 font-bold">Total</span>
                  </div>
                  <p className="text-4xl font-bold font-serif text-evergreen-dark leading-none">
                    <CountUp value={posts.length} duration={1200} />
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1.5">Posts</p>
                </CardContent>
              </Card>
            </TiltCard>
          </StaggerItem>

          <StaggerItem>
            <TiltCard intensity={5}>
              <Card className="relative overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-1 border-gold/30">
                <div className="absolute inset-0 bg-gradient-to-br from-gold/12 via-gold/4 to-transparent" />
                <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gold/20 blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
                <div className="h-1.5 w-full bg-gradient-to-r from-gold-light via-gold to-gold-dark" />
                <CardContent className="relative py-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-gold-dark text-cream shadow-gold">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-gold-dark/60 font-bold">Live</span>
                  </div>
                  <p className="text-4xl font-bold font-serif text-gold-dark leading-none">
                    <CountUp value={publishedCount} duration={1200} />
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1.5">Published</p>
                </CardContent>
              </Card>
            </TiltCard>
          </StaggerItem>

          <StaggerItem>
            <TiltCard intensity={5}>
              <Card className="relative overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-1 border-berry/30">
                <div className="absolute inset-0 bg-gradient-to-br from-berry/10 via-berry/3 to-transparent" />
                <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-berry/20 blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="h-1.5 w-full bg-gradient-to-r from-berry via-berry/80 to-berry/60" />
                <CardContent className="relative py-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-berry to-berry/70 text-cream shadow-festive">
                      <Edit3 className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-berry/60 font-bold">WIP</span>
                  </div>
                  <p className="text-4xl font-bold font-serif text-berry leading-none">
                    <CountUp value={draftCount} duration={1200} />
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1.5">Drafts</p>
                </CardContent>
              </Card>
            </TiltCard>
          </StaggerItem>

          <StaggerItem>
            <TiltCard intensity={5}>
              <Card className="relative overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-1 border-sage/30">
                <div className="absolute inset-0 bg-gradient-to-br from-sage/12 via-sage/4 to-transparent" />
                <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-sage/30 blur-2xl animate-pulse" style={{ animationDelay: '1.5s' }} />
                <div className="h-1.5 w-full bg-gradient-to-r from-sage via-sage/80 to-evergreen-light" />
                <CardContent className="relative py-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sage to-evergreen-light text-cream shadow-festive">
                      <Eye className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-sage/70 font-bold">Views</span>
                  </div>
                  <p className="text-4xl font-bold font-serif text-sage leading-none">
                    <CountUp value={totalViews} duration={1200} />
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1.5">Total views</p>
                </CardContent>
              </Card>
            </TiltCard>
          </StaggerItem>
        </StaggerContainer>

        {/* Status filter tabs */}
        <FadeIn delay={0.15}>
          <div className="mb-6 flex flex-wrap gap-2">
            {STATUS_TABS.map(tab => {
              const active = statusFilter === tab.value
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    active
                      ? 'bg-evergreen text-cream shadow-festive btn-glow overflow-hidden'
                      : 'bg-card/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:border-evergreen/30 hover:bg-evergreen/5'
                  }`}
                  aria-pressed={active}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </FadeIn>

        {/* Posts list / loading / error / empty states */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-44 rounded-xl shimmer-bg" />
            ))}
          </div>
        ) : loadError && posts.length === 0 ? (
          <Card className="border-dashed border-cranberry/40">
            <CardContent className="py-16 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cranberry/10 mb-3">
                <AlertCircle className="h-7 w-7 text-cranberry" />
              </div>
              <p className="font-medium text-foreground mb-1">Couldn&apos;t load your posts</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{loadError}</p>
              <Button variant="outline" size="sm" onClick={() => setStatusFilter(s => s)} className="border-cranberry/30 text-cranberry hover:bg-cranberry/5 btn-glow overflow-hidden">
                <RefreshCw className="h-4 w-4 mr-1.5" /> Try again
              </Button>
            </CardContent>
          </Card>
        ) : posts.length === 0 ? (
          <Card className="border-dashed border-evergreen/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="py-16 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-evergreen/10 to-gold/8 text-evergreen/70 mb-3"
              >
                <FileText className="h-7 w-7" />
              </motion.div>
              <p className="font-medium text-foreground mb-1">No posts yet</p>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Share your first post — a thought, a story, an announcement. Your audience is waiting.
              </p>
              <Button
                onClick={() => navigate({ name: 'post-editor' })}
                className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Create your first post
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <StaggerContainer className="grid gap-4 md:grid-cols-2">
              {posts.map(p => (
                <StaggerItem key={p.id} y={15}>
                  <PostCard post={p} navigate={navigate} />
                </StaggerItem>
              ))}
            </StaggerContainer>

            {nextCursor && (
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
                    <>
                      Load more <ArrowRight className="h-4 w-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Post card ───────────────────────────────────────────────────────────────
function PostCard({ post, navigate }: { post: Post; navigate: (v: View) => void }) {
  const statusCfg = STATUS_BADGE[post.status] || { label: post.status, cls: 'pill-draft' }
  const typeEmoji = POST_TYPE_EMOJI[post.type] || '📄'
  const published = post.status === 'PUBLISHED'

  return (
    <Card className="overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 hover:border-evergreen/30 bg-card/80 backdrop-blur-sm h-full flex flex-col">
      {/* Status accent line */}
      <div className={`h-1 w-full ${
        post.status === 'PUBLISHED'   ? 'bg-gradient-to-r from-evergreen to-evergreen-light' :
        post.status === 'SCHEDULED'    ? 'bg-gradient-to-r from-gold to-gold-dark' :
        post.status === 'ARCHIVED'     ? 'bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/20' :
        post.status === 'REMOVED'      ? 'bg-gradient-to-r from-cranberry to-berry' :
                                         'bg-gradient-to-r from-berry to-berry/60'
      }`} />

      {/* Cover image (if any) */}
      {post.coverImage && (
        <div className="relative h-32 overflow-hidden bg-muted/30">
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
        {/* Badges + date */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.cls}`}>
            {statusCfg.label}
          </span>
          <Badge variant="outline" className="text-xs bg-evergreen/5 text-evergreen border-evergreen/30">
            <span className="mr-1">{typeEmoji}</span>
            {post.type}
          </Badge>
          {post.campaign && (
            <Badge variant="outline" className="text-xs bg-gold/8 text-gold-dark border-gold/30">
              <Sparkles className="h-2.5 w-2.5 mr-1" /> {post.campaign.title}
            </Badge>
          )}
          {post.scheduledAt && post.status === 'SCHEDULED' && (
            <Badge variant="outline" className="text-xs bg-gold/5 text-gold-dark border-gold/30">
              <Calendar className="h-2.5 w-2.5 mr-1" />
              {new Date(post.scheduledAt).toLocaleDateString()}
            </Badge>
          )}
        </div>

        {/* Title + excerpt */}
        <h3 className="font-serif text-lg font-bold leading-snug mb-1 line-clamp-2">{post.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
          {post.excerpt || 'No excerpt — will be auto-generated from content.'}
        </p>

        {/* Engagement stats */}
        <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground flex-wrap">
          <span className="inline-flex items-center gap-1" title="Views">
            <Eye className="h-3 w-3" /> {post.viewCount}
          </span>
          <span className="inline-flex items-center gap-1" title="Likes">
            <Heart className="h-3 w-3" /> {post.likeCount}
          </span>
          <span className="inline-flex items-center gap-1" title="Comments">
            <MessageCircle className="h-3 w-3" /> {post.commentCount}
          </span>
          <span className="inline-flex items-center gap-1" title="Shares">
            <Share2 className="h-3 w-3" /> {post.shareCount}
          </span>
          {post.page && (
            <span className="inline-flex items-center gap-1 text-evergreen/70 ml-auto" title={`Belongs to ${post.page.title}`}>
              <Layers className="h-3 w-3" /> {post.page.title}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t border-border/40">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate({ name: 'post-editor', postId: post.id })}
            className="border-evergreen/30 text-evergreen hover:bg-evergreen/5"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          {published ? (
            <Button
              size="sm"
              onClick={() => navigate({
                name: 'public-post',
                postId: post.id,
                username: post.author?.username || undefined,
                slug: post.slug,
              })}
              className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
            >
              <Eye className="h-3.5 w-3.5 mr-1" /> View public
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate({ name: 'analytics', pageId: post.id })}
              className="text-muted-foreground hover:text-evergreen hover:bg-evergreen/5"
              title="Analytics (coming soon)"
              disabled
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
