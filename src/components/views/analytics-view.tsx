'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ChevronLeft, Activity, BarChart3, RefreshCw, Info } from 'lucide-react'
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
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'dashboard' })}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          This dashboard shows <strong>platform-side traffic analytics only</strong>. For verified
          earnings data, consult your ad-network dashboard (Adsterra or Monetag) directly.
          The platform does not estimate or display earnings.
        </AlertDescription>
      </Alert>

      {/* Traffic stats */}
      <div className="grid gap-3 md:grid-cols-4 mb-6">
        <StatCard label="Visitors (7d)" value={analytics?.visitors7d ?? 0} />
        <StatCard label="Visitors (30d)" value={analytics?.visitors30d ?? 0} />
        <StatCard label="Page views (7d)" value={analytics?.pageViews7d ?? 0} />
        <StatCard label="Page views (30d)" value={analytics?.pageViews30d ?? 0} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 mb-6">
        <BreakdownCard title="Top countries" data={analytics?.topCountries} format="country" />
        <BreakdownCard title="Top devices" data={analytics?.topDevices} format="default" />
      </div>

      <BreakdownCard title="Traffic sources" data={analytics?.topSources} format="default" />

      {/* Trust Score (shadow mode) */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Trust Score (shadow mode)
              </CardTitle>
              <CardDescription>
                Computed but not enforced in Phase 1. Used to calibrate moderation automation.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={recomputeScore} disabled={recomputing}>
              <RefreshCw className={`h-3 w-3 mr-1 ${recomputing ? 'animate-spin' : ''}`} />
              {recomputing ? 'Computing…' : 'Recompute'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!trustScore ? (
            <p className="text-sm text-muted-foreground">
              No trust score yet. Click &quot;Recompute&quot; to run the scoring job.
            </p>
          ) : (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <ScoreCircle label="Composite" value={trustScore.composite} big />
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <ScoreBar label="Traffic Quality" value={trustScore.trafficQuality} good />
                  <ScoreBar label="Content Risk" value={trustScore.contentRisk} good={false} />
                  <ScoreBar label="Ad Risk" value={trustScore.adRisk} good={false} />
                  <ScoreBar label="Spam Risk" value={trustScore.spamRisk} good={false} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Last computed: {new Date(trustScore.computedAt).toLocaleString()}
              </p>
              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer">View signal breakdown</summary>
                <pre className="text-[10px] mt-2 p-3 bg-muted/40 rounded overflow-x-auto">
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
      </CardContent>
    </Card>
  )
}

function BreakdownCard({
  title, data, format,
}: {
  title: string; data?: string; format: 'country' | 'default'
}) {
  let parsed: Record<string, number> = {}
  try { parsed = data ? JSON.parse(data) : {} } catch {}
  const total = Object.values(parsed).reduce((a, b) => a + b, 0) || 1

  const labelMap: Record<string, string> = {
    GH: 'Ghana', NG: 'Nigeria', US: 'United States', UK: 'United Kingdom',
    KE: 'Kenya', ZA: 'South Africa', IN: 'India', PH: 'Philippines',
    BR: 'Brazil', DE: 'Germany', FR: 'France',
    mobile: 'Mobile', desktop: 'Desktop', tablet: 'Tablet',
    direct: 'Direct', social: 'Social', search: 'Search', referral: 'Referral',
  }

  return (
    <Card className="mb-3">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {Object.keys(parsed).length === 0 ? (
          <p className="text-sm text-muted-foreground">No data.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(parsed).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="text-sm w-32">
                  {format === 'country' && k.length === 2 ? `-flag-` : ''}
                  {labelMap[k] || k}
                </span>
                <div className="flex-1 bg-muted/40 rounded h-2 overflow-hidden">
                  <div className="h-full bg-foreground rounded" style={{ width: `${(v / total) * 100}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">{v}%</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ScoreCircle({ label, value, big }: { label: string; value: number; big?: boolean }) {
  const color = value >= 70 ? 'text-emerald-600' : value >= 40 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${big ? 'h-20 w-20' : 'h-14 w-14'}`}>
        <svg className="absolute inset-0" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
          <circle
            cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3"
            strokeDasharray={`${(value / 100) * 94.2} 94.2`}
            className={color}
            transform="rotate(-90 18 18)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${big ? 'text-xl' : 'text-sm'} ${color}`}>{value}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

function ScoreBar({ label, value, good }: { label: string; value: number; good: boolean }) {
  const color = good
    ? value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-500'
    : value <= 30 ? 'bg-emerald-500' : value <= 60 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-1.5 bg-muted/40 rounded overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}
