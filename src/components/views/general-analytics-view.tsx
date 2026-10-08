'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ChevronLeft, BarChart3, Users, Eye, FileText, Heart, TrendingUp,
  LayoutDashboard, Activity, Globe2, Smartphone, Link2, ArrowRight,
  MessageCircle, Share2, Bookmark, Plus, Monitor, Tablet,
} from 'lucide-react'
import { CountUp } from '@/components/animated/count-up'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animated/motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { TiltCard } from '@/components/animated/tilt-card'
import { safeFetch } from '@/lib/safe-fetch'
import type { View, CurrentUser } from '@/app/page'

// ── API response shapes (mirrors /api/analytics/overview) ──────────────────
type TopPage = {
  id: string; slug: string; title: string; pageType: string
  publishedAt: string | null; moderationState: string; views: number
}
type TopPost = {
  id: string; slug: string; title: string; excerpt: string | null
  type: string; coverImage: string | null
  views: number; likes: number; comments: number; shares: number; saves: number
}
type Overview = {
  totalVisitors7d: number; totalVisitors30d: number
  totalPageViews7d: number; totalPageViews30d: number
  totalPostViews30d: number; totalFollowers: number
  totalEngagement30d: number; totalPages: number; totalPosts: number
  topPages: TopPage[]; topPosts: TopPost[]
  topCountries: string; topDevices: string; topSources: string
}

// ── Accent system — covers the full brand palette ─────────────────────────
type Accent = 'evergreen' | 'gold' | 'berry' | 'cranberry' | 'sage'

const ACCENTS: Record<Accent, {
  bg: string
  text: string
  bar: string
  wash: string
  orb: string
  ring: string
  gradientIcon: string
}> = {
  evergreen: {
    bg: 'bg-evergreen/10', text: 'text-evergreen',
    bar: 'bg-gradient-to-r from-evergreen to-evergreen-light',
    wash: 'bg-gradient-to-br from-evergreen/8 via-evergreen/3 to-transparent',
    orb: 'bg-evergreen/15', ring: 'border-evergreen/30',
    gradientIcon: 'bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive',
  },
  gold: {
    bg: 'bg-gold/15', text: 'text-gold-dark',
    bar: 'bg-gradient-to-r from-gold-light via-gold to-gold-dark',
    wash: 'bg-gradient-to-br from-gold/12 via-gold/4 to-transparent',
    orb: 'bg-gold/20', ring: 'border-gold/30',
    gradientIcon: 'bg-gradient-to-br from-gold to-gold-dark text-cream shadow-gold',
  },
  berry: {
    bg: 'bg-berry/10', text: 'text-berry',
    bar: 'bg-gradient-to-r from-berry to-berry/70',
    wash: 'bg-gradient-to-br from-berry/10 via-berry/3 to-transparent',
    orb: 'bg-berry/20', ring: 'border-berry/30',
    gradientIcon: 'bg-gradient-to-br from-berry to-berry/70 text-cream shadow-festive',
  },
  cranberry: {
    bg: 'bg-cranberry/10', text: 'text-cranberry',
    bar: 'bg-gradient-to-r from-cranberry to-berry',
    wash: 'bg-gradient-to-br from-cranberry/10 via-cranberry/3 to-transparent',
    orb: 'bg-cranberry/20', ring: 'border-cranberry/30',
    gradientIcon: 'bg-gradient-to-br from-cranberry to-berry text-cream shadow-festive',
  },
  sage: {
    bg: 'bg-sage/15', text: 'text-sage',
    bar: 'bg-gradient-to-r from-sage to-evergreen-light',
    wash: 'bg-gradient-to-br from-sage/12 via-sage/4 to-transparent',
    orb: 'bg-sage/25', ring: 'border-sage/30',
    gradientIcon: 'bg-gradient-to-br from-sage to-evergreen text-cream shadow-festive',
  },
}

// ── Page-type emoji map (compact subset for top-pages row) ────────────────
const PAGE_TYPE_EMOJI: Record<string, string> = {
  PERSONAL: '👤', CELEBRATION: '🎄', LINK_HUB: '🔗', CREATOR: '✨',
  BLOGGER: '✍️', PHOTOGRAPHY: '📸', MUSIC: '🎵', GAMING: '🎮',
  BUSINESS: '💼', EVENT: '🎉',
}

// ── Post-type emoji map ───────────────────────────────────────────────────
const POST_TYPE_EMOJI: Record<string, string> = {
  ARTICLE: '📝', VIDEO: '🎬', PHOTO: '📸', AUDIO: '🎵',
  LINK: '🔗', GALLERY: '🖼️', STORY: '📖', NEWS: '📰',
}

// ── Country code → flag + name map (extends analytics-view.tsx) ────────────
const COUNTRY_FLAGS: Record<string, string> = {
  GH: '🇬🇭', NG: '🇳🇬', US: '🇺🇸', UK: '🇬🇧', GB: '🇬🇧',
  KE: '🇰🇪', ZA: '🇿🇦', IN: '🇮🇳', PH: '🇵🇭', BR: '🇧🇷',
  DE: '🇩🇪', FR: '🇫🇷', CA: '🇨🇦', AU: '🇦🇺', EG: '🇪🇬',
  TZ: '🇹🇿', UG: '🇺🇬', RW: '🇷🇼', CM: '🇨🇲', ET: '🇪🇹',
}
const COUNTRY_NAMES: Record<string, string> = {
  GH: 'Ghana', NG: 'Nigeria', US: 'United States', UK: 'United Kingdom',
  GB: 'United Kingdom', KE: 'Kenya', ZA: 'South Africa', IN: 'India',
  PH: 'Philippines', BR: 'Brazil', DE: 'Germany', FR: 'France',
  CA: 'Canada', AU: 'Australia', EG: 'Egypt', TZ: 'Tanzania',
  UG: 'Uganda', RW: 'Rwanda', CM: 'Cameroon', ET: 'Ethiopia',
}
const DEVICE_LABELS: Record<string, string> = {
  mobile: 'Mobile', desktop: 'Desktop', tablet: 'Tablet', unknown: 'Unknown',
}

function countryFlag(code: string): string {
  if (COUNTRY_FLAGS[code]) return COUNTRY_FLAGS[code]
  // Build a flag from any 2-letter ISO code using regional indicator symbols
  if (code.length === 2 && /^[A-Za-z]{2}$/.test(code)) {
    const base = 0x1F1E6
    const A = 'A'.charCodeAt(0)
    const ch1 = base + (code.toUpperCase().charCodeAt(0) - A)
    const ch2 = base + (code.toUpperCase().charCodeAt(1) - A)
    return String.fromCodePoint(ch1, ch2)
  }
  return '🏳️'
}

// ── Main view ─────────────────────────────────────────────────────────────
export default function GeneralAnalyticsView({
  user, navigate,
}: {
  user: CurrentUser
  navigate: (v: View) => void
}) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      const res = await safeFetch<{ overview?: Overview }>('/api/analytics/overview')
      if (cancelled) return
      if (res.error) {
        setLoadError(res.error)
      } else if (res.data?.overview) {
        setOverview(res.data.overview)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  // Empty-state shortcut: no pages AND no posts → big "no analytics yet" CTA
  const isEmpty = overview ? overview.totalPages === 0 && overview.totalPosts === 0 : false

  return (
    <div className="relative min-h-screen">
      {/* Ambient background — mesh + 2 evergreen/gold orbs (matches dashboard) */}
      <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" aria-hidden />
      <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-25" />

      <div className="relative z-10 view-fade container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <FadeIn>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ name: 'dashboard' })}
              className="hover:bg-evergreen/5 hover:text-evergreen"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Dashboard
            </Button>
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="relative mb-8 overflow-hidden rounded-2xl border border-evergreen/30 bg-gradient-to-br from-evergreen/10 via-background to-gold/5 p-6 md:p-8">
            {/* Hero gradient wash + orbs */}
            <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-30" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <motion.span
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive"
                >
                  <BarChart3 className="h-5 w-5" />
                </motion.span>
                <span className="text-xs uppercase tracking-wider font-semibold text-evergreen">
                  All pages &amp; posts
                </span>
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mb-2">
                <span className="gradient-text-evergreen">Analytics Overview</span>
              </h1>
              <p className="text-muted-foreground">
                Your performance across all pages and posts.
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Body — loading / error / empty / data */}
        {loading ? (
          <AnalyticsSkeleton />
        ) : loadError && !overview ? (
          <FadeIn>
            <Alert className="border-cranberry/40 bg-cranberry/5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cranberry/10 mr-2">
                <BarChart3 className="h-4 w-4 text-cranberry" />
              </div>
              <AlertDescription className="text-cranberry">
                <p className="font-medium mb-1">Couldn&apos;t load your analytics.</p>
                <p className="text-sm text-muted-foreground mb-3">{loadError}</p>
                <Button size="sm" variant="outline" onClick={() => location.reload()}>
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          </FadeIn>
        ) : isEmpty ? (
          <EmptyState navigate={navigate} />
        ) : overview ? (
          <div className="space-y-8">
            {/* ── Hero stats row (5 cards) ─────────────────────────────────── */}
            <StaggerContainer className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <StaggerItem>
                <HeroStatCard
                  icon={<Users className="h-5 w-5" />}
                  value={overview.totalVisitors30d}
                  label="Total Visitors"
                  sub={`7d: ${overview.totalVisitors7d.toLocaleString()}`}
                  accent="evergreen"
                />
              </StaggerItem>
              <StaggerItem>
                <HeroStatCard
                  icon={<Eye className="h-5 w-5" />}
                  value={overview.totalPageViews30d}
                  label="Page Views"
                  sub={`7d: ${overview.totalPageViews7d.toLocaleString()}`}
                  accent="gold"
                />
              </StaggerItem>
              <StaggerItem>
                <HeroStatCard
                  icon={<FileText className="h-5 w-5" />}
                  value={overview.totalPostViews30d}
                  label="Post Views"
                  sub="Last 30 days"
                  accent="berry"
                />
              </StaggerItem>
              <StaggerItem>
                <HeroStatCard
                  icon={<Heart className="h-5 w-5" />}
                  value={overview.totalFollowers}
                  label="Followers"
                  sub="Total audience"
                  accent="cranberry"
                />
              </StaggerItem>
              <StaggerItem>
                <HeroStatCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  value={overview.totalEngagement30d}
                  label="Engagement"
                  sub="Likes + comments + shares"
                  accent="sage"
                />
              </StaggerItem>
            </StaggerContainer>

            {/* ── Secondary stats row (3 cards) ────────────────────────────── */}
            <StaggerContainer className="grid gap-4 grid-cols-1 sm:grid-cols-3" stagger={0.07}>
              <StaggerItem>
                <SecondaryStatCard
                  icon={<LayoutDashboard className="h-4 w-4" />}
                  value={overview.totalPages}
                  label="Total Pages"
                  hint="All created pages"
                  accent="evergreen"
                />
              </StaggerItem>
              <StaggerItem>
                <SecondaryStatCard
                  icon={<FileText className="h-4 w-4" />}
                  value={overview.totalPosts}
                  label="Total Posts"
                  hint="Published posts"
                  accent="gold"
                />
              </StaggerItem>
              <StaggerItem>
                <SecondaryStatCard
                  icon={<Activity className="h-4 w-4" />}
                  value={computeEngagementRate(overview)}
                  label="Avg Engagement Rate"
                  hint="Engagement ÷ page views"
                  accent="berry"
                  suffix="%"
                />
              </StaggerItem>
            </StaggerContainer>

            {/* ── Top Performing Pages ─────────────────────────────────────── */}
            <SectionHeader
              icon={<LayoutDashboard className="h-5 w-5" />}
              title="Top Performing Pages"
              subtitle="Your most-viewed pages in the last 30 days"
              accent="evergreen"
            />
            <FadeIn delay={0.05}>
              <TopPagesCard overview={overview} navigate={navigate} />
            </FadeIn>

            {/* ── Top Performing Posts ────────────────────────────────────── */}
            <SectionHeader
              icon={<FileText className="h-5 w-5" />}
              title="Top Performing Posts"
              subtitle="Your most-viewed published posts"
              accent="berry"
            />
            <FadeIn delay={0.05}>
              <TopPostsCard overview={overview} navigate={navigate} />
            </FadeIn>

            {/* ── Traffic Breakdown ──────────────────────────────────────── */}
            <SectionHeader
              icon={<Globe2 className="h-5 w-5" />}
              title="Traffic Breakdown"
              subtitle="Where your visitors come from — geographically, technically, and referentially"
              accent="gold"
            />
            <StaggerContainer className="grid gap-4 grid-cols-1 md:grid-cols-3" stagger={0.1}>
              <StaggerItem>
                <BreakdownCard
                  title="Top Countries"
                  icon={<Globe2 className="h-4 w-4" />}
                  data={overview.topCountries}
                  format="country"
                  accent="evergreen"
                />
              </StaggerItem>
              <StaggerItem>
                <BreakdownCard
                  title="Devices"
                  icon={<Smartphone className="h-4 w-4" />}
                  data={overview.topDevices}
                  format="device"
                  accent="gold"
                />
              </StaggerItem>
              <StaggerItem>
                <BreakdownCard
                  title="Top Sources"
                  icon={<Link2 className="h-4 w-4" />}
                  data={overview.topSources}
                  format="default"
                  accent="berry"
                />
              </StaggerItem>
            </StaggerContainer>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Engagement-rate helper ─────────────────────────────────────────────────
function computeEngagementRate(o: Overview): number {
  if (o.totalPageViews30d === 0) return 0
  return Math.round((o.totalEngagement30d / o.totalPageViews30d) * 100)
}

// ── Skeleton loader ───────────────────────────────────────────────────────
function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-40 rounded-xl shimmer-bg" />
        ))}
      </div>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 rounded-xl shimmer-bg" />
        ))}
      </div>
      <div className="h-64 rounded-xl shimmer-bg" />
      <div className="h-64 rounded-xl shimmer-bg" />
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-48 rounded-xl shimmer-bg" />
        ))}
      </div>
    </div>
  )
}

// ── Empty state: no pages AND no posts ────────────────────────────────────
function EmptyState({ navigate }: { navigate: (v: View) => void }) {
  return (
    <FadeIn delay={0.1}>
      <Card className="border-dashed border-evergreen/30 glass-strong overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
        <CardContent className="py-16 md:py-20 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 14 }}
            className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-evergreen/15 via-gold/10 to-berry/10 mb-5 ring-1 ring-evergreen/20"
          >
            <BarChart3 className="h-9 w-9 text-evergreen" />
          </motion.div>
          <h2 className="font-serif text-2xl md:text-3xl font-bold mb-2">
            <span className="gradient-text-evergreen">No analytics yet</span>
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Create your first page or post to start seeing analytics. Once visitors
            land on your content, insights will appear here automatically.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              onClick={() => navigate({ name: 'dashboard' })}
              className="bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive btn-glow overflow-hidden"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Create Page
            </Button>
            <Button
              onClick={() => navigate({ name: 'post-editor' })}
              variant="outline"
              className="border-berry/40 text-berry hover:bg-berry/5"
            >
              <FileText className="h-4 w-4 mr-1.5" /> Create Post
            </Button>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  )
}

// ── Section header (slide in from left) ───────────────────────────────────
function SectionHeader({
  icon, title, subtitle, accent,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  accent: Accent
}) {
  const a = ACCENTS[accent]
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center gap-3"
    >
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${a.bg} ${a.text}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-serif text-xl md:text-2xl font-bold tracking-tight truncate">{title}</h2>
        <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>
      </div>
    </motion.div>
  )
}

// ── Hero stat card ────────────────────────────────────────────────────────
function HeroStatCard({
  icon, value, label, sub, accent,
}: {
  icon: React.ReactNode
  value: number
  label: string
  sub: string
  accent: Accent
}) {
  const a = ACCENTS[accent]
  return (
    <TiltCard intensity={5}>
      <Card className={`relative overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-1 ${a.ring}`}>
        {/* Gradient wash + drifting orb */}
        <div className={`absolute inset-0 ${a.wash}`} aria-hidden />
        <div
          className={`absolute -top-6 -right-6 h-20 w-20 rounded-full ${a.orb} blur-2xl animate-pulse`}
          aria-hidden
        />
        <div className={`h-1.5 w-full ${a.bar}`} />
        <CardContent className="relative py-5">
          <div className="flex items-start justify-between mb-3">
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${a.gradientIcon}`}
            >
              {icon}
            </motion.div>
          </div>
          <p className={`text-3xl md:text-4xl font-bold font-serif leading-none ${a.text}`}>
            <CountUp value={value} duration={1500} />
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1.5 font-semibold">{label}</p>
          <p className="text-[10px] text-muted-foreground/80 mt-1 truncate" title={sub}>{sub}</p>
        </CardContent>
      </Card>
    </TiltCard>
  )
}

// ── Secondary stat card (smaller) ──────────────────────────────────────────
function SecondaryStatCard({
  icon, value, label, hint, accent, suffix,
}: {
  icon: React.ReactNode
  value: number
  label: string
  hint: string
  accent: Accent
  suffix?: string
}) {
  const a = ACCENTS[accent]
  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 hover:${a.ring} ${a.ring} bg-card/80 backdrop-blur-sm`}>
      <div className={`absolute inset-0 ${a.wash}`} aria-hidden />
      <div className={`h-1 w-full ${a.bar}`} />
      <CardContent className="relative py-5">
        <div className="flex items-center gap-3">
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${a.bg} ${a.text} flex-shrink-0`}>
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-2xl md:text-3xl font-bold font-serif leading-none ${a.text}`}>
              <CountUp value={value} duration={1200} suffix={suffix} />
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1 font-semibold truncate">{label}</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-2 truncate" title={hint}>{hint}</p>
      </CardContent>
    </Card>
  )
}

// ── Top Performing Pages card ─────────────────────────────────────────────
function TopPagesCard({
  overview, navigate,
}: {
  overview: Overview
  navigate: (v: View) => void
}) {
  const pages = (overview.topPages || []).filter(p => p && p.id)

  if (pages.length === 0) {
    return (
      <Card className="border-dashed border-evergreen/30 bg-card/60 backdrop-blur-sm">
        <CardContent className="py-12 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-evergreen/10 mb-3">
            <LayoutDashboard className="h-6 w-6 text-evergreen/70" />
          </div>
          <p className="font-medium text-foreground mb-1">No pages yet</p>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Create your first page to start tracking per-page views.
          </p>
          <Button
            size="sm"
            onClick={() => navigate({ name: 'dashboard' })}
            className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Create your first page
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden shadow-festive glass-strong border-evergreen/25">
      {/* Gradient header strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-evergreen/10 text-evergreen">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="font-serif text-base sm:text-lg flex items-center gap-2">
                Pages Leaderboard
              </CardTitle>
              <CardDescription className="text-xs">Top {pages.length} by views (30d)</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30">
            <Eye className="h-3 w-3 mr-1" />
            <CountUp value={overview.totalPageViews30d} duration={1500} /> total views
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Horizontal scroll on tablet/desktop; wraps on mobile */}
        <div className="flex gap-3 overflow-x-auto pb-3 -mx-2 px-2 snap-x snap-mandatory">
          {pages.map((p, idx) => (
            <TopPageTile key={p.id} page={p} rank={idx + 1} navigate={navigate} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TopPageTile({
  page, rank, navigate,
}: {
  page: TopPage
  rank: number
  navigate: (v: View) => void
}) {
  const emoji = PAGE_TYPE_EMOJI[page.pageType] || '📄'
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: Math.min(rank * 0.05, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className="snap-start flex-shrink-0 w-64"
    >
      <Card className="relative overflow-hidden h-full transition-all hover:shadow-elevated hover:-translate-y-1 hover:border-gold/40 border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="absolute top-2 right-2 z-10">
          <span className="inline-flex h-6 min-w-6 px-1.5 items-center justify-center rounded-full bg-gradient-to-br from-evergreen/15 to-gold/10 text-evergreen text-xs font-bold ring-1 ring-evergreen/20">
            #{rank}
          </span>
        </div>
        <div className="h-1 w-full bg-gradient-to-r from-evergreen to-evergreen-light" />
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-evergreen/10 to-gold/5 text-2xl ring-1 ring-border/40">
              {emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate" title={page.title}>{page.title}</h3>
              <p className="text-[11px] text-muted-foreground truncate font-mono">/p/{page.slug}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1 text-evergreen font-semibold text-lg">
              <Eye className="h-4 w-4" />
              <CountUp value={page.views} duration={1200} />
            </span>
            <ModBadge state={page.moderationState} />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full border-evergreen/30 text-evergreen hover:bg-evergreen/5 text-xs"
            onClick={() => navigate({ name: 'public', slug: page.slug })}
          >
            View page <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ── Top Performing Posts card ──────────────────────────────────────────────
function TopPostsCard({
  overview, navigate,
}: {
  overview: Overview
  navigate: (v: View) => void
}) {
  const posts = (overview.topPosts || []).filter(p => p && p.id)

  if (posts.length === 0) {
    return (
      <Card className="border-dashed border-berry/30 bg-card/60 backdrop-blur-sm">
        <CardContent className="py-12 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-berry/10 mb-3">
            <FileText className="h-6 w-6 text-berry/70" />
          </div>
          <p className="font-medium text-foreground mb-1">No posts yet</p>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Create your first post to start tracking engagement.
          </p>
          <Button
            size="sm"
            onClick={() => navigate({ name: 'post-editor' })}
            className="bg-berry text-cream hover:bg-berry/80 btn-glow overflow-hidden"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Create your first post
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden shadow-festive glass-strong border-berry/25">
      <div className="h-1.5 w-full bg-gradient-to-r from-berry via-gold to-evergreen" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-berry/10 text-berry">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="font-serif text-base sm:text-lg flex items-center gap-2">
                Posts Leaderboard
              </CardTitle>
              <CardDescription className="text-xs">Top {posts.length} by views</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="bg-berry/5 text-berry border-berry/30">
            <Eye className="h-3 w-3 mr-1" />
            <CountUp value={overview.totalPostViews30d} duration={1500} /> total views
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <StaggerContainer className="space-y-3" stagger={0.07}>
          {posts.map((post, idx) => (
            <StaggerItem key={post.id} y={15}>
              <TopPostRow post={post} rank={idx + 1} navigate={navigate} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </CardContent>
    </Card>
  )
}

function TopPostRow({
  post, rank, navigate,
}: {
  post: TopPost
  rank: number
  navigate: (v: View) => void
}) {
  const emoji = POST_TYPE_EMOJI[post.type] || '📝'
  return (
    <div className="relative flex flex-col sm:flex-row gap-4 p-3 sm:p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/40 hover:border-berry/30 hover:shadow-festive transition-all">
      {/* Rank badge (mobile top-right, desktop left) */}
      <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 sm:w-12 flex-shrink-0">
        <span className="inline-flex h-7 min-w-7 px-1.5 items-center justify-center rounded-full bg-gradient-to-br from-berry/15 to-gold/10 text-berry text-xs font-bold ring-1 ring-berry/20">
          #{rank}
        </span>
        <Badge variant="outline" className="bg-berry/5 text-berry border-berry/30 text-[10px] uppercase tracking-wider">
          {post.type || 'POST'}
        </Badge>
      </div>

      {/* Cover image / emoji placeholder */}
      <div className="flex-shrink-0 w-full sm:w-28 h-24 sm:h-20 rounded-lg overflow-hidden bg-gradient-to-br from-berry/10 via-gold/5 to-evergreen/10 ring-1 ring-border/40 flex items-center justify-center">
        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide broken images so the gradient placeholder shows through
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <span className="text-3xl">{emoji}</span>
        )}
      </div>

      {/* Title + excerpt */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-sm sm:text-base line-clamp-2 mb-1" title={post.title}>
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{post.excerpt}</p>
        )}
        {/* Engagement pills */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          <EngagementPill icon={<Eye className="h-3 w-3" />} value={post.views} label="views" accent="evergreen" />
          <EngagementPill icon={<Heart className="h-3 w-3" />} value={post.likes} label="likes" accent="cranberry" />
          <EngagementPill icon={<MessageCircle className="h-3 w-3" />} value={post.comments} label="comments" accent="gold" />
          <EngagementPill icon={<Share2 className="h-3 w-3" />} value={post.shares} label="shares" accent="berry" />
          <EngagementPill icon={<Bookmark className="h-3 w-3" />} value={post.saves} label="saves" accent="sage" />
        </div>
      </div>

      {/* View button */}
      <div className="flex sm:flex-col items-center sm:items-end gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="border-berry/30 text-berry hover:bg-berry/5 text-xs w-full sm:w-auto"
          onClick={() => navigate({
            name: 'public-post',
            postId: post.id,
            slug: post.slug,
          })}
        >
          View post <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
    </div>
  )
}

function EngagementPill({
  icon, value, label, accent,
}: {
  icon: React.ReactNode
  value: number
  label: string
  accent: Accent
}) {
  const a = ACCENTS[accent]
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${a.bg} ${a.text} ring-1 ring-border/40`}
      title={`${value.toLocaleString()} ${label}`}
    >
      {icon}
      <CountUp value={value} duration={1200} />
    </span>
  )
}

// ── BreakdownCard (countries / devices / sources) ─────────────────────────
function BreakdownCard({
  title, icon, data, format, accent,
}: {
  title: string
  icon: React.ReactNode
  data?: string
  format: 'country' | 'device' | 'default'
  accent: Accent
}) {
  const a = ACCENTS[accent]
  let parsed: Record<string, number> = {}
  try {
    parsed = data ? JSON.parse(data) : {}
  } catch {
    parsed = {}
  }
  const total = Object.values(parsed).reduce((s, v) => s + v, 0) || 1
  const entries = Object.entries(parsed).sort((x, y) => y[1] - x[1]).slice(0, 5)

  return (
    <Card className={`relative overflow-hidden bg-card/80 backdrop-blur-sm ${a.ring} transition-all hover:shadow-elevated hover:-translate-y-0.5`}>
      <div className={`h-1 w-full ${a.bar}`} />
      <CardHeader className="pb-3">
        <CardTitle className={`text-sm font-semibold flex items-center gap-2 ${a.text}`}>
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${a.bg}`}>
            {icon}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="py-6 text-center">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${a.bg} ${a.text} opacity-70 mb-2`}>
              {icon}
            </div>
            <p className="text-xs text-muted-foreground">No data yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(([k, v], i) => {
              const pct = Math.round((v / total) * 100)
              const label = format === 'country' ? (COUNTRY_NAMES[k] || k) : format === 'device' ? (DEVICE_LABELS[k] || k) : k
              const leading = format === 'country' ? countryFlag(k) : format === 'device' ? <DeviceIcon device={k} /> : null
              return (
                <div key={`${k}-${i}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 min-w-0">
                      {leading && <span className="flex-shrink-0">{leading}</span>}
                      <span className="truncate" title={label}>{label}</span>
                    </span>
                    <span className="text-muted-foreground font-mono flex-shrink-0 ml-2">
                      <CountUp value={v} duration={1000} />
                      <span className="ml-1 text-muted-foreground/60">({pct}%)</span>
                    </span>
                  </div>
                  <div className="bg-muted/30 rounded-full h-2 overflow-hidden ring-1 ring-border/30">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true, margin: '-20px' }}
                      transition={{
                        duration: 0.9,
                        delay: Math.min(i * 0.08, 0.4),
                        type: 'spring',
                        stiffness: 80,
                        damping: 18,
                      }}
                      className={`h-full ${a.bar} rounded-full shadow-sm`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DeviceIcon({ device }: { device: string }) {
  const d = (device || '').toLowerCase()
  if (d === 'mobile') return <Smartphone className="h-3.5 w-3.5" />
  if (d === 'tablet') return <Tablet className="h-3.5 w-3.5" />
  if (d === 'desktop') return <Monitor className="h-3.5 w-3.5" />
  return <Smartphone className="h-3.5 w-3.5" />
}

// ── Moderation badge (matches dashboard-view.tsx styles) ───────────────────
function ModBadge({ state }: { state: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Pending', cls: 'pill-pending' },
    APPROVED: { label: 'Approved', cls: 'pill-approved' },
    RESTRICTED: { label: 'Restricted', cls: 'pill-restricted' },
    SUSPENDED: { label: 'Suspended', cls: 'pill-suspended' },
    BANNED: { label: 'Banned', cls: 'pill-banned' },
  }
  const c = config[state] || { label: state, cls: 'pill-draft' }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${c.cls}`}>
      {c.label}
    </span>
  )
}
