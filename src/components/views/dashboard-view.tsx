'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { motion } from 'framer-motion'
import { CountUp } from '@/components/animated/count-up'
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animated/motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { safeFetch } from '@/lib/safe-fetch'
import { TiltCard } from '@/components/animated/tilt-card'
import {
  Plus, Eye, Edit3, BarChart3, Wallet, FileText, Sparkles, TrendingUp, Mail, X,
} from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'

type Page = {
  id: string; slug: string; title: string; description: string | null
  pageType: string; moderationState: string; publishedAt: string | null
  campaign: { id: string; title: string } | null
  _count: { blocks: number }
}

const PAGE_TYPES: Array<[string, string, string]> = [
  ['PERSONAL', 'Personal Page', '👤'],
  ['CELEBRATION', 'Celebration / Holiday', '🎄'],
  ['LINK_HUB', 'Link Hub', '🔗'],
  ['CREATOR', 'Creator Page', '✨'],
  ['BLOGGER', 'Blogger', '✍️'],
  ['PHOTOGRAPHY', 'Photography', '📸'],
  ['MUSIC', 'Music', '🎵'],
  ['GAMING', 'Gaming', '🎮'],
  ['BUSINESS', 'Business', '💼'],
  ['EVENT', 'Event', '🎉'],
]

export default function DashboardView({
  user, navigate,
}: {
  user: CurrentUser
  navigate: (v: View) => void
}) {
  const [pages, setPages] = useState<Page[]>([])
  const [campaigns, setCampaigns] = useState<Array<{ id: string; title: string }>>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState('PERSONAL')
  const [newCampaignId, setNewCampaignId] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      const [pagesRes, campaignsRes] = await Promise.all([
        safeFetch<{ pages?: Page[] }>('/api/pages'),
        safeFetch<{ campaigns?: Array<{ id: string; title: string }> }>('/api/campaigns'),
      ])
      if (cancelled) return
      // Surface the first error, but still set whatever we got
      const firstError = pagesRes.error || campaignsRes.error
      if (firstError) setLoadError(firstError)
      setPages(pagesRes.data?.pages || [])
      setCampaigns((campaignsRes.data?.campaigns || []).map((cmp: any) => ({ id: cmp.id, title: cmp.title })))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  async function createPage() {
    if (!newTitle.trim()) return
    setCreating(true)
    const res = await safeFetch<{ page: { id: string } }>('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        pageType: newType,
        campaignId: newCampaignId && newCampaignId !== '__none__' ? newCampaignId : undefined,
      }),
    })
    setCreating(false)
    if (res.data?.page?.id) {
      navigate({ name: 'builder', pageId: res.data.page.id })
    } else if (res.error) {
      setLoadError(res.error)
    }
  }

  const publishedCount = pages.filter(p => p.publishedAt).length
  const approvedCount = pages.filter(p => p.moderationState === 'APPROVED').length

  return (
    <div className="relative min-h-screen">
      {/* Ambient background layer — subtle mesh + drifting orbs so the
          dashboard sits on a layered surface rather than flat bg-background. */}
      <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" aria-hidden />
      <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-25" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl overflow-x-hidden">
      {/* Email verification banner */}
      <EmailVerificationBanner />
      {/* Header */}
      <FadeIn>
        <div className="relative flex flex-wrap items-end justify-between gap-4 mb-8">
          {/* Soft gradient wash behind the welcome heading — like a gentle spotlight. */}
          <div
            className="absolute -inset-x-3 -inset-y-4 rounded-3xl bg-gradient-to-br from-gold/8 via-evergreen/4 to-berry/5 pointer-events-none"
            aria-hidden
          />
          <div className="relative">
            <Badge variant="outline" className="mb-2 border-gold/40 text-gold-dark bg-gold/5 glass-strong">
              <Sparkles className="h-3 w-3 mr-1" /> Creator dashboard
            </Badge>
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
              Welcome back, <span className="gradient-text-evergreen">{user.name || user.email.split('@')[0]}</span>
            </h1>
            <p className="text-muted-foreground mt-1">Manage your Special Pages and grow your audience.</p>
          </div>
          <motion.div className="relative" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              onClick={() => navigate({ name: 'monetization' })}
              className="bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive btn-glow overflow-hidden"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Monetization
            </Button>
          </motion.div>
        </div>
      </FadeIn>

      {/* Quick stats — colorful gradient cards, one per metric */}
      <StaggerContainer className="grid gap-4 mb-8 grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <TiltCard intensity={5}>
            <Card className="relative overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-1 border-evergreen/30">
              {/* Gradient background wash */}
              <div className="absolute inset-0 bg-gradient-to-br from-evergreen/8 via-evergreen/3 to-transparent" />
              {/* Floating orb */}
              <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-evergreen/15 blur-2xl animate-pulse" />
              <div className="h-1.5 w-full bg-gradient-to-r from-evergreen to-evergreen-light" />
              <CardContent className="relative py-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-evergreen/60 font-bold">Pages</span>
                </div>
                <p className="text-4xl font-bold font-serif text-evergreen-dark leading-none">
                  <CountUp value={pages.length} duration={1200} />
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1.5">Total pages</p>
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
                    <Eye className="h-5 w-5" />
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
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-berry/60 font-bold">Verified</span>
                </div>
                <p className="text-4xl font-bold font-serif text-berry leading-none">
                  <CountUp value={approvedCount} duration={1200} />
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1.5">Approved</p>
              </CardContent>
            </Card>
          </TiltCard>
        </StaggerItem>

        <StaggerItem>
          <TiltCard intensity={5}>
            <Card className="relative overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-1 border-chart-4/30">
              <div className="absolute inset-0 bg-gradient-to-br from-chart-4/10 via-chart-4/3 to-transparent" />
              <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-chart-4/20 blur-2xl animate-pulse" style={{ animationDelay: '1.5s' }} />
              <div className="h-1.5 w-full bg-gradient-to-r from-chart-4 via-chart-4/80 to-evergreen-light" />
              <CardContent className="relative py-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-chart-4 to-chart-4/70 text-cream shadow-festive">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-chart-4/60 font-bold">Active</span>
                </div>
                <p className="text-4xl font-bold font-serif text-chart-4 leading-none">
                  <CountUp value={pages.filter(p => p.campaign).length} duration={1200} />
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1.5">In campaigns</p>
              </CardContent>
            </Card>
          </TiltCard>
        </StaggerItem>
      </StaggerContainer>

      {/* Create new page */}
      <FadeIn delay={0.2}>
        <Card className="mb-8 border-evergreen/20 shadow-festive overflow-hidden">
          <div className="h-1.5 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
          <CardHeader>
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <Plus className="h-5 w-5 text-evergreen" />
              Create a new Special Page
            </CardTitle>
            <CardDescription>
              Each page gets its own URL like <code className="text-evergreen font-mono bg-evergreen/5 px-1 py-0.5 rounded">/p/your-page-title</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Title</Label>
                <Input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="My Christmas Hub"
                  className="mt-1 transition-all focus:ring-2 focus:ring-gold/40 focus:border-gold"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Page type</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAGE_TYPES.map(([v, l, emoji]) => (
                      <SelectItem key={v} value={v}>
                        <span className="mr-2">{emoji}</span> {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Campaign</Label>
                <Select value={newCampaignId} onValueChange={setNewCampaignId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={createPage}
                  disabled={creating || !newTitle.trim()}
                  className="bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive btn-glow overflow-hidden"
                >
                  {creating ? (
                    <>
                      <span className="h-4 w-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin mr-1.5" />
                      Creating…
                    </>
                  ) : (
                    <>
                      Create page
                      <Plus className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Pages list */}
      <FadeIn delay={0.3}>
        <h2 className="font-serif text-2xl font-bold mb-4">Your pages</h2>
      </FadeIn>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl shimmer-bg" />
          ))}
        </div>
      ) : loadError && pages.length === 0 ? (
        <Card className="border-dashed border-cranberry/40">
          <CardContent className="py-16 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cranberry/10 mb-3">
              <FileText className="h-7 w-7 text-cranberry" />
            </div>
            <p className="font-medium text-foreground mb-1">Couldn&apos;t load your pages</p>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{loadError}</p>
            <Button variant="outline" size="sm" onClick={() => location.reload()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : pages.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-evergreen/10 mb-3"
            >
              <FileText className="h-7 w-7 text-evergreen/60" />
            </motion.div>
            <p className="font-medium text-foreground mb-1">No pages yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first Special Page above to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <StaggerContainer className="grid gap-3">
          {pages.map(p => (
            <StaggerItem key={p.id} y={15}>
              <Card className="overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 hover:border-evergreen/30 bg-card/80 backdrop-blur-sm min-w-0">
                <div className={`h-1 w-full ${
                  p.moderationState === 'APPROVED' ? 'bg-gradient-to-r from-evergreen to-evergreen-light' :
                  p.moderationState === 'PENDING' ? 'bg-gradient-to-r from-gold to-gold-dark' :
                  p.moderationState === 'BANNED' || p.moderationState === 'SUSPENDED' ? 'bg-gradient-to-r from-cranberry to-berry' :
                  'bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/20'
                }`} />
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4 min-w-0">
                  <div className="min-w-0 flex-1 w-full sm:w-auto">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-lg truncate">{p.title}</h3>
                      <ModBadge state={p.moderationState} />
                      {p.publishedAt ? (
                        <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-evergreen mr-1.5 animate-pulse" /> Published
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted-foreground/5 text-muted-foreground border-muted-foreground/30">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate font-mono break-all">
                      /p/{p.slug} · {p._count.blocks} blocks · {p.campaign?.title || 'No campaign'}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap">
                    <Button size="sm" variant="ghost" onClick={() => navigate({ name: 'analytics', pageId: p.id })} className="hover:bg-evergreen/5 hover:text-evergreen">
                      <BarChart3 className="h-4 w-4 mr-1" /> Analytics
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate({ name: 'builder', pageId: p.id })} className="border-evergreen/30 text-evergreen hover:bg-evergreen/5">
                      <Edit3 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
                      onClick={() => {
                        window.location.hash = `/p/${p.slug}`
                        navigate({ name: 'public', slug: p.slug })
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
      </div>
    </div>
  )
}

function EmailVerificationBanner() {
  const [show, setShow] = useState(true)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!show) return null

  return (
    <FadeIn>
      <div className="mb-6 p-3 rounded-xl border border-gold/40 bg-gradient-to-r from-gold/10 to-transparent flex items-center gap-3 flex-wrap">
        <div className="rounded-full bg-gold/20 p-2 flex-shrink-0">
          <Mail className="h-4 w-4 text-gold-dark" />
        </div>
        <div className="flex-1 min-w-[12rem]">
          <p className="text-sm font-medium">Verify your email to unlock all features</p>
          <p className="text-xs text-muted-foreground">Unverified accounts cannot create ad integrations.</p>
        </div>
        {sent ? (
          <Badge className="bg-evergreen/15 text-evergreen border-evergreen/30 text-xs flex-shrink-0">
            <Sparkles className="h-3 w-3 mr-1" /> Link sent
          </Badge>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={loading}
            onClick={async () => {
              setLoading(true)
              const res = await safeFetch('/api/auth/resend-verification', { method: 'POST' })
              setLoading(false)
              if (!res.error) setSent(true)
            }}
            className="border-gold/40 text-gold-dark hover:bg-gold/10 flex-shrink-0"
          >
            {loading ? 'Sending…' : 'Send link'}
          </Button>
        )}
        <button onClick={() => setShow(false)} className="p-1 text-muted-foreground hover:text-foreground flex-shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </FadeIn>
  )
}

function ModBadge({ state }: { state: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    PENDING:    { label: 'Pending',    cls: 'pill-pending' },
    APPROVED:   { label: 'Approved',   cls: 'pill-approved' },
    RESTRICTED: { label: 'Restricted', cls: 'pill-restricted' },
    SUSPENDED:  { label: 'Suspended',  cls: 'pill-suspended' },
    BANNED:     { label: 'Banned',     cls: 'pill-banned' },
  }
  const c = config[state] || { label: state, cls: 'pill-draft' }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.cls}`}>{c.label}</span>
}
