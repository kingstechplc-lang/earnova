'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ShieldAlert, ShieldCheck, Zap, Activity, Megaphone, Network, Sliders, Users, FileText, Clock,
} from 'lucide-react'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { FadeIn } from '@/components/animated/motion'
import { useConfetti } from '@/components/animated/confetti'
import { safeFetch } from '@/lib/safe-fetch'
import { AdminOverview } from '@/components/admin/overview-section'
import { CampaignsSection } from '@/components/admin/campaigns-section'
import { NetworksSection } from '@/components/admin/networks-section'
import { CompatibilitySection } from '@/components/admin/compatibility-section'
import { PolicySection } from '@/components/admin/policy-section'
import { UsersSection } from '@/components/admin/users-section'
import { PagesSection } from '@/components/admin/pages-section'
import { PlatformIntegrationsSection } from '@/components/admin/platform-integrations-section'
import type { View, CurrentUser } from '@/app/page'

type Tab = 'overview' | 'campaigns' | 'platform-ads' | 'networks' | 'compatibility' | 'policy' | 'users' | 'pages' | 'reviews'

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode; adminOnly?: boolean }> = [
  { id: 'overview', label: 'Overview', icon: <Activity className="h-4 w-4" /> },
  { id: 'campaigns', label: 'Campaigns', icon: <Megaphone className="h-4 w-4" /> },
  { id: 'platform-ads', label: 'Platform ads', icon: <Zap className="h-4 w-4" />, adminOnly: true },
  { id: 'networks', label: 'Ad networks', icon: <Network className="h-4 w-4" />, adminOnly: true },
  { id: 'compatibility', label: 'Compatibility', icon: <Sliders className="h-4 w-4" />, adminOnly: true },
  { id: 'policy', label: 'Policy', icon: <Sliders className="h-4 w-4" />, adminOnly: true },
  { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" />, adminOnly: true },
  { id: 'pages', label: 'Pages', icon: <FileText className="h-4 w-4" /> },
  { id: 'reviews', label: 'Reviews', icon: <Clock className="h-4 w-4" /> },
]

type StatsData = {
  users: { total: number; admins: number }
  pages: { total: number; published: number; pending: number; banned: number }
  campaigns: { total: number; active: number }
  integrations: { total: number; pending: number; approved: number; revoked: number }
  networks: { total: number; active: number }
  trustScoresComputed: number
}
type RecentEvent = any

export default function AdminView({
  user, navigate,
}: {
  user: CurrentUser
  navigate: (v: View) => void
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<StatsData | null>(null)
  const [events, setEvents] = useState<RecentEvent[]>([])
  const [policy, setPolicy] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const { ConfettiLayer } = useConfetti()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      const [statsRes, policyRes] = await Promise.all([
        safeFetch<{ stats?: StatsData; recentEvents?: RecentEvent[] }>('/api/admin/stats'),
        safeFetch<{ policy?: any }>('/api/admin/policy'),
      ])
      if (cancelled) return
      if (statsRes.error) setLoadError(statsRes.error)
      if (statsRes.data) {
        setStats(statsRes.data.stats || null)
        setEvents(statsRes.data.recentEvents || [])
      }
      if (policyRes.data?.policy) setPolicy(policyRes.data.policy)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const visibleTabs = TABS.filter(t => !t.adminOnly || user.role === 'ADMIN')

  return (
    <div className="view-fade container mx-auto px-4 py-6 max-w-5xl">
      {ConfettiLayer}
      <FadeIn>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'dashboard' })}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        </div>
      </FadeIn>

      {/* Hero header */}
      <FadeIn delay={0.05}>
        <div className="mb-6 relative overflow-hidden rounded-2xl border border-evergreen/30 bg-gradient-to-br from-evergreen/10 via-background to-gold/5 p-6 md:p-8">
          <FloatingOrbs count={2} colors={['evergreen', 'gold']} />
          <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-evergreen/20 blur-3xl animate-pulse" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive"
              >
                <ShieldCheck className="h-4 w-4" />
              </motion.span>
              <span className="text-xs uppercase tracking-wider font-semibold text-evergreen">Admin Console</span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mb-2">Platform controls</h1>
            <p className="text-muted-foreground">
              Logged in as <strong className="text-foreground">{user.email}</strong> ·{' '}
              <span className="text-evergreen font-medium">{user.role}</span>
            </p>
          </div>
        </div>
      </FadeIn>

      {loadError && (
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Couldn&apos;t load admin data</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <FadeIn delay={0.1}>
        <div className="mb-6 flex flex-wrap gap-1 p-1 rounded-xl bg-muted/40 border border-border/60 overflow-x-auto">
          {visibleTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-background text-evergreen shadow-festive'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.id === 'reviews' && stats && stats.integrations.pending > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-gold text-cream text-[10px] font-bold h-4 min-w-4 px-1">
                  {stats.integrations.pending}
                </span>
              )}
              {tab === t.id && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute -bottom-1 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-evergreen via-gold to-berry"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          {loading && tab === 'overview' ? (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-32 rounded-xl shimmer-bg" />)}
            </div>
          ) : (
            <>
              {tab === 'overview' && stats && <AdminOverview stats={stats} events={events} />}
              {tab === 'campaigns' && <CampaignsSection />}
              {tab === 'platform-ads' && user.role === 'ADMIN' && <PlatformIntegrationsSection />}
              {tab === 'networks' && user.role === 'ADMIN' && <NetworksSection />}
              {tab === 'compatibility' && user.role === 'ADMIN' && <CompatibilitySection />}
              {tab === 'policy' && user.role === 'ADMIN' && <PolicySection initialPolicy={policy} />}
              {tab === 'users' && user.role === 'ADMIN' && <UsersSection />}
              {tab === 'pages' && <PagesSection />}
              {tab === 'reviews' && <ReviewsSection />}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// Inline reviews section (kept here for simplicity — same as before but uses the existing /api/admin/pending route)
function ReviewsSection() {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm text-muted-foreground">
          The &quot;Reviews&quot; tab content is now on the &quot;Pages&quot; tab — pick a page and change its moderation state.
          Ad-integration reviews are available on the user detail panel (Users tab → click chevron).
        </p>
      </CardContent>
    </Card>
  )
}
