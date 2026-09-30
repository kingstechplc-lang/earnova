'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animated/motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { CountUp } from '@/components/animated/count-up'
import { safeFetch } from '@/lib/safe-fetch'
import { FollowButton } from '@/components/social/follow-button'
import { useCurrentUser } from '@/components/social/use-current-user'
import {
  Compass, Sparkles, TrendingUp, Flame, ArrowRight, RefreshCw,
  AlertCircle, Eye, Heart, MessageCircle, Share2, Bookmark,
  Users, FileText, Calendar, Crown, ChevronRight, Search,
} from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'

// ── Types (mirror of /api/explore response) ─────────────────────────────────
type TrendingPost = {
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
  author: { id: string; name: string | null; username: string | null; image: string | null } | null
  categories: Array<{ id: string; slug: string; name: string; icon: string | null; color: string | null }>
}

type Creator = {
  id: string
  username: string | null
  name: string | null
  image: string | null
  bio: string | null
  followerCount: number
  newFollowersThisWeek?: number
}

type PopularPage = {
  id: string
  slug: string
  title: string
  description: string | null
  pageType: string
  publishedAt: string | null
  owner: { id: string; name: string | null; username: string | null; image: string | null }
  trustScore?: number | null
  pageViews30d?: number
  publishedPostCount?: number
}

type Category = {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  color: string | null
  postCount: number
}

type FeaturedCampaign = {
  id: string
  slug: string
  title: string
  description: string | null
  startsAt: string
  endsAt: string
  featured: boolean
  _count?: { pages: number; posts: number }
}

type ExploreBundle = {
  trendingPosts: TrendingPost[]
  newCreators: Creator[]
  risingCreators: Creator[]
  popularPages: PopularPage[]
  categories: Category[]
  featuredCampaigns: FeaturedCampaign[]
}

// ── Static maps (shared with posts-view for consistency) ───────────────────
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

// ── Component ───────────────────────────────────────────────────────────────
export default function ExploreView({
  navigate, user,
}: {
  navigate: (v: View) => void
  user: CurrentUser | null
}) {
  const [data, setData] = useState<ExploreBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Visitor auth — fetched so we know whether to render Follow buttons + so
  // the FollowButton can show "Log in to follow" CTAs for logged-out visitors.
  const { user: currentUser } = useCurrentUser()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const res = await safeFetch<ExploreBundle>('/api/explore')
      if (cancelled) return
      if (res.error) {
        setError(res.error)
      } else if (res.data) {
        setData(res.data)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" aria-hidden />
        <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
          <ExploreHeaderSkeleton />
          <div className="space-y-8 mt-8">
            <SectionSkeleton />
            <SectionSkeleton />
            <SectionSkeleton />
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" aria-hidden />
        <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />
        <div className="relative z-10 container mx-auto px-4 py-12 max-w-md">
          <Alert className="border-cranberry/40 bg-cranberry/5 backdrop-blur-sm shadow-festive">
            <AlertCircle className="h-4 w-4 text-cranberry" />
            <AlertDescription>
              <p className="font-serif text-lg font-bold mb-1 text-foreground">
                {error || 'Couldn\'t load explore.'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Discovery content couldn't be fetched right now. Please try again.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => location.reload()}
                className="border-cranberry/30 text-cranberry hover:bg-cranberry/5 btn-glow overflow-hidden"
              >
                <RefreshCw className="h-4 w-4 mr-1.5" /> Try again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const {
    trendingPosts,
    newCreators,
    risingCreators,
    popularPages,
    categories,
    featuredCampaigns,
  } = data

  return (
    <div className="relative min-h-screen">
      {/* Ambient background layer — subtle mesh + drifting orbs */}
      <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" aria-hidden />
      <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <FadeIn>
          <div className="relative flex flex-wrap items-end justify-between gap-4 mb-8">
            <div className="absolute -inset-x-3 -inset-y-4 rounded-3xl bg-gradient-to-br from-evergreen/8 via-gold/4 to-berry/5 pointer-events-none" aria-hidden />
            <div className="relative">
              <Badge variant="outline" className="mb-2 border-gold/40 text-gold-dark bg-gold/5 glass-strong">
                <Compass className="h-3 w-3 mr-1" /> Discover
              </Badge>
              <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
                <span className="gradient-text-evergreen">Explore Earnova</span>
              </h1>
              <p className="text-muted-foreground mt-1">
                Discover creators, pages, and posts from around the world.
              </p>
            </div>
            <motion.div className="relative" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => navigate({ name: 'search' })}
                variant="outline"
                className="border-evergreen/30 text-evergreen hover:bg-evergreen/5 btn-glow overflow-hidden"
              >
                <Search className="h-4 w-4 mr-2" /> Search
              </Button>
            </motion.div>
          </div>
        </FadeIn>

        {/* ── Featured campaigns (only if any) ────────────────────────────── */}
        {featuredCampaigns.length > 0 && (
          <FadeIn delay={0.1}>
            <Section
              title="Featured Campaigns"
              icon={<Crown className="h-5 w-5 text-gold-dark" />}
              accent="gold"
            >
              <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {featuredCampaigns.map(c => (
                  <StaggerItem key={c.id}>
                    <CampaignCard campaign={c} navigate={navigate} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </Section>
          </FadeIn>
        )}

        {/* ── Trending Posts ──────────────────────────────────────────────── */}
        <FadeIn delay={0.15}>
          <Section
            title="Trending Posts"
            icon={<TrendingUp className="h-5 w-5 text-evergreen" />}
            accent="evergreen"
            actionLabel="See more"
            onAction={() => navigate({ name: 'feed', tab: 'trending' })}
          >
            {trendingPosts.length === 0 ? (
              <EmptyState
                icon={<TrendingUp className="h-6 w-6" />}
                title="No trending posts yet"
                body="The trending shelf refreshes every hour — check back soon."
              />
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory scrollbar-thin">
                {trendingPosts.map(p => (
                  <motion.div
                    key={p.id}
                    whileHover={{ y: -4 }}
                    className="flex-shrink-0 w-[280px] snap-start"
                  >
                    <TrendingPostCard post={p} navigate={navigate} />
                  </motion.div>
                ))}
              </div>
            )}
          </Section>
        </FadeIn>

        {/* ── Rising Creators ────────────────────────────────────────────── */}
        <FadeIn delay={0.2}>
          <Section
            title="🔥 Rising Creators"
            icon={<Flame className="h-5 w-5 text-berry" />}
            accent="berry"
          >
            {risingCreators.length === 0 ? (
              <EmptyState
                icon={<Flame className="h-6 w-6" />}
                title="No rising creators this week"
                body="When creators gain new followers fast, they'll appear here."
              />
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory scrollbar-thin">
                {risingCreators.map(c => (
                  <motion.div
                    key={c.id}
                    whileHover={{ y: -4 }}
                    className="flex-shrink-0 w-[260px] snap-start"
                  >
                    <CreatorCard
                      creator={c}
                      navigate={navigate}
                      currentUser={currentUser}
                      rising
                      onLogin={() => navigate({ name: 'login' })}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </Section>
        </FadeIn>

        {/* ── New Creators ────────────────────────────────────────────────── */}
        <FadeIn delay={0.25}>
          <Section
            title="New Creators"
            icon={<Sparkles className="h-5 w-5 text-gold-dark" />}
            accent="gold"
          >
            {newCreators.length === 0 ? (
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title="No new creators yet"
                body="New creators who join Earnova will be highlighted here."
              />
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 snap-x snap-mandatory scrollbar-thin">
                {newCreators.map(c => (
                  <motion.div
                    key={c.id}
                    whileHover={{ y: -4 }}
                    className="flex-shrink-0 w-[260px] snap-start"
                  >
                    <CreatorCard
                      creator={c}
                      navigate={navigate}
                      currentUser={currentUser}
                      onLogin={() => navigate({ name: 'login' })}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </Section>
        </FadeIn>

        {/* ── Popular Pages ──────────────────────────────────────────────── */}
        <FadeIn delay={0.3}>
          <Section
            title="Popular Pages"
            icon={<FileText className="h-5 w-5 text-sage" />}
            accent="sage"
          >
            {popularPages.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-6 w-6" />}
                title="No published pages yet"
                body="Top-rated Special Pages will show up here once published."
              />
            ) : (
              <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {popularPages.map(p => (
                  <StaggerItem key={p.id}>
                    <PopularPageCard page={p} navigate={navigate} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </Section>
        </FadeIn>

        {/* ── Categories ─────────────────────────────────────────────────── */}
        <FadeIn delay={0.35}>
          <Section
            title="Browse by Category"
            icon={<Compass className="h-5 w-5 text-evergreen" />}
            accent="evergreen"
          >
            {categories.length === 0 ? (
              <EmptyState
                icon={<Compass className="h-6 w-6" />}
                title="No categories yet"
                body="Categories help organize posts by topic."
              />
            ) : (
              <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {categories.slice(0, 15).map(c => (
                  <StaggerItem key={c.id}>
                    <CategoryTile category={c} navigate={navigate} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </Section>
        </FadeIn>

        {/* ── Footer CTA ──────────────────────────────────────────────────── */}
        {!user && (
          <FadeIn delay={0.4}>
            <Card className="relative overflow-hidden border-gold/30 mt-8">
              <div className="h-1 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
              <CardContent className="py-8 text-center relative">
                <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" aria-hidden />
                <div className="relative z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-evergreen to-evergreen-dark text-cream mb-3 shadow-festive"
                  >
                    <Sparkles className="h-5 w-5" />
                  </motion.div>
                  <p className="font-serif text-xl font-bold mb-1">Join Earnova today</p>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                    Create your own Special Page, follow creators, and grow your audience. Free forever.
                  </p>
                  <Button
                    onClick={() => navigate({ name: 'signup' })}
                    className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
                  >
                    Get started <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Section({
  title, icon, children, accent = 'evergreen', actionLabel, onAction,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  accent?: 'evergreen' | 'gold' | 'berry' | 'sage'
  actionLabel?: string
  onAction?: () => void
}) {
  const accentLine: Record<string, string> = {
    evergreen: 'from-evergreen to-evergreen-light',
    gold: 'from-gold-light to-gold',
    berry: 'from-berry to-berry/60',
    sage: 'from-sage to-evergreen-light',
  }
  return (
    <section className="mb-10">
      <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <h2 className="font-serif text-xl md:text-2xl font-bold tracking-tight truncate">
            {title}
          </h2>
        </div>
        {actionLabel && onAction && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAction}
            className="text-evergreen hover:bg-evergreen/5 hover:text-evergreen -mr-2"
          >
            {actionLabel}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>
      <div className={`h-0.5 w-full bg-gradient-to-r ${accentLine[accent]} opacity-30 mb-4`} />
      {children}
    </section>
  )
}

function TrendingPostCard({ post, navigate }: { post: TrendingPost; navigate: (v: View) => void }) {
  const typeEmoji = POST_TYPE_EMOJI[post.type] || '📄'
  return (
    <Card
      className="overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 hover:border-evergreen/30 bg-card/80 backdrop-blur-sm h-full flex flex-col cursor-pointer"
      onClick={() => post.author?.username && navigate({
        name: 'public-post',
        postId: post.id,
        username: post.author.username,
        slug: post.slug,
      })}
    >
      <div className="h-1 w-full bg-gradient-to-r from-evergreen to-gold" />
      {post.coverImage ? (
        <div className="relative h-32 overflow-hidden bg-muted/30">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
        </div>
      ) : (
        <div className="h-2" />
      )}
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] bg-evergreen/5 text-evergreen border-evergreen/30">
            <span className="mr-0.5">{typeEmoji}</span>{post.type}
          </Badge>
          {post.categories.slice(0, 1).map(c => (
            <Badge key={c.id} variant="outline" className="text-[10px] bg-gold/5 text-gold-dark border-gold/30">
              {c.icon && <span className="mr-0.5">{c.icon}</span>}{c.name}
            </Badge>
          ))}
        </div>
        <h3 className="font-serif text-base font-bold leading-snug mb-1 line-clamp-2">{post.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
          {post.excerpt || 'No excerpt available.'}
        </p>
        {/* Engagement pills */}
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
          <span className="inline-flex items-center gap-0.5" title="Shares">
            <Share2 className="h-3 w-3" /> <CountUp value={post.shareCount} duration={1000} />
          </span>
        </div>
        {post.author && (
          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            {post.author.image ? (
              <img
                src={post.author.image}
                alt={post.author.name || post.author.username || 'Author'}
                className="h-6 w-6 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-evergreen to-evergreen-dark text-cream text-xs font-bold flex-shrink-0">
                {(post.author.name || post.author.username || '?')[0]?.toUpperCase()}
              </span>
            )}
            <span className="text-xs font-medium truncate min-w-0">
              {post.author.name || post.author.username || 'Anonymous'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CreatorCard({
  creator, navigate, currentUser, rising, onLogin,
}: {
  creator: Creator
  navigate: (v: View) => void
  currentUser: ReturnType<typeof useCurrentUser>['user']
  rising?: boolean
  onLogin?: () => void
}) {
  const username = creator.username
  const displayName = creator.name || creator.username || 'Anonymous'
  return (
    <Card className="overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 hover:border-evergreen/30 bg-card/80 backdrop-blur-sm h-full flex flex-col">
      <div className={`h-1 w-full ${rising ? 'bg-gradient-to-r from-berry via-gold to-berry' : 'bg-gradient-to-r from-gold-light to-gold'}`} />
      <CardContent className="p-4 flex flex-col flex-1">
        {rising && creator.newFollowersThisWeek != null && (
          <Badge className="self-start mb-2 bg-berry/10 text-berry border-berry/30 text-[10px]">
            <Flame className="h-2.5 w-2.5 mr-1" /> +{creator.newFollowersThisWeek} this week
          </Badge>
        )}
        <div className="flex items-start gap-3 mb-3">
          <button
            onClick={() => username && navigate({ name: 'public-profile', username })}
            disabled={!username}
            className="flex-shrink-0"
            title={username ? `View @${username}'s profile` : 'Profile unavailable'}
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

function PopularPageCard({ page, navigate }: { page: PopularPage; navigate: (v: View) => void }) {
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

function CategoryTile({ category, navigate }: { category: Category; navigate: (v: View) => void }) {
  const colorClass = category.color
    ? `border-[${category.color}]/30`
    : 'border-evergreen/30'
  return (
    <button
      onClick={() => navigate({ name: 'search', query: category.name })}
      className="group relative overflow-hidden rounded-xl p-4 bg-card/80 backdrop-blur-sm border border-border/40 hover:border-evergreen/40 hover:shadow-elevated hover:-translate-y-0.5 transition-all text-left min-w-0"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-evergreen/5 to-gold/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="relative">
        <div className="text-2xl mb-1.5">{category.icon || '📂'}</div>
        <p className="font-medium text-sm truncate">{category.name}</p>
        <p className="text-[10px] text-muted-foreground">
          <CountUp value={category.postCount} duration={800} /> {category.postCount === 1 ? 'post' : 'posts'}
        </p>
      </div>
    </button>
  )
}

function CampaignCard({ campaign, navigate }: { campaign: FeaturedCampaign; navigate: (v: View) => void }) {
  const now = new Date()
  const endsAt = new Date(campaign.endsAt)
  const daysLeft = Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  return (
    <Card className="overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 hover:border-gold/40 bg-card/80 backdrop-blur-sm h-full flex flex-col">
      <div className="h-1 w-full bg-gradient-to-r from-gold-light via-gold to-berry" />
      <CardContent className="p-4 flex flex-col flex-1">
        {campaign.featured && (
          <Badge className="self-start mb-2 bg-gold/15 text-gold-dark border-gold/30 text-[10px]">
            <Crown className="h-2.5 w-2.5 mr-1" /> Featured
          </Badge>
        )}
        <h4 className="font-serif font-bold text-base mb-1 line-clamp-1">{campaign.title}</h4>
        {campaign.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">{campaign.description}</p>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-2.5 w-2.5" /> {daysLeft > 0 ? `${daysLeft}d left` : 'Ended'}
          </span>
          {campaign._count && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <FileText className="h-2.5 w-2.5" /> {campaign._count.posts} posts
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate({ name: 'search', query: campaign.title })}
            className="text-gold-dark hover:bg-gold/5 -mr-2 text-xs h-7 ml-auto"
          >
            Explore <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card className="border-dashed border-border/60 bg-card/40 backdrop-blur-sm">
      <CardContent className="py-10 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground mb-2">
          {icon}
        </div>
        <p className="font-medium text-sm text-foreground mb-1">{title}</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">{body}</p>
      </CardContent>
    </Card>
  )
}

function ExploreHeaderSkeleton() {
  return (
    <div className="mb-8">
      <div className="h-7 w-32 shimmer-bg rounded-md mb-3" />
      <div className="h-9 w-64 shimmer-bg rounded-md mb-2" />
      <div className="h-4 w-80 shimmer-bg rounded-md" />
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div>
      <div className="h-6 w-48 shimmer-bg rounded-md mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-40 rounded-xl shimmer-bg" />
        ))}
      </div>
    </div>
  )
}
