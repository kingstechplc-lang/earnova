'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ChevronLeft, TrendingUp, Sparkles, Award, Eye, Users, CheckCircle2,
  Lock, Trophy, ArrowRight, Lightbulb, Target, Rocket, RefreshCw,
} from 'lucide-react'
import { CountUp } from '@/components/animated/count-up'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animated/motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { TiltCard } from '@/components/animated/tilt-card'
import { useConfetti } from '@/components/animated/confetti'
import { safeFetch } from '@/lib/safe-fetch'
import type { View, CurrentUser } from '@/app/page'

// ── API response shapes (mirrors /api/grow) ──────────────────────────────
type InsightType = 'positive' | 'neutral' | 'action_needed'

type Insight = {
  id: string
  type: InsightType
  icon: string
  title: string
  body: string
}

type Milestone = {
  id: string
  type: string
  name: string
  description: string
  icon: string
  color: string
  threshold: number
  achieved: boolean
  achievedAt: string | null
  claimed: boolean
}

type Recommendation = {
  id: string
  icon: string
  title: string
  action: string
}

type GrowStats = {
  totalPages: number
  publishedPages: number
  totalPosts: number
  publishedPosts: number
  followers: number
  totalViews30d: number
  profileViews30d: number
  totalEngagement: number
  profileCompletion: number
  achievedMilestones: number
  totalMilestones: number
  newMilestones: number
}

type GrowResponse = {
  insights: Insight[]
  milestones: Milestone[]
  recommendations: Recommendation[]
  stats: GrowStats
}

// ── Accent system — brand palette (evergreen / gold / berry / cranberry / sage)
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

// Map insight type → accent + label
const INSIGHT_ACCENT: Record<InsightType, { accent: Accent; label: string }> = {
  positive: { accent: 'evergreen', label: 'Positive' },
  neutral: { accent: 'gold', label: 'Insight' },
  action_needed: { accent: 'cranberry', label: 'Action needed' },
}

// Recommendation id → view to navigate to
const RECOMMENDATION_VIEW: Record<string, View> = {
  'claim-username': { name: 'profile-setup' },
  'create-page': { name: 'dashboard' },
  'publish-post': { name: 'post-editor' },
  'complete-profile': { name: 'profile-setup' },
  'publish-page': { name: 'dashboard' },
  'share-page': { name: 'dashboard' },
}

// ── Main view ────────────────────────────────────────────────────────────
export default function GrowView({
  user, navigate,
}: {
  user: CurrentUser
  navigate: (v: View) => void
}) {
  const [data, setData] = useState<GrowResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const { fire, ConfettiLayer } = useConfetti()

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const res = await safeFetch<GrowResponse>('/api/grow')
    if (res.error) {
      setLoadError(res.error)
    } else if (res.data) {
      setData(res.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      const res = await safeFetch<GrowResponse>('/api/grow')
      if (cancelled) return
      if (res.error) setLoadError(res.error)
      else if (res.data) setData(res.data)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  // Claim a milestone: POST /api/grow/milestones/[id]/claim, fire confetti, update local state
  const claimMilestone = useCallback(async (id: string) => {
    if (claimingId) return
    setClaimingId(id)
    const res = await safeFetch<{ ok?: boolean; milestone?: { id: string } }>(
      `/api/grow/milestones/${id}/claim`,
      { method: 'POST' },
    )
    setClaimingId(null)
    if (!res.error) {
      // Burst confetti from the top-center of the viewport
      fire({ x: 0.5, y: 0.25, count: 180, spread: 80 })
      // Optimistically update local state so the Claim button → Achieved badge
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          milestones: prev.milestones.map(m =>
            m.id === id ? { ...m, claimed: true } : m,
          ),
        }
      })
    }
  }, [claimingId, fire])

  return (
    <div className="relative min-h-screen">
      {/* Ambient background — mesh + 2 evergreen/gold orbs (matches dashboard + analytics) */}
      <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" aria-hidden />
      <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-25" />
      {/* Confetti overlay — rendered above everything when fired */}
      {ConfettiLayer}

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
                  <TrendingUp className="h-5 w-5" />
                </motion.span>
                <span className="text-xs uppercase tracking-wider font-semibold text-evergreen">
                  Growth &amp; milestones
                </span>
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mb-2">
                <span className="gradient-text-evergreen">Grow Center</span>
              </h1>
              <p className="text-muted-foreground">
                Insights, milestones, and recommendations to grow your audience.
              </p>
              {data && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30">
                    <Sparkles className="h-3 w-3 mr-1" />
                    {data.stats.achievedMilestones}/{data.stats.totalMilestones} milestones
                  </Badge>
                  {data.stats.newMilestones > 0 && (
                    <Badge className="bg-gold/15 text-gold-dark border-gold/30 animate-pulse">
                      <Trophy className="h-3 w-3 mr-1" />
                      {data.stats.newMilestones} new!
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </FadeIn>

        {/* Body — loading / error / data */}
        {loading ? (
          <GrowSkeleton />
        ) : loadError && !data ? (
          <FadeIn>
            <Alert className="border-cranberry/40 bg-cranberry/5">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cranberry/10 mr-2">
                <TrendingUp className="h-4 w-4 text-cranberry" />
              </div>
              <AlertDescription className="text-cranberry">
                <p className="font-medium mb-1">Couldn&apos;t load your Grow Center.</p>
                <p className="text-sm text-muted-foreground mb-3">{loadError}</p>
                <Button size="sm" variant="outline" onClick={() => load()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Try again
                </Button>
              </AlertDescription>
            </Alert>
          </FadeIn>
        ) : data ? (
          <div className="space-y-10">
            {/* ── Stats summary (4 TiltCards with CountUp) ──────────────────── */}
            <StaggerContainer className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <StaggerItem>
                <StatCard
                  icon={<Target className="h-5 w-5" />}
                  value={data.stats.profileCompletion}
                  suffix="%"
                  label="Profile Completion"
                  sub="Discoverability score"
                  accent="evergreen"
                />
              </StaggerItem>
              <StaggerItem>
                <StatCard
                  icon={<Award className="h-5 w-5" />}
                  value={data.stats.achievedMilestones}
                  customDisplay={`${data.stats.achievedMilestones}/${data.stats.totalMilestones}`}
                  label="Achieved Milestones"
                  sub="Of total milestones"
                  accent="gold"
                />
              </StaggerItem>
              <StaggerItem>
                <StatCard
                  icon={<Users className="h-5 w-5" />}
                  value={data.stats.followers}
                  label="Total Followers"
                  sub="Your audience"
                  accent="berry"
                />
              </StaggerItem>
              <StaggerItem>
                <StatCard
                  icon={<Eye className="h-5 w-5" />}
                  value={data.stats.totalViews30d}
                  label="Total Views"
                  sub="Last 30 days"
                  accent="sage"
                />
              </StaggerItem>
            </StaggerContainer>

            {/* ── Insights section ─────────────────────────────────────────── */}
            <section>
              <SectionHeader
                icon={<Lightbulb className="h-5 w-5" />}
                title="Insights"
                subtitle="What's happening with your content, surfaced automatically"
                accent="evergreen"
              />
              {data.insights.length === 0 ? (
                <FadeIn delay={0.05}>
                  <Card className="border-dashed border-evergreen/30 bg-card/60 backdrop-blur-sm mt-4">
                    <CardContent className="py-12 text-center">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-evergreen/10 mb-3">
                        <Lightbulb className="h-6 w-6 text-evergreen/70" />
                      </div>
                      <p className="font-medium text-foreground mb-1">No insights yet</p>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Once you start publishing and getting visitors, insights about your
                        traffic and engagement will appear here.
                      </p>
                    </CardContent>
                  </Card>
                </FadeIn>
              ) : (
                <StaggerContainer className="grid gap-4 mt-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3" stagger={0.07}>
                  {data.insights.map(insight => (
                    <StaggerItem key={insight.id}>
                      <InsightCard insight={insight} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              )}
            </section>

            {/* ── Recommendations section ────────────────────────────────────── */}
            <section>
              <SectionHeader
                icon={<Rocket className="h-5 w-5" />}
                title="Recommendations"
                subtitle="Actionable steps to grow your audience"
                accent="berry"
              />
              {data.recommendations.length === 0 ? (
                <FadeIn delay={0.05}>
                  <Card className="border-dashed border-gold/40 bg-gradient-to-br from-gold/5 to-transparent mt-4">
                    <CardContent className="py-12 text-center">
                      <motion.div
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 180, damping: 14 }}
                        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 mb-3 ring-1 ring-gold/30"
                      >
                        <span className="text-3xl" role="img" aria-label="celebrate">🎉</span>
                      </motion.div>
                      <p className="font-medium text-foreground mb-1">You&apos;re all caught up! 🎉</p>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        No outstanding recommendations right now. Keep creating and engaging
                        with your audience.
                      </p>
                    </CardContent>
                  </Card>
                </FadeIn>
              ) : (
                <StaggerContainer className="grid gap-4 mt-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3" stagger={0.07}>
                  {data.recommendations.map(rec => (
                    <StaggerItem key={rec.id}>
                      <RecommendationCard
                        rec={rec}
                        navigate={navigate}
                      />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              )}
            </section>

            {/* ── Milestones section ────────────────────────────────────────── */}
            <section>
              <SectionHeader
                icon={<Trophy className="h-5 w-5" />}
                title="Milestones"
                subtitle="Celebrate your growth journey"
                accent="gold"
              />

              {/* Progress bar */}
              <FadeIn delay={0.05}>
                <Card className="mt-4 glass-strong border-gold/30 overflow-hidden">
                  <div className="h-1.5 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
                  <CardContent className="py-5">
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <Award className="h-5 w-5 text-gold-dark flex-shrink-0" />
                        <span className="font-serif text-lg font-bold">
                          {data.stats.achievedMilestones} of {data.stats.totalMilestones} achieved
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-gold/10 text-gold-dark border-gold/30">
                        {Math.round((data.stats.achievedMilestones / Math.max(data.stats.totalMilestones, 1)) * 100)}% complete
                      </Badge>
                    </div>
                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(data.stats.achievedMilestones / Math.max(data.stats.totalMilestones, 1)) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-evergreen via-gold to-berry shadow-[0_0_12px_rgba(212,164,55,0.45)]"
                      />
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>

              {/* New milestone celebration banner */}
              {data.stats.newMilestones > 0 && (() => {
                const newMilestone = data.milestones.find(m => m.achieved && !m.claimed)
                if (!newMilestone) return null
                return (
                  <FadeIn delay={0.1}>
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.98 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ type: 'spring', stiffness: 180, damping: 16 }}
                      className="mt-4"
                    >
                      <NewMilestoneCard
                        milestone={newMilestone}
                        onClaim={claimMilestone}
                        claiming={claimingId === newMilestone.id}
                      />
                    </motion.div>
                  </FadeIn>
                )
              })()}

              {/* Milestones grid */}
              <StaggerContainer className="grid gap-4 mt-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
                {data.milestones.map(milestone => (
                  <StaggerItem key={milestone.id} y={15}>
                    <MilestoneCard
                      milestone={milestone}
                      onClaim={claimMilestone}
                      claiming={claimingId === milestone.id}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Skeleton loader ────────────────────────────────────────────────────────
function GrowSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-40 rounded-xl shimmer-bg" />
        ))}
      </div>
      {/* Insights */}
      <div>
        <div className="h-8 w-48 rounded-lg shimmer-bg mb-4" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-36 rounded-xl shimmer-bg" />
          ))}
        </div>
      </div>
      {/* Recommendations */}
      <div>
        <div className="h-8 w-56 rounded-lg shimmer-bg mb-4" />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map(i => (
            <div key={i} className="h-24 rounded-xl shimmer-bg" />
          ))}
        </div>
      </div>
      {/* Milestones */}
      <div>
        <div className="h-8 w-40 rounded-lg shimmer-bg mb-4" />
        <div className="h-20 rounded-xl shimmer-bg mb-4" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 rounded-xl shimmer-bg" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Section header (slide in from left, matches analytics-view) ───────────
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

// ── Stat card (TiltCard + CountUp) ──────────────────────────────────────────
function StatCard({
  icon, value, label, sub, accent, suffix, customDisplay,
}: {
  icon: React.ReactNode
  value: number
  label: string
  sub: string
  accent: Accent
  suffix?: string
  customDisplay?: string
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
            {customDisplay ? (
              <span>{customDisplay}</span>
            ) : (
              <CountUp value={value} duration={1500} suffix={suffix} />
            )}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1.5 font-semibold">{label}</p>
          <p className="text-[10px] text-muted-foreground/80 mt-1 truncate" title={sub}>{sub}</p>
        </CardContent>
      </Card>
    </TiltCard>
  )
}

// ── Insight card ─────────────────────────────────────────────────────────────
function InsightCard({ insight }: { insight: Insight }) {
  const config = INSIGHT_ACCENT[insight.type] || INSIGHT_ACCENT.neutral
  const a = ACCENTS[config.accent]
  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 ${a.ring} glass-strong`}>
      {/* Color-coded left border based on type */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${a.bar}`} aria-hidden />
      <CardContent className="relative py-5 pl-6">
        <div className="flex items-start gap-3">
          <motion.span
            initial={{ scale: 0, rotate: -15 }}
            whileInView={{ scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 200, damping: 14 }}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${a.gradientIcon} text-2xl flex-shrink-0`}
          >
            <span role="img" aria-label={insight.title}>{insight.icon}</span>
          </motion.span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-sm md:text-base leading-tight">{insight.title}</h3>
              <Badge
                variant="outline"
                className={`text-[10px] uppercase tracking-wider font-bold ${a.bg} ${a.text} ${a.ring} flex-shrink-0`}
              >
                {config.label}
              </Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{insight.body}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Recommendation card ──────────────────────────────────────────────────────
function RecommendationCard({
  rec, navigate,
}: {
  rec: Recommendation
  navigate: (v: View) => void
}) {
  const target = RECOMMENDATION_VIEW[rec.id] || { name: 'dashboard' } as View
  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 border-evergreen/20 glass-strong">
      {/* Soft gradient wash on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-evergreen/5 via-transparent to-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
      <CardContent className="relative py-5 flex items-center gap-4">
        <motion.span
          initial={{ scale: 0, rotate: -15 }}
          whileInView={{ scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-evergreen/15 to-gold/15 text-2xl flex-shrink-0 ring-1 ring-evergreen/20"
        >
          <span role="img" aria-label={rec.title}>{rec.icon}</span>
        </motion.span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm md:text-base leading-tight mb-0.5">{rec.title}</h3>
          <p className="text-xs text-muted-foreground">{rec.action}</p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate(target)}
          className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden flex-shrink-0"
        >
          {rec.action}
          <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </CardContent>
    </Card>
  )
}

// ── Milestone card ───────────────────────────────────────────────────────────
function MilestoneCard({
  milestone, onClaim, claiming,
}: {
  milestone: Milestone
  onClaim: (id: string) => void
  claiming: boolean
}) {
  const { achieved, claimed, color, name, description, icon, threshold, type } = milestone
  const accentColor = color || '#0F4C3A'

  // Not achieved — grayscale + lock + progress text
  if (!achieved) {
    return (
      <Card className="relative overflow-hidden border-muted-foreground/20 bg-card/50 backdrop-blur-sm opacity-90">
        <CardContent className="relative py-5">
          <div className="flex items-start gap-3 mb-3">
            <span
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl flex-shrink-0 grayscale opacity-50 ring-1 ring-muted-foreground/20 bg-muted/40"
              style={{ color: accentColor }}
            >
              <span role="img" aria-label={name}>{icon}</span>
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm md:text-base leading-tight text-muted-foreground">{name}</h3>
              <p className="text-xs text-muted-foreground/80 mt-0.5 leading-relaxed line-clamp-2">{description}</p>
            </div>
            <Lock className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
            {milestoneProgressText(type, threshold)}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Achieved + claimed — checkmark badge + "Achieved" label
  if (claimed) {
    return (
      <TiltCard intensity={4}>
        <Card
          className="relative overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 glass-strong"
          style={{ borderColor: `${accentColor}55` }}
        >
          {/* Top color bar */}
          <div
            className="h-1.5 w-full"
            style={{ background: `linear-gradient(to right, ${accentColor}, ${accentColor}aa)` }}
          />
          {/* Soft wash */}
          <div
            className="absolute inset-0 opacity-25"
            style={{ background: `radial-gradient(circle at top right, ${accentColor}22, transparent 70%)` }}
            aria-hidden
          />
          <CardContent className="relative py-5">
            <div className="flex items-start gap-3 mb-3">
              <motion.span
                initial={{ scale: 0, rotate: -15 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl flex-shrink-0 ring-1"
                style={{
                  backgroundColor: `${accentColor}22`,
                  color: accentColor,
                  boxShadow: `inset 0 0 0 1px ${accentColor}33`,
                }}
              >
                <span role="img" aria-label={name}>{icon}</span>
              </motion.span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm md:text-base leading-tight">{name}</h3>
                <p className="text-xs text-muted-foreground/80 mt-0.5 leading-relaxed line-clamp-2">{description}</p>
              </div>
              <CheckmarkBadge color={accentColor} />
            </div>
            <Badge
              variant="outline"
              className="bg-evergreen/10 text-evergreen border-evergreen/30 text-xs font-semibold"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Achieved
            </Badge>
          </CardContent>
        </Card>
      </TiltCard>
    )
  }

  // Achieved + unclaimed — glowing border + "Claim" button
  return (
    <TiltCard intensity={5}>
      <motion.div
        initial={{ boxShadow: `0 0 0 0 ${accentColor}66` }}
        animate={{ boxShadow: `0 0 24px 0 ${accentColor}44` }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
        }}
        className="rounded-xl"
      >
        <Card
          className="relative overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 glass-strong"
          style={{ borderColor: `${accentColor}88`, boxShadow: `0 0 0 1px ${accentColor}33` }}
        >
          {/* Top gradient bar in milestone's color */}
          <div
            className="h-1.5 w-full"
            style={{ background: `linear-gradient(to right, ${accentColor}, ${accentColor}aa)` }}
          />
          {/* Soft color wash */}
          <div
            className="absolute inset-0 opacity-30"
            style={{ background: `radial-gradient(circle at top right, ${accentColor}33, transparent 70%)` }}
            aria-hidden
          />
          <CardContent className="relative py-5">
            <div className="flex items-start gap-3 mb-3">
              <motion.span
                initial={{ scale: 0, rotate: -15 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 200, damping: 14 }}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-2xl flex-shrink-0 ring-1"
                style={{
                  backgroundColor: `${accentColor}33`,
                  color: accentColor,
                  boxShadow: `0 0 16px ${accentColor}55, inset 0 0 0 1px ${accentColor}55`,
                }}
              >
                <span role="img" aria-label={name}>{icon}</span>
              </motion.span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm md:text-base leading-tight">{name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{description}</p>
              </div>
              <Sparkles className="h-4 w-4 flex-shrink-0 animate-pulse" style={{ color: accentColor }} />
            </div>
            <Button
              size="sm"
              onClick={() => onClaim(milestone.id)}
              disabled={claiming}
              className="w-full bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
              style={claiming ? undefined : { boxShadow: `0 0 12px ${accentColor}66` }}
            >
              {claiming ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-cream/30 border-t-cream rounded-full animate-spin mr-1.5" />
                  Claiming…
                </>
              ) : (
                <>
                  <Trophy className="h-3.5 w-3.5 mr-1.5" />
                  Claim reward
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </TiltCard>
  )
}

// ── New milestone celebration card ────────────────────────────────────────────
function NewMilestoneCard({
  milestone, onClaim, claiming,
}: {
  milestone: Milestone
  onClaim: (id: string) => void
  claiming: boolean
}) {
  const accentColor = milestone.color || '#D4A437'
  return (
    <Card className="relative overflow-hidden border-gold/50 glass-strong">
      {/* Gold glow effect */}
      <motion.div
        initial={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 30% 50%, ${accentColor}33, transparent 60%), radial-gradient(circle at 70% 50%, #D4A43733, transparent 60%)`,
        }}
        aria-hidden
      />
      {/* Gold top strip */}
      <div className="h-1.5 w-full bg-gradient-to-r from-gold via-gold-light to-gold-dark" />
      <CardContent className="relative py-6 md:py-8">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 12 }}
            className="inline-flex h-16 w-16 items-center justify-center rounded-3xl text-4xl flex-shrink-0 ring-2 ring-gold/40 shadow-gold"
            style={{
              backgroundColor: `${accentColor}33`,
              color: accentColor,
            }}
          >
            <span role="img" aria-label={milestone.name}>{milestone.icon}</span>
          </motion.span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1 flex-wrap">
              <Badge className="bg-gold/20 text-gold-dark border-gold/40">
                <Trophy className="h-3 w-3 mr-1" /> New milestone unlocked!
              </Badge>
            </div>
            <h3 className="font-serif text-xl md:text-2xl font-bold mb-1">
              🎉 <span className="gradient-text-evergreen">{milestone.name}</span>
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">{milestone.description}</p>
          </div>
          <Button
            size="lg"
            onClick={() => onClaim(milestone.id)}
            disabled={claiming}
            className="bg-gradient-to-r from-gold to-gold-dark text-cream hover:brightness-110 btn-glow overflow-hidden flex-shrink-0 shadow-gold"
          >
            {claiming ? (
              <>
                <span className="h-4 w-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin mr-2" />
                Claiming…
              </>
            ) : (
              <>
                <Trophy className="h-4 w-4 mr-2" />
                Claim reward
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Checkmark badge (used on claimed milestones) ────────────────────────────
function CheckmarkBadge({ color }: { color: string }) {
  return (
    <motion.span
      initial={{ scale: 0, rotate: -90 }}
      whileInView={{ scale: 1, rotate: 0 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 220, damping: 12 }}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0"
      style={{
        backgroundColor: color,
        boxShadow: `0 0 8px ${color}88`,
      }}
    >
      <CheckCircle2 className="h-4 w-4 text-cream" />
    </motion.span>
  )
}

// ── Milestone progress text for not-yet-achieved milestones ─────────────────
function milestoneProgressText(type: string, threshold: number): string {
  switch (type) {
    case 'FIRST_PAGE':
      return 'Create 1 page to unlock'
    case 'FIRST_POST':
      return 'Publish 1 post to unlock'
    case 'FIRST_FOLLOWER':
      return 'Get 1 follower to unlock'
    case 'TEN_FOLLOWERS':
      return `Reach ${threshold} followers to unlock`
    case 'HUNDRED_FOLLOWERS':
      return `Reach ${threshold} followers to unlock`
    case 'HUNDRED_VISITORS':
      return `Reach ${threshold} visitors to unlock`
    case 'FIRST_REACTION':
      return 'Get 1 reaction to unlock'
    case 'FIRST_COMMENT':
      return 'Get 1 comment to unlock'
    case 'FIRST_SHARE':
      return 'Get 1 share to unlock'
    case 'CAMPAIGN_PARTICIPANT':
      return 'Join a campaign to unlock'
    case 'PROFILE_COMPLETE':
      return 'Complete your profile to unlock'
    default:
      return `Reach threshold ${threshold} to unlock`
  }
}
