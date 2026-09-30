'use client'
import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sparkles as SparklesComponent } from '@/components/animated/sparkles'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { CountUp } from '@/components/animated/count-up'
import { FadeIn } from '@/components/animated/motion'
import { safeFetch } from '@/lib/safe-fetch'
import { toast } from '@/hooks/use-toast'
import { renderPostContent } from '@/lib/render-post-content'
import { AdSlot } from '@/components/ad/ad-slot'
import { EngagementBar } from '@/components/social/engagement-bar'
import { CommentsSection } from '@/components/social/comments-section'
import { useCurrentUser } from '@/components/social/use-current-user'
import {
  Share2, ChevronLeft, AlertCircle, Eye, Heart, MessageCircle,
  Sparkles, Layers, Clock, Link as LinkIcon,
} from 'lucide-react'
import type { View } from '@/app/page'

// ── Types ──────────────────────────────────────────────────────────────────
type PublicPost = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  // Content is stored as a JSON string in the DB. The API parses it before
  // returning, so the client receives either an old simple-block array or a
  // new ProseMirror doc object (or null for empty posts).
  content: any
  type: string
  visibility: string
  coverImage: string | null
  publishedAt: string | null
  updatedAt: string
  viewCount: number
  likeCount: number
  commentCount: number
  shareCount: number
  saveCount: number
  tags: string | null
  seoTitle: string
  seoDescription: string
  ogImage: string | null
  author: {
    id: string
    name: string | null
    username: string | null
    image: string | null
    bio: string | null
  }
  page: { id: string; slug: string; title: string } | null
  campaign: { id: string; slug: string; title: string } | null
}

type Placement = {
  id: string
  slot: string
  source: string
  adNetworkCode: string
  integrationType: string | null
  scriptReference: string | null
  priority: number
  // Ad-tag metadata (enriched server-side by the API)
  adTagHtml?: string
  adTagDescription?: string
  adTagType?: 'script' | 'link' | 'iframe'
  adTagScriptSrc?: string
  isLive?: boolean
  formatOptions?: { width?: number; height?: number; format?: string } | null
}

type Policy = {
  platformAdsEnabled: boolean
  userAdsEnabled: boolean
  globalKillSwitch: boolean
  maxAdUnitsPerPage: number
  adSlotResponsive?: boolean
}

type ApiResponse = {
  post: PublicPost
  placements: Placement[]
  policy: Policy
}

const POST_TYPE_EMOJI: Record<string, string> = {
  TEXT: '📝', ARTICLE: '📰', IMAGE: '🖼️', GALLERY: '🎨', VIDEO: '🎬',
  LINK: '🔗', POLL: '📊', EVENT: '📅', ANNOUNCEMENT: '📢',
  QUESTION: '❓', QUIZ: '🧠', CARD: '🎴',
}

// ── Component ───────────────────────────────────────────────────────────────
export default function PublicPostView({
  postId, navigate,
}: {
  postId: string
  navigate: (v: View) => void
}) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Visitor auth — fetched via /api/auth/me so we know whether to render the
  // engagement bar / comment box (logged in) or the "Log in to ..." CTAs.
  // We don't pass a profileUserId — the post view doesn't have an "own
  // profile" concept like the profile view does.
  const { user: currentUser } = useCurrentUser()

  // Ref to the comments section anchor, so the engagement bar's "Comments"
  // button can smooth-scroll to it.
  const commentsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      const res = await safeFetch<ApiResponse>(`/api/post/${postId}`)
      if (cancelled) return
      if (res.error) {
        setError(res.error)
      } else if (res.data?.post) {
        setData(res.data)
      } else {
        setError('Post not found.')
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [postId])

  async function handleShare() {
    const url = `${window.location.origin}/#/post/${postId}`
    const title = post?.title || 'Earnova post'
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
      } else {
        await navigator.clipboard.writeText(url)
        toast({ title: 'Link copied', description: 'The post URL is on your clipboard.' })
      }
    } catch {
      // user dismissed share sheet — silent
    }
  }

  // ── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 mesh-bg opacity-30 pointer-events-none" aria-hidden />
        <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />
        <div className="relative z-10 container mx-auto px-4 py-20 max-w-md flex items-center justify-center">
          <div className="glass-card rounded-2xl p-8 text-center w-full">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="font-serif text-lg font-bold mb-1">Loading post…</p>
            <p className="text-sm text-muted-foreground mb-4">Fetching the story for you.</p>
            <div className="h-1.5 w-32 mx-auto rounded-full overflow-hidden bg-muted/40">
              <div className="h-full w-1/2 shimmer-bg rounded-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 mesh-bg opacity-30 pointer-events-none" aria-hidden />
        <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />
        <div className="relative z-10 container mx-auto px-4 py-12 max-w-md">
          <Alert className="border-cranberry/40 bg-cranberry/5 backdrop-blur-sm shadow-festive">
            <AlertCircle className="h-4 w-4 text-cranberry" />
            <AlertDescription>
              <p className="font-serif text-lg font-bold mb-1 text-foreground">
                {error || 'This post is unavailable.'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                This post may not exist, may have been removed, or may be private.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ name: 'landing' })}
                className="border-cranberry/30 text-cranberry hover:bg-cranberry/5 btn-glow overflow-hidden"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to home
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  const { post, placements, policy } = data
  const placementBySlot = (slot: string) => placements.find(p => p.slot === slot)

  const authorName = post.author.name || post.author.username || 'Anonymous'
  const authorInitial = authorName[0]?.toUpperCase() || '?'
  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  const tags = (post.tags || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

  // Render the rich-text content via renderPostContent (handles ProseMirror
  // JSON, old block arrays, and plain HTML — returns sanitized HTML).
  // post.content from the API is the PARSED JSON object, so we stringify it
  // before passing to renderPostContent (which expects a string).
  const contentHtml = post.content ? renderPostContent(JSON.stringify(post.content)) : ''

  return (
    <div className="min-h-screen">
      {/* Ambient layer — subtle, doesn't compete with the content */}
      <div className="relative">
        <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" aria-hidden />
        <FloatingOrbs count={1} colors={['evergreen']} className="opacity-15" />

        <article className="relative z-10 container mx-auto px-4 py-8 md:py-12 max-w-3xl">
          {/* Back link */}
          <FadeIn>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ name: 'landing' })}
              className="mb-6 hover:bg-evergreen/5 hover:text-evergreen"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to home
            </Button>
          </FadeIn>

          {/* HEADER ad — above the article title */}
          {placementBySlot('HEADER') && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-6 bg-card/60 backdrop-blur-sm rounded-2xl p-2 shadow-sm"
            >
              <AdSlot placement={placementBySlot('HEADER')!} responsive={policy?.adSlotResponsive ?? true} />
            </motion.div>
          )}

          {/* Cover image */}
          {post.coverImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="mb-8 overflow-hidden rounded-2xl shadow-elevated"
            >
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full max-h-[460px] object-cover"
              />
            </motion.div>
          )}

          {/* Type + campaign badges */}
          {(post.type || post.campaign) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap items-center gap-2 mb-4"
            >
              <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30">
                <span className="mr-1">{POST_TYPE_EMOJI[post.type] || '📄'}</span> {post.type}
              </Badge>
              {post.campaign && (
                <Badge className="bg-gold/15 text-gold-dark border-gold/30">
                  <Sparkles className="h-3 w-3 mr-1" /> {post.campaign.title}
                </Badge>
              )}
              {post.visibility === 'UNLISTED' && (
                <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-muted-foreground/30">
                  <LinkIcon className="h-3 w-3 mr-1" /> Unlisted
                </Badge>
              )}
            </motion.div>
          )}

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-6 break-words"
          >
            <span className="gradient-text-evergreen">{post.title}</span>
          </motion.h1>

          {/* Author row */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex items-center gap-3 pb-6 mb-6 border-b border-border/60 flex-wrap"
          >
            <button
              onClick={() => post.author.username && navigate({ name: 'public-profile', username: post.author.username })}
              className="flex items-center gap-3 group min-w-0 flex-1 sm:flex-none"
              disabled={!post.author.username}
              title={post.author.username ? `View ${authorName}'s profile` : 'Author has no public profile'}
            >
              {post.author.image ? (
                <img
                  src={post.author.image}
                  alt={authorName}
                  className="h-11 w-11 rounded-full object-cover border-2 border-background shadow-festive flex-shrink-0"
                />
              ) : (
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-cream text-lg font-bold shadow-gold ring-2 ring-background flex-shrink-0">
                  {authorInitial}
                </span>
              )}
              <span className="text-left min-w-0">
                <span className="block font-medium text-foreground group-hover:text-evergreen transition-colors truncate">
                  {authorName}
                </span>
                {post.author.username && (
                  <span className="block text-xs text-muted-foreground group-hover:text-evergreen/70 transition-colors truncate">
                    @{post.author.username} · View profile
                  </span>
                )}
              </span>
            </button>
            {publishedDate && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                <Clock className="h-3 w-3" /> {publishedDate}
              </span>
            )}
          </motion.div>

          {/* Engagement stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex flex-wrap items-center gap-2 mb-8"
          >
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground bg-card/60 backdrop-blur-sm border border-border/40 rounded-full px-3 py-1.5">
              <Eye className="h-3.5 w-3.5 text-evergreen/70" />
              <CountUp value={post.viewCount} duration={1200} /> views
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground bg-card/60 backdrop-blur-sm border border-border/40 rounded-full px-3 py-1.5">
              <Heart className="h-3.5 w-3.5 text-berry/70" />
              <CountUp value={post.likeCount} duration={1200} /> likes
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground bg-card/60 backdrop-blur-sm border border-border/40 rounded-full px-3 py-1.5">
              <MessageCircle className="h-3.5 w-3.5 text-evergreen/70" />
              <CountUp value={post.commentCount} duration={1200} /> comments
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground bg-card/60 backdrop-blur-sm border border-border/40 rounded-full px-3 py-1.5">
              <Share2 className="h-3.5 w-3.5 text-gold-dark/70" />
              <CountUp value={post.shareCount} duration={1200} /> shares
            </span>
          </motion.div>

          {/* Tags */}
          {tags.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-2 mb-8"
            >
              {tags.map(t => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gradient-to-br from-evergreen/8 to-gold/5 text-evergreen border border-evergreen/30"
                >
                  <Sparkles className="h-2.5 w-2.5 opacity-70" />
                  {t}
                </span>
              ))}
            </motion.div>
          )}

          {/* AFTER_FIRST_BLOCK ad — placed right before the content (MVP:
              rather than splitting the rendered HTML after the first paragraph,
              we place it between the meta row and the article body). */}
          {placementBySlot('AFTER_FIRST_BLOCK') && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="my-6 bg-card/60 backdrop-blur-sm rounded-2xl p-2 shadow-sm"
            >
              <AdSlot placement={placementBySlot('AFTER_FIRST_BLOCK')!} responsive={policy?.adSlotResponsive ?? true} />
            </motion.div>
          )}

          {/* Content body — rich-text HTML rendered via renderPostContent */}
          {contentHtml ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="prose-content"
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          ) : (
            <p className="text-muted-foreground italic">This post has no content.</p>
          )}

          {/* Engagement bar — social actions (react / comment / save / share) */}
          <EngagementBar
            postId={post.id}
            currentUser={currentUser}
            commentCount={post.commentCount}
            onScrollToComments={() => {
              commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            onShare={handleShare}
            onLogin={() => navigate({ name: 'login' })}
          />

          {/* Comments section — threaded list + composer */}
          <CommentsSection
            postId={post.id}
            currentUser={currentUser}
            initialCommentCount={post.commentCount}
            sectionRef={commentsRef}
            onLogin={() => navigate({ name: 'login' })}
          />

          {/* "View page this post belongs to" CTA */}
          {post.page && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-10"
            >
              <Card
                className="overflow-hidden border-evergreen/20 hover:border-evergreen/40 hover:shadow-elevated transition-all cursor-pointer glass-card"
                onClick={() => {
                  window.location.hash = `/p/${post.page!.slug}`
                  navigate({ name: 'public', slug: post.page!.slug })
                }}
              >
                <div className="h-0.5 w-full bg-gradient-to-r from-evergreen to-gold" />
                <CardContent className="py-4 flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-evergreen/10 to-gold/8 text-evergreen">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Belongs to page</p>
                    <p className="font-semibold truncate">{post.page.title}</p>
                  </div>
                  <ChevronLeft className="h-4 w-4 rotate-180 text-evergreen" />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* BEFORE_FOOTER ad — after the page CTA, before the share CTA */}
          {placementBySlot('BEFORE_FOOTER') && (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="my-6 bg-card/60 backdrop-blur-sm rounded-2xl p-2 shadow-sm"
            >
              <AdSlot placement={placementBySlot('BEFORE_FOOTER')!} responsive={policy?.adSlotResponsive ?? true} />
            </motion.div>
          )}

          {/* Share CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12"
          >
            <Card className="overflow-hidden border-gold/20 relative">
              <div className="h-1 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
              <CardContent className="py-8 text-center relative overflow-hidden">
                <SparklesComponent count={4} />
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 mb-3 anim-pulse-glow relative z-10"
                >
                  <Share2 className="h-5 w-5 text-gold-dark" />
                </motion.div>
                <p className="font-semibold mb-1 relative z-10">Enjoyed this post?</p>
                <p className="text-sm text-muted-foreground mb-4 relative z-10">Share it with someone who would too.</p>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="relative z-10 inline-block">
                  <Button
                    onClick={handleShare}
                    className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
                  >
                    <Share2 className="h-4 w-4 mr-2" /> Share this post
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* FOOTER ad — after the share CTA */}
          {placementBySlot('FOOTER') && (
            <div className="mt-8 bg-card/60 backdrop-blur-sm rounded-2xl p-2 shadow-sm">
              <AdSlot placement={placementBySlot('FOOTER')!} responsive={policy?.adSlotResponsive ?? true} />
            </div>
          )}
        </article>
      </div>
    </div>
  )
}
