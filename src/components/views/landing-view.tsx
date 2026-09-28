'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles, ArrowRight, Eye, Globe2, Layers, ShieldCheck, Share2,
  Wallet, TrendingUp, Star, Gift, Music, Image as ImageIcon, Quote,
} from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'

type Campaign = {
  id: string; slug: string; title: string; description: string | null
  startsAt: string; endsAt: string; featured: boolean; _count: { pages: number }
}

export default function LandingView({
  navigate, user,
}: {
  navigate: (v: View) => void
  user: CurrentUser | null
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  useEffect(() => {
    fetch('/api/campaigns').then(r => r.json()).then(d => setCampaigns(d.campaigns || []))
  }, [])

  return (
    <div className="view-fade">
      {/* ── HERO ── */}
      <section className="relative overflow-hidden gradient-hero border-b border-border/60">
        {/* Decorative pine pattern overlay */}
        <div className="absolute inset-0 bg-pine-pattern opacity-50 pointer-events-none" />

        {/* Floating decorative orbs */}
        <div className="absolute top-20 left-10 h-32 w-32 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-20 h-40 w-40 rounded-full bg-evergreen/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 h-24 w-24 rounded-full bg-berry/5 blur-2xl pointer-events-none" />

        <div className="container mx-auto px-4 py-16 md:py-28 max-w-6xl relative">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
            <div>
              <Badge
                variant="secondary"
                className="mb-5 bg-evergreen/10 text-evergreen border-evergreen/20 hover:bg-evergreen/15"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-evergreen mr-2 animate-pulse" />
                Christmas 2026 campaign · now active
              </Badge>

              <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6 max-w-2xl">
                Create a page.<br />
                Share it with the world.<br />
                <span className="gradient-text-gold">Optionally monetize.</span>
              </h1>

              <p className="text-base md:text-xl text-muted-foreground max-w-xl mb-8 leading-relaxed">
                A global creator-publishing platform. Build a Special Page for Christmas 2026, publish
                content, share the URL, and optionally connect your own Adsterra or Monetag account to
                monetize your legitimate traffic.
              </p>

              <div className="flex flex-wrap gap-3 mb-12">
                {user ? (
                  <Button
                    size="lg"
                    onClick={() => navigate({ name: 'dashboard' })}
                    className="bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive h-12 px-7"
                  >
                    Open dashboard
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => navigate({ name: 'signup' })}
                    className="bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive h-12 px-7"
                  >
                    Create your page — free
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate({ name: 'public', slug: 'kingsley-christmas' })}
                  className="border-evergreen/30 text-evergreen hover:bg-evergreen/5 h-12 px-7"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  See an example page
                </Button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 max-w-md">
                <StatBlock value={campaigns.length.toString()} label="Active campaigns" accent="evergreen" />
                <StatBlock value="Adsterra" label="· Monetag" accent="gold" sublabel="Supported networks" />
                <StatBlock value="2" label="Ad layers" accent="berry" sublabel="User + Platform" />
              </div>
            </div>

            {/* Right column — visual mockup */}
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-br from-evergreen/15 via-gold/10 to-berry/10 rounded-3xl blur-2xl" />
                <div className="relative glass-card rounded-2xl shadow-festive p-5 rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/40">
                    <span className="h-2.5 w-2.5 rounded-full bg-cranberry" />
                    <span className="h-2.5 w-2.5 rounded-full bg-gold" />
                    <span className="h-2.5 w-2.5 rounded-full bg-evergreen" />
                    <span className="text-xs text-muted-foreground ml-2 font-mono">kingsley-christmas</span>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-evergreen font-semibold flex items-center gap-1.5">
                      <Gift className="h-3 w-3" /> Christmas Hub
                    </div>
                    <div className="font-serif font-bold text-lg text-foreground">Kingsley&apos;s Christmas</div>
                    <div className="text-xs text-muted-foreground">by Kingsley Owusu · Ghana</div>

                    <div className="my-3 rounded-lg ad-slot-platform p-2.5">
                      <div className="text-[9px] uppercase tracking-wider text-gold-dark font-semibold">Platform ad · Adsterra</div>
                      <div className="text-xs text-muted-foreground">Slot: HEADER · Priority 10</div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="h-2 bg-evergreen/20 rounded w-3/4" />
                      <div className="h-2 bg-muted-foreground/20 rounded w-full" />
                      <div className="h-2 bg-muted-foreground/20 rounded w-5/6" />
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 my-2">
                      <div className="aspect-square rounded bg-gradient-to-br from-gold/20 to-evergreen/20" />
                      <div className="aspect-square rounded bg-gradient-to-br from-berry/20 to-gold/20" />
                      <div className="aspect-square rounded bg-gradient-to-br from-evergreen/20 to-berry/20" />
                    </div>

                    <div className="rounded-lg ad-slot-user p-2.5">
                      <div className="text-[9px] uppercase tracking-wider text-berry font-semibold">Creator ad</div>
                      <div className="text-xs text-muted-foreground">Zone: zone-1234567</div>
                    </div>
                  </div>
                </div>

                {/* Floating badges */}
                <div className="absolute -top-3 -right-3 bg-gold text-cream rounded-full px-3 py-1 text-xs font-bold shadow-gold rotate-6">
                  Christmas 2026
                </div>
                <div className="absolute -bottom-3 -left-3 bg-evergreen text-cream rounded-full px-3 py-1 text-xs font-bold shadow-festive -rotate-3">
                  Live now
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CAMPAIGNS ── */}
      <section className="container mx-auto px-4 py-16 max-w-6xl">
        <div className="flex items-end justify-between mb-8">
          <div>
            <Badge variant="outline" className="mb-2 border-gold/40 text-gold-dark bg-gold/5">
              <Star className="h-3 w-3 mr-1" /> Featured
            </Badge>
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">Active campaigns</h2>
            <p className="text-muted-foreground mt-2">Each campaign is a themed season for creators to build around.</p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {campaigns.map(c => (
            <Card
              key={c.id}
              className={`overflow-hidden transition-all hover:shadow-festive hover:-translate-y-0.5 ${c.featured ? 'border-evergreen/40 shadow-festive' : ''}`}
            >
              {/* Gradient banner */}
              <div className={`h-1.5 w-full ${c.featured ? 'bg-gradient-to-r from-evergreen via-gold to-berry' : 'bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/20'}`} />
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="font-serif text-2xl flex items-center gap-2">
                      {c.title}
                      {c.featured && (
                        <Badge className="bg-gold text-cream hover:bg-gold-dark">
                          <Star className="h-3 w-3 mr-0.5 fill-current" /> Featured
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1.5">
                      <span className="font-mono text-xs">{new Date(c.startsAt).toLocaleDateString()}</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-mono text-xs">{new Date(c.endsAt).toLocaleDateString()}</span>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30">
                    {c._count.pages} {c._count.pages === 1 ? 'page' : 'pages'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-3">{c.description}</p>
                <Button
                  size="sm"
                  variant={c.featured ? 'default' : 'outline'}
                  onClick={() => navigate(user ? { name: 'dashboard' } : { name: 'signup' })}
                  className={c.featured ? 'bg-evergreen text-cream hover:bg-evergreen-dark' : 'border-evergreen/30 text-evergreen hover:bg-evergreen/5'}
                >
                  Create page for this campaign
                  <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
          {campaigns.length === 0 && (
            <Card className="md:col-span-2">
              <CardContent className="py-16 text-center text-muted-foreground">
                No active campaigns right now. Check back soon.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-y border-border/60 bg-gradient-to-b from-evergreen/5 via-background to-gold/5">
        <div className="container mx-auto px-4 py-20 max-w-6xl">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-3 border-evergreen/30 text-evergreen bg-evergreen/5">
              <Layers className="h-3 w-3 mr-1" /> How it works
            </Badge>
            <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight mb-4">
              From zero to live page in <span className="gradient-text-evergreen">four steps</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              No payment required. No coding. Just sign up, build your page, and share it.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-4 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-evergreen via-gold to-berry opacity-30" />

            <Step n={1} icon={<Layers className="h-5 w-5" />} title="Create your page" body="Sign up and create a Special Page. Pick a page type — Christmas hub, link hub, personal page, photography, music, and more." accent="evergreen" />
            <Step n={2} icon={<ImageIcon className="h-5 w-5" />} title="Add content blocks" body="Use the drag-and-drop page builder to add text, images, quotes, social links. Drag to reorder anytime." accent="gold" />
            <Step n={3} icon={<Share2 className="h-5 w-5" />} title="Share the URL" body="Share your page on WhatsApp, social, or anywhere. Drive legitimate traffic to your content." accent="berry" />
            <Step n={4} icon={<Wallet className="h-5 w-5" />} title="Optionally monetize" body="Connect your Adsterra or Monetag account (subject to platform review). Your ad code runs in a controlled, sandboxed placement engine." accent="evergreen" />
          </div>

          {/* Compliance callout */}
          <div className="mt-14 p-5 rounded-xl border border-gold/30 bg-gradient-to-r from-gold/5 via-gold/5 to-transparent">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-gold/20 p-2 mt-0.5">
                <ShieldCheck className="h-5 w-5 text-gold-dark" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Important compliance note</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The platform does <strong className="text-foreground">not</strong> pay you. Earnings come
                  from your own ad-network relationship (Adsterra or Monetag). The platform cannot guarantee
                  any level of earnings, or any earnings at all. You are responsible for your traffic quality
                  and your ad-network account standing.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURE GRID ── */}
      <section className="container mx-auto px-4 py-20 max-w-6xl">
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard
            icon={<Globe2 className="h-5 w-5" />}
            title="Truly global"
            body="Multi-region, multi-language architecture. Christmas 2026 is the flagship campaign, but the platform is designed for every season, every country, every creator."
            accent="evergreen"
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Sandboxed ads"
            body="User-supplied ad integrations never execute arbitrary JavaScript. Sanitized identifiers only. Platform-controlled placement engine decides where and when ads render."
            accent="gold"
          />
          <FeatureCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="Two ad layers"
            body="Platform's own Adsterra/Monetag publisher account runs on eligible pages. Users can optionally connect their own ad-network account for their share of inventory."
            accent="berry"
          />
          <FeatureCard
            icon={<Layers className="h-5 w-5" />}
            title="Page builder"
            body="Drag-and-reorder content blocks: headings, text, images, quotes, links, social links, dividers. No code required. Publish with one click."
            accent="evergreen"
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Trust Score"
            body="Shadow-mode scoring of traffic quality, content risk, ad risk, spam risk — calibrated before automated actions are taken in Phase 2."
            accent="gold"
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Admin controls"
            body="Platform-wide kill switch. Manual approval required for new ad integrations. Per-page moderation state. Per-integration lifecycle (Draft → Pending → Approved → Disabled → Revoked)."
            accent="berry"
          />
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-t border-border/60 bg-gradient-to-br from-evergreen-dark via-evergreen to-berry/40">
        <div className="container mx-auto px-4 py-20 max-w-4xl text-center">
          <Sparkles className="h-10 w-10 text-gold mx-auto mb-4" />
          <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-cream mb-4">
            Build your Special Page today.
          </h2>
          <p className="text-cream/80 text-lg mb-8 max-w-xl mx-auto">
            Christmas 2026 is live. The platform is global. Your audience is waiting.
          </p>
          <Button
            size="lg"
            onClick={() => navigate(user ? { name: 'dashboard' } : { name: 'signup' })}
            className="bg-gold text-cream hover:bg-gold-dark shadow-gold h-12 px-8"
          >
            {user ? 'Open dashboard' : 'Get started — free'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  )
}

function StatBlock({ value, label, sublabel, accent }: {
  value: string; label: string; sublabel?: string; accent: 'evergreen' | 'gold' | 'berry'
}) {
  const colors = {
    evergreen: 'text-evergreen',
    gold: 'text-gold-dark',
    berry: 'text-berry',
  }
  return (
    <div>
      <p className={`text-xl font-bold font-serif ${colors[accent]}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sublabel && <p className="text-[10px] text-muted-foreground/70">{sublabel}</p>}
    </div>
  )
}

function Step({ n, icon, title, body, accent }: {
  n: number; icon: React.ReactNode; title: string; body: string; accent: 'evergreen' | 'gold' | 'berry'
}) {
  const accents = {
    evergreen: 'from-evergreen to-evergreen-dark text-cream shadow-festive',
    gold: 'from-gold to-gold-dark text-cream shadow-gold',
    berry: 'from-berry to-berry/70 text-cream shadow-festive',
  }
  return (
    <div className="relative text-center md:text-left">
      <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${accents[accent]} mb-4 relative z-10`}>
        {icon}
        <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border-2 border-current text-current flex items-center justify-center text-xs font-bold">
          {n}
        </span>
      </div>
      <h3 className="font-semibold text-lg mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  )
}

function FeatureCard({ icon, title, body, accent }: {
  icon: React.ReactNode; title: string; body: string; accent: 'evergreen' | 'gold' | 'berry'
}) {
  const accents = {
    evergreen: 'bg-evergreen/10 text-evergreen',
    gold: 'bg-gold/15 text-gold-dark',
    berry: 'bg-berry/10 text-berry',
  }
  return (
    <Card className="transition-all hover:shadow-festive hover:-translate-y-0.5">
      <CardContent className="pt-6">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${accents[accent]} mb-4`}>
          {icon}
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </CardContent>
    </Card>
  )
}
