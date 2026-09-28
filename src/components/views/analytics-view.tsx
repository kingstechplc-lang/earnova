'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  ChevronLeft, Activity, BarChart3, RefreshCw, Info, Users, Eye, Globe2, Smartphone,
} from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'

type Analytics = {
  visitors7d: number; visitors30d: number
  pageViews7d: number; pageViews30d: number
  uniqueVisitors30d: number; returningVisitors30d: number
  topCountries: string; topDevices: string; topSources: string
}

type TrustScore = {
  trafficQuality: number; contentRisk: number; adRisk: number; spamRisk: number
  composite: number; computedAt: string; signalBreakdown: string
}

export default function AnalyticsView({
  pageId, user, navigate,
}: {
  pageId: string
  user: CurrentUser
  navigate: (v: View) => void
}) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [recomputing, setRecomputing] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await fetch(`/api/analytics/${pageId}`)
      if (cancelled) return
      if (res.ok) {
        const d = await res.json()
        setAnalytics(d.analytics)
        setTrustScore(d.trustScore)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [pageId])

  async function recomputeScore() {
    setRecomputing(true)
    const res = await fetch(`/api/analytics/${pageId}`, { method: 'POST' })
    if (res.ok) {
      const d = await res.json()
      setTrustScore(d.trustScore)
    }
    setRecomputing(false)
  }

  if (loading) return <div className="container mx-auto px-4 py-8">Loading…</div>

  return (
    <div className="view-fade container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'dashboard' })}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      {/* Hero header */}
      <div className="mb-8 relative overflow-hidden rounded-2xl border border-evergreen/30 bg-gradient-to-br from-evergreen/10 via-background to-gold/5 p-6 md:p-8">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-evergreen/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive">
              <BarChart3 className="h-4 w-4" />
            </span>
            <span className="text-xs uppercase tracking-wider font-semibold text-evergreen">Analytics</span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mb-2">Traffic insights</h1>
          <p className="text-muted-foreground">Platform-side stats only. For verified earnings, consult your ad-network dashboard.</p>
        </div>
      </div>

      {/* Compliance alert */}
      <Alert className="mb-6 border-gold/30 bg-gold/5">
        <Info className="h-4 w-4 text-gold-dark" />
        <AlertDescription>
          This dashboard shows <strong>platform-side traffic analytics only</strong>. For verified
          earnings data, consult your ad-network dashboard (Adsterra or Monetag) directly.
          The platform does not estimate or display earnings.
        </AlertDescription>
      </Alert>

      {/* Stats cards */}
      <div className="grid gap-4 mb-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          value={analytics?.visitors7d ?? 0}
          label="Visitors (7d)"
          accent="evergreen"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          value={analytics?.visitors30d ?? 0}
          label="Visitors (30d)"
          accent="gold"
        />
        <StatCard
          icon={<Eye className="h-5 w-5" />}
          value={analytics?.pageViews7d ?? 0}
          label="Page views (7d)"
          accent="berry"
        />
        <StatCard
          icon={<Eye className="h-5 w-5" />}
          value={analytics?.pageViews30d ?? 0}
          label="Page views (30d)"
          accent="evergreen"
        />
      </div>

      {/* Breakdowns */}
      <div className="grid gap-4 mb-6 md:grid-cols-2">
        <BreakdownCard
          title="Top countries"
          icon={<Globe2 className="h-4 w-4" />}
          data={analytics?.topCountries}
          format="country"
          accent="evergreen"
        />
        <BreakdownCard
          title="Devices"
          icon={<Smartphone className="h-4 w-4" />}
          data={analytics?.topDevices}
          format="default"
          accent="gold"
        />
      </div>

      <BreakdownCard
        title="Traffic sources"
        icon={<Users className="h-4 w-4" />}
        data={analytics?.topSources}
        format="default"
        accent="berry"
      />

      {/* Trust Score */}
      <Card className="mt-6 overflow-hidden shadow-festive">
        <div className="h-1.5 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <Activity className="h-5 w-5 text-evergreen" />
                Trust Score
              </CardTitle>
              <CardDescription>
                Computed in shadow mode (Phase 1) — used to calibrate moderation automation.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={recomputeScore}
              disabled={recomputing}
              className="border-evergreen/30 text-evergreen hover:bg-evergreen/5"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${recomputing ? 'animate-spin' : ''}`} />
              {recomputing ? 'Computing…' : 'Recompute'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!trustScore ? (
            <div className="py-8 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/40 mb-3">
                <Activity className="h-5 w-5 text-muted-foreground/60" />
              </div>
              <p className="text-muted-foreground text-sm">No trust score yet.</p>
              <p className="text-muted-foreground/70 text-xs mt-1">Click &quot;Recompute&quot; to run the scoring job.</p>
            </div>
          ) : (
            <div>
              {/* Score cards */}
              <div className="grid gap-4 md:grid-cols-[200px_1fr] mb-6">
                {/* Composite score circle */}
                <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-evergreen/5 to-gold/5 rounded-xl border border-border/60">
                  <ScoreCircle label="Composite" value={trustScore.composite} big />
                  <p className="text-xs text-muted-foreground mt-2">out of 100</p>
                </div>

                {/* Sub-scores */}
                <div className="grid grid-cols-2 gap-3">
                  <ScoreBar label="Traffic Quality" value={trustScore.trafficQuality} good />
                  <ScoreBar label="Content Risk" value={trustScore.contentRisk} good={false} />
                  <ScoreBar label="Ad Risk" value={trustScore.adRisk} good={false} />
                  <ScoreBar label="Spam Risk" value={trustScore.spamRisk} good={false} />
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                Last computed: <span className="font-mono">{new Date(trustScore.computedAt).toLocaleString()}</span>
              </p>

              <details className="group">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-1.5">
                  <span className="inline-block transition-transform group-open:rotate-90">▸</span>
                  View signal breakdown
                </summary>
                <pre className="text-[10px] mt-3 p-4 bg-gradient-to-br from-muted/40 to-background rounded-lg overflow-x-auto border border-border/60 font-mono">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(trustScore.signalBreakdown || '{}'), null, 2)
                    } catch {
                      return trustScore.signalBreakdown || '{}'
                    }
                  })()}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ icon, value, label, accent }: {
  icon: React.ReactNode; value: number; label: string; accent: 'evergreen' | 'gold' | 'berry'
}) {
  const accents = {
    evergreen: { bg: 'bg-evergreen/10', text: 'text-evergreen' },
    gold: { bg: 'bg-gold/15', text: 'text-gold-dark' },
    berry: { bg: 'bg-berry/10', text: 'text-berry' },
  }
  const a = accents[accent]
  return (
    <Card className="overflow-hidden transition-all hover:shadow-festive hover:-translate-y-0.5">
      <div className={`h-1 w-full ${
        accent === 'evergreen' ? 'bg-gradient-to-r from-evergreen to-evergreen-light' :
        accent === 'gold' ? 'bg-gradient-to-r from-gold to-gold-dark' :
        'bg-gradient-to-r from-berry to-berry/70'
      }`} />
      <CardContent className="py-5">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${a.bg} ${a.text} mb-3`}>
          {icon}
        </div>
        <p className="text-3xl font-bold font-serif">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{label}</p>
      </CardContent>
    </Card>
  )
}

function BreakdownCard({
  title, icon, data, format, accent,
}: {
  title: string; icon: React.ReactNode; data?: string; format: 'country' | 'default'; accent: 'evergreen' | 'gold' | 'berry'
}) {
  let parsed: Record<string, number> = {}
  try { parsed = data ? JSON.parse(data) : {} } catch {}
  const total = Object.values(parsed).reduce((a, b) => a + b, 0) || 1
  const entries = Object.entries(parsed).sort((a, b) => b[1] - a[1])

  const labelMap: Record<string, string> = {
    GH: 'Ghana', NG: 'Nigeria', US: 'United States', UK: 'United Kingdom',
    KE: 'Kenya', ZA: 'South Africa', IN: 'India', PH: 'Philippines',
    BR: 'Brazil', DE: 'Germany', FR: 'France',
    mobile: 'Mobile', desktop: 'Desktop', tablet: 'Tablet',
    direct: 'Direct', social: 'Social', search: 'Search', referral: 'Referral',
  }

  const barColors: Record<string, string> = {
    evergreen: 'bg-gradient-to-r from-evergreen to-evergreen-light',
    gold: 'bg-gradient-to-r from-gold to-gold-dark',
    berry: 'bg-gradient-to-r from-berry to-berry/70',
  }

  return (
    <Card className="overflow-hidden">
      <div className={`h-1 w-full ${
        accent === 'evergreen' ? 'bg-gradient-to-r from-evergreen to-evergreen-light' :
        accent === 'gold' ? 'bg-gradient-to-r from-gold to-gold-dark' :
        'bg-gradient-to-r from-berry to-berry/70'
      }`} />
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className={`text-${accent === 'evergreen' ? 'evergreen' : accent === 'gold' ? 'gold-dark' : 'berry'}`}>
            {icon}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data.</p>
        ) : (
          <div className="space-y-3">
            {entries.map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-sm w-32 truncate">
                  {format === 'country' && k.length === 2 ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-base">{countryFlag(k)}</span>
                      {labelMap[k] || k}
                    </span>
                  ) : (
                    labelMap[k] || k
                  )}
                </span>
                <div className="flex-1 bg-muted/30 rounded-full h-2.5 overflow-hidden">
                  <div className={`h-full ${barColors[accent]} rounded-full transition-all`} style={{ width: `${(v / total) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right font-mono">{v}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function countryFlag(code: string): string {
  const flags: Record<string, string> = {
    GH: '🇬🇭', NG: '🇳🇬', US: '🇺🇸', UK: '🇬🇧',
    KE: '🇰🇪', ZA: '🇿🇦', IN: '🇮🇳', PH: '🇵🇭',
    BR: '🇧🇷', DE: '🇩🇪', FR: '🇫🇷',
  }
  return flags[code] || '🏳'
}

function ScoreCircle({ label, value, big }: { label: string; value: number; big?: boolean }) {
  const color = value >= 70 ? '#46875c' : value >= 40 ? '#a18347' : '#92453e'
  const colorClass = value >= 70 ? 'text-emerald-600' : value >= 40 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${big ? 'h-24 w-24' : 'h-16 w-16'}`}>
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
          <circle
            cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(value / 100) * 94.2} 94.2`}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold font-serif ${big ? 'text-2xl' : 'text-base'} ${colorClass}`}>{value}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 uppercase tracking-wide">{label}</p>
    </div>
  )
}

function ScoreBar({ label, value, good }: { label: string; value: number; good: boolean }) {
  const color = good
    ? value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500'
    : value <= 30 ? 'bg-emerald-500' : value <= 60 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="p-3 bg-muted/20 rounded-lg">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-bold">{value}</span>
      </div>
      <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
