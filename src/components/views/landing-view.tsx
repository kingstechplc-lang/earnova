'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { TiltCard } from '@/components/animated/tilt-card'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { Sparkles as SparklesComponent } from '@/components/animated/sparkles'
import { CountUp } from '@/components/animated/count-up'
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animated/motion'
import { safeFetch } from '@/lib/safe-fetch'
import {
  Sparkles, ArrowRight, Eye, Globe2, Layers, ShieldCheck, Share2,
  Wallet, TrendingUp, Star, Gift, Image as ImageIcon, Quote, Zap, Clock, Users,
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
    let cancelled = false
    ;(async () => {
      const res = await safeFetch<{ campaigns?: Campaign[] }>('/api/campaigns')
      if (cancelled) return
      setCampaigns(res.data?.campaigns || [])
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div>
      {/* ─────────────────────────────────────────────────────────
          HERO SECTION — Aurora background + animated mockup
         ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border/60">
        {/* Background layers */}
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 mesh-bg opacity-50" />
        <div className="absolute inset-0 bg-pine-pattern opacity-30" />
        <FloatingOrbs count={4} colors={['evergreen', 'gold', 'berry', 'sage']} />

        <div className="container mx-auto px-4 py-16 md:py-24 max-w-6xl relative">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <Badge
                  variant="secondary"
                  className="mb-5 bg-evergreen/10 text-evergreen border-evergreen/20 hover:bg-evergreen/15 backdrop-blur-sm"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-evergreen mr-2 animate-pulse" />
                  Christmas 2026 campaign · now active
                  <Sparkles className="h-3 w-3 ml-2 text-gold-dark" />
                </Badge>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] mb-6 max-w-2xl"
              >
                <span className="block">Create a page.</span>
                <span className="block">Share it with the world.</span>
                <motion.span
                  className="block gradient-text-gold"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  Optionally monetize.
                </motion.span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-base md:text-xl text-muted-foreground max-w-xl mb-8 leading-relaxed"
              >
                A global creator platform. Build your page, share it, and optionally monetize.
                publish content, share the URL, and optionally connect your own Adsterra or
                Monetag account to monetize your legitimate traffic.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-wrap gap-3 mb-12"
              >
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Button
                    size="lg"
                    onClick={() => navigate(user ? { name: 'dashboard' } : { name: 'signup' })}
                    className="bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive h-12 px-7 btn-glow relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center">
                      {user ? 'Open dashboard' : 'Create your page — free'}
                      <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate({ name: 'public', slug: 'kingsley-christmas' })}
                    className="border-evergreen/30 text-evergreen hover:bg-evergreen/5 h-12 px-7 backdrop-blur-sm bg-background/50"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    See an example page
                  </Button>
                </motion.div>
              </motion.div>

              {/* Stats row with CountUp */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="grid grid-cols-3 gap-4 max-w-md"
              >
                <StatBlock
                  value={<CountUp value={campaigns.length} duration={1200} />}
                  label="Active campaigns"
                  accent="evergreen"
                />
                <StatBlock
                  value={<span className="text-xl font-bold font-serif text-gold-dark">2</span>}
                  label="Ad networks"
                  sublabel="Adsterra · Monetag"
                  accent="gold"
                />
                <StatBlock
                  value={<span className="text-xl font-bold font-serif text-berry">2</span>}
                  label="Ad layers"
                  sublabel="User + Platform"
                  accent="berry"
                />
              </motion.div>
            </div>

            {/* Right column — animated mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: 3 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block"
            >
              <TiltCard intensity={6} className="relative">
                <SparklesComponent count={6} className="z-20" />
                <div className="absolute -inset-4 bg-gradient-to-br from-evergreen/20 via-gold/15 to-berry/15 rounded-3xl blur-2xl animate-pulse" />
                <div className="relative glass-card rounded-2xl shadow-elevated p-5 anim-float-slow">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/40">
                    <span className="h-2.5 w-2.5 rounded-full bg-cranberry animate-pulse" />
                    <span className="h-2.5 w-2.5 rounded-full bg-gold animate-pulse" style={{ animationDelay: '0.2s' }} />
                    <span className="h-2.5 w-2.5 rounded-full bg-evergreen animate-pulse" style={{ animationDelay: '0.4s' }} />
                    <span className="text-xs text-muted-foreground ml-2 font-mono">kingsley-christmas</span>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="space-y-2"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-evergreen font-semibold flex items-center gap-1.5">
                      <Gift className="h-3 w-3" /> Christmas Hub
                    </div>
                    <div className="font-serif font-bold text-lg text-foreground">Kingsley&apos;s Christmas</div>
                    <div className="text-xs text-muted-foreground">by Kingsley Owusu · Ghana 🇬🇭</div>

                    {/* Animated ad slot */}
                    <div className="my-3 rounded-lg ad-slot-platform p-2.5 anim-border-glow">
                      <div className="text-[9px] uppercase tracking-wider text-gold-dark font-semibold flex items-center gap-1">
                        <Layers className="h-2.5 w-2.5" /> Platform ad · Adsterra
                      </div>
                      <div className="text-xs text-muted-foreground">Slot: HEADER · Priority 10</div>
                    </div>

                    {/* Skeleton content lines */}
                    <div className="space-y-1.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '75%' }}
                        transition={{ delay: 0.8, duration: 0.6 }}
                        className="h-2 bg-evergreen/30 rounded"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ delay: 0.9, duration: 0.6 }}
                        className="h-2 bg-muted-foreground/20 rounded"
                      />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '85%' }}
                        transition={{ delay: 1.0, duration: 0.6 }}
                        className="h-2 bg-muted-foreground/20 rounded"
                      />
                    </div>

                    {/* Image grid */}
                    <div className="grid grid-cols-3 gap-1.5 my-2">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.1 + i * 0.1, duration: 0.4 }}
                          className="aspect-square rounded bg-gradient-to-br from-gold/30 to-evergreen/30"
                        />
                      ))}
                    </div>

                    {/* User ad slot */}
                    <div className="rounded-lg ad-slot-user p-2.5">
                      <div className="text-[9px] uppercase tracking-wider text-berry font-semibold flex items-center gap-1">
                        <Users className="h-2.5 w-2.5" /> Creator ad
                      </div>
                      <div className="text-xs text-muted-foreground">Zone: zone-1234567</div>
                    </div>
                  </motion.div>
                </div>

                {/* Floating badges */}
                <motion.div
                  initial={{ opacity: 0, scale: 0, rotate: -20 }}
                  animate={{ opacity: 1, scale: 1, rotate: 6 }}
                  transition={{ delay: 1.2, type: 'spring', stiffness: 200 }}
                  className="absolute -top-3 -right-3 bg-gradient-to-r from-gold to-gold-dark text-cream rounded-full px-3 py-1 text-xs font-bold shadow-gold"
                >
                  Christmas 2026
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0, rotate: 20 }}
                  animate={{ opacity: 1, scale: 1, rotate: -3 }}
                  transition={{ delay: 1.4, type: 'spring', stiffness: 200 }}
                  className="absolute -bottom-3 -left-3 bg-gradient-to-r from-evergreen to-evergreen-dark text-cream rounded-full px-3 py-1 text-xs font-bold shadow-festive"
                >
                  Live now
                </motion.div>
              </TiltCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────
          CAMPAIGNS
         ───────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-16 max-w-6xl">
        <FadeIn>
          <div className="flex items-end justify-between mb-8">
            <div>
              <Badge variant="outline" className="mb-2 border-gold/40 text-gold-dark bg-gold/5">
                <Star className="h-3 w-3 mr-1 fill-current" /> Featured
              </Badge>
              <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
                Active <span className="gradient-text-evergreen">campaigns</span>
              </h2>
              <p className="text-muted-foreground mt-2">Each campaign is a themed season for creators to build around.</p>
            </div>
          </div>
        </FadeIn>

        <StaggerContainer className="grid gap-5 md:grid-cols-2">
          {campaigns.map(c => (
            <StaggerItem key={c.id}>
              <TiltCard intensity={4}>
                <Card
                  className={`overflow-hidden transition-all hover:shadow-elevated ${c.featured ? 'border-evergreen/40 shadow-festive' : ''}`}
                >
                  <motion.div
                    className={`h-1.5 w-full ${c.featured ? 'bg-gradient-to-r from-evergreen via-gold to-berry' : 'bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/20'}`}
                    animate={c.featured ? { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] } : {}}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    style={c.featured ? { backgroundSize: '200% 200%' } : {}}
                  />
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="font-serif text-2xl flex items-center gap-2">
                          {c.title}
                          {c.featured && (
                            <Badge className="bg-gold text-cream hover:bg-gold-dark anim-sparkle-pulse">
                              <Star className="h-3 w-3 mr-0.5 fill-current" /> Featured
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1.5">
                          <Clock className="h-3 w-3" />
                          <span className="font-mono text-xs">{new Date(c.startsAt).toLocaleDateString()}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-mono text-xs">{new Date(c.endsAt).toLocaleDateString()}</span>
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30">
                        <Users className="h-3 w-3 mr-1" /> {c._count.pages}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed line-clamp-3">{c.description}</p>
                    <Button
                      size="sm"
                      variant={c.featured ? 'default' : 'outline'}
                      onClick={() => navigate(user ? { name: 'dashboard' } : { name: 'signup' })}
                      className={c.featured ? 'bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden' : 'border-evergreen/30 text-evergreen hover:bg-evergreen/5'}
                    >
                      Create page for this campaign
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </CardContent>
                </Card>
              </TiltCard>
            </StaggerItem>
          ))}
          {campaigns.length === 0 && (
            <Card className="md:col-span-2">
              <CardContent className="py-16 text-center text-muted-foreground">
                No active campaigns right now. Check back soon.
              </CardContent>
            </Card>
          )}
        </StaggerContainer>
      </section>

      {/* ─────────────────────────────────────────────────────────
          HOW IT WORKS — animated steps
         ───────────────────────────────────────────────────────── */}
      <section className="border-y border-border/60 bg-gradient-to-b from-evergreen/5 via-background to-gold/5 relative overflow-hidden">
        <FloatingOrbs count={2} colors={['evergreen', 'gold']} />
        <div className="container mx-auto px-4 py-20 max-w-6xl relative">
          <FadeIn className="text-center mb-14">
            <Badge variant="outline" className="mb-3 border-evergreen/30 text-evergreen bg-evergreen/5">
              <Layers className="h-3 w-3 mr-1" /> How it works
            </Badge>
            <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight mb-4">
              From zero to live page in <span className="gradient-text-festive">four steps</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              No payment required. No coding. Just sign up, build your page, and share it.
            </p>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-4 relative">
            {/* Connecting line with animated gradient */}
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.3 }}
              className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-evergreen via-gold to-berry origin-left opacity-40"
            />

            <Step n={1} icon={<Layers className="h-5 w-5" />} title="Create your page" body="Sign up and create a Special Page. Pick a page type — Christmas hub, link hub, personal page, photography, music, and more." accent="evergreen" delay={0} />
            <Step n={2} icon={<ImageIcon className="h-5 w-5" />} title="Add content blocks" body="Use the drag-and-drop page builder to add text, images, quotes, social links. Drag to reorder anytime." accent="gold" delay={0.1} />
            <Step n={3} icon={<Share2 className="h-5 w-5" />} title="Share the URL" body="Share your page on WhatsApp, social, or anywhere. Drive legitimate traffic to your content." accent="berry" delay={0.2} />
            <Step n={4} icon={<Wallet className="h-5 w-5" />} title="Optionally monetize" body="Connect your Adsterra or Monetag account (subject to platform review). Your ad code runs in a controlled, sandboxed placement engine." accent="evergreen" delay={0.3} />
          </div>

          {/* Compliance callout */}
          <FadeIn delay={0.4}>
            <div className="mt-14 p-5 rounded-xl border border-gold/30 bg-gradient-to-r from-gold/5 via-gold/5 to-transparent relative overflow-hidden">
              <div className="absolute inset-0 shimmer opacity-30" />
              <div className="flex items-start gap-3 relative">
                <div className="rounded-full bg-gold/20 p-2 mt-0.5 anim-pulse-glow">
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
          </FadeIn>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────
          FEATURE GRID
         ───────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-20 max-w-6xl">
        <FadeIn className="text-center mb-14">
          <Badge variant="outline" className="mb-3 border-berry/30 text-berry bg-berry/5">
            <Zap className="h-3 w-3 mr-1 fill-current" /> Features
          </Badge>
          <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Everything you need to <span className="gradient-text-gold">create and grow</span>
          </h2>
        </FadeIn>

        <StaggerContainer className="grid gap-5 md:grid-cols-3">
          <FeatureCard icon={<Globe2 className="h-5 w-5" />} title="Truly global" body="Multi-region, multi-language architecture. Christmas 2026 is the flagship campaign, but the platform is designed for every season, every country, every creator." accent="evergreen" />
          <FeatureCard icon={<ShieldCheck className="h-5 w-5" />} title="Sandboxed ads" body="User-supplied ad integrations never execute arbitrary JavaScript. Sanitized identifiers only. Platform-controlled placement engine decides where and when ads render." accent="gold" />
          <FeatureCard icon={<TrendingUp className="h-5 w-5" />} title="Two ad layers" body="Platform's own Adsterra/Monetag publisher account runs on eligible pages. Users can optionally connect their own ad-network account for their share of inventory." accent="berry" />
          <FeatureCard icon={<Layers className="h-5 w-5" />} title="Page builder" body="Drag-and-reorder content blocks: headings, text, images, quotes, links, social links, dividers. No code required. Publish with one click." accent="evergreen" />
          <FeatureCard icon={<Sparkles className="h-5 w-5" />} title="Trust Score" body="Shadow-mode scoring of traffic quality, content risk, ad risk, spam risk — calibrated before automated actions are taken in Phase 2." accent="gold" />
          <FeatureCard icon={<ShieldCheck className="h-5 w-5" />} title="Admin controls" body="Platform-wide kill switch. Manual approval required for new ad integrations. Per-page moderation state. Per-integration lifecycle (Draft → Pending → Approved → Disabled → Revoked)." accent="berry" />
        </StaggerContainer>
      </section>

      {/* ─────────────────────────────────────────────────────────
          CTA — animated gradient banner
         ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-border/60">
        <div className="absolute inset-0 bg-gradient-to-br from-evergreen-dark via-evergreen to-berry/40" />
        <div className="absolute inset-0 mesh-bg opacity-30" />
        <FloatingOrbs count={3} colors={['gold', 'berry', 'sage']} />

        <div className="container mx-auto px-4 py-20 max-w-4xl text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0, rotate: -20 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gold text-cream shadow-gold mb-4 anim-pulse-glow"
          >
            <Sparkles className="h-7 w-7" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-cream mb-4"
          >
            Build your page. Shine bright.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-cream/80 text-lg mb-8 max-w-xl mx-auto"
          >
            Christmas 2026 is live. Your audience is waiting. Shine bright.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            <Button
              size="lg"
              onClick={() => navigate(user ? { name: 'dashboard' } : { name: 'signup' })}
              className="bg-gold text-cream hover:bg-gold-dark shadow-gold h-12 px-8 btn-glow relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center">
                {user ? 'Open dashboard' : 'Get started — free'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </span>
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

function StatBlock({ value, label, sublabel, accent }: {
  value: React.ReactNode; label: string; sublabel?: string; accent: 'evergreen' | 'gold' | 'berry'
}) {
  const colors = {
    evergreen: 'text-evergreen',
    gold: 'text-gold-dark',
    berry: 'text-berry',
  }
  return (
    <div className="relative group">
      <div className={`absolute inset-0 rounded-lg bg-gradient-to-br ${accent === 'evergreen' ? 'from-evergreen/10 to-transparent' : accent === 'gold' ? 'from-gold/10 to-transparent' : 'from-berry/10 to-transparent'} opacity-0 group-hover:opacity-100 transition-opacity`} />
      <div className="relative">
        <p className={`text-xl font-bold font-serif ${colors[accent]}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sublabel && <p className="text-[10px] text-muted-foreground/70">{sublabel}</p>}
      </div>
    </div>
  )
}

function Step({ n, icon, title, body, accent, delay }: {
  n: number; icon: React.ReactNode; title: string; body: string; accent: 'evergreen' | 'gold' | 'berry'; delay: number
}) {
  const accents = {
    evergreen: 'from-evergreen to-evergreen-dark text-cream shadow-festive',
    gold: 'from-gold to-gold-dark text-cream shadow-gold',
    berry: 'from-berry to-berry/70 text-cream shadow-festive',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative text-center md:text-left"
    >
      <motion.div
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${accents[accent]} mb-4 relative z-10`}
      >
        {icon}
        <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border-2 border-current text-current flex items-center justify-center text-xs font-bold">
          {n}
        </span>
      </motion.div>
      <h3 className="font-semibold text-lg mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </motion.div>
  )
}

function FeatureCard({ icon, title, body, accent }: {
  icon: React.ReactNode; title: string; body: string; accent: 'evergreen' | 'gold' | 'berry'
}) {
  const accents = {
    evergreen: 'bg-evergreen/10 text-evergreen group-hover:scale-110',
    gold: 'bg-gold/15 text-gold-dark group-hover:scale-110',
    berry: 'bg-berry/10 text-berry group-hover:scale-110',
  }
  return (
    <Card className="group transition-all hover:shadow-elevated hover:-translate-y-1 cursor-default">
      <CardContent className="pt-6">
        <motion.div
          whileHover={{ rotate: 5 }}
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${accents[accent]} mb-4 transition-transform`}
        >
          {icon}
        </motion.div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </CardContent>
    </Card>
  )
}
