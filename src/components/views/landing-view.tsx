'use client'
import {
  motion,
  MotionConfig,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
  useReducedMotion,
} from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TiltCard } from '@/components/animated/tilt-card'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { Sparkles as SparklesComponent } from '@/components/animated/sparkles'
import { CountUp } from '@/components/animated/count-up'
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animated/motion'
import {
  Sparkles, ArrowRight, ChevronDown, Globe2, TrendingUp, Users,
  Compass, Wallet, LayoutDashboard, ShieldCheck, Smartphone,
  Heart, MapPin, Globe, Clock, Eye, type LucideIcon,
} from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'

/* ──────────────────────────────────────────────────────────────────────────
   Design tokens — shared accent maps so every section uses the same
   visual language (gradient badges, soft tints, gradient text).
   ────────────────────────────────────────────────────────────────────────── */
type Accent = 'evergreen' | 'gold' | 'berry' | 'sage'

const accentIconBg: Record<Accent, string> = {
  evergreen: 'bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive',
  gold:      'bg-gradient-to-br from-gold-light to-gold-dark text-cream shadow-gold',
  berry:     'bg-gradient-to-br from-berry to-cranberry text-cream shadow-festive',
  sage:      'bg-gradient-to-br from-sage to-evergreen-light text-cream shadow-festive',
}
const accentText: Record<Accent, string> = {
  evergreen: 'text-evergreen',
  gold:      'text-gold-dark',
  berry:     'text-berry',
  sage:      'text-sage',
}
const accentGradient: Record<Accent, string> = {
  evergreen: 'from-evergreen to-evergreen-dark',
  gold:      'from-gold to-gold-dark',
  berry:     'from-berry to-cranberry',
  sage:      'from-sage to-evergreen-light',
}

/* ──────────────────────────────────────────────────────────────────────────
   Static content — kept at module scope (no per-render cost, fully typed).
   ────────────────────────────────────────────────────────────────────────── */

const TRUST_STATS: Array<{
  icon: LucideIcon
  big: string
  sub: string
  count: { value: number; prefix?: string; suffix?: string }
  accent: Accent
}> = [
  { icon: Globe2,       big: 'Global',          sub: 'Countries supported',     count: { value: 195, suffix: '+' }, accent: 'evergreen' },
  { icon: Heart,        big: 'Free',            sub: 'Always free to create',   count: { value: 0,   prefix: '$' },  accent: 'gold' },
  { icon: ShieldCheck,  big: 'No ads required', sub: 'Monetization is optional',count: { value: 0 },               accent: 'berry' },
  { icon: Smartphone,   big: 'Mobile-first',   sub: 'Works on any device',     count: { value: 100, suffix: '%' }, accent: 'sage' },
]

const FEATURES: Array<{ icon: LucideIcon; title: string; body: string; accent: Accent }> = [
  { icon: LayoutDashboard, title: 'Create',    body: 'Build beautiful Special Pages with a drag-and-drop builder. Headings, text, images, quotes, links — no code required.',              accent: 'evergreen' },
  { icon: Globe2,          title: 'Publish',   body: 'Share your page with a custom URL. One click to go live, one click to update — your audience always sees the latest.',          accent: 'gold' },
  { icon: TrendingUp,      title: 'Grow',      body: 'Track visitors, see where they come from, and understand what resonates. Rich analytics, built in — no extra setup.',              accent: 'berry' },
  { icon: Users,           title: 'Connect',   body: 'Follow creators, react to posts, and build a community around your work. Real relationships, not just clicks.',                accent: 'sage' },
  { icon: Compass,         title: 'Discover',  body: 'Explore content from creators worldwide. Find your next favorite voice — across regions, languages, and topics.',             accent: 'evergreen' },
  { icon: Wallet,          title: 'Monetize',  body: 'Optionally connect ad networks when you\u2019re ready. Always your choice, never required, never auto-enabled.',                accent: 'gold' },
]

const PAGE_TYPES: Array<{ emoji: string; label: string; desc: string; accent: Accent }> = [
  { emoji: '👤', label: 'Personal',     desc: 'Your story, your way',         accent: 'evergreen' },
  { emoji: '🎄', label: 'Celebration',  desc: 'Seasonal + festive hubs',      accent: 'gold' },
  { emoji: '🔗', label: 'Link Hub',     desc: 'All your links in one place',  accent: 'berry' },
  { emoji: '✨', label: 'Creator',      desc: 'Showcase your craft',          accent: 'sage' },
  { emoji: '✍️', label: 'Blogger',      desc: 'Long-form writing',            accent: 'evergreen' },
  { emoji: '📸', label: 'Photography',  desc: 'Visual portfolios',            accent: 'gold' },
  { emoji: '🎵', label: 'Music',        desc: 'Artist + album pages',         accent: 'berry' },
  { emoji: '🎮', label: 'Gaming',       desc: 'Streamers + esports',          accent: 'sage' },
  { emoji: '💼', label: 'Business',     desc: 'Brand + storefront',           accent: 'evergreen' },
  { emoji: '🎉', label: 'Event',        desc: 'Conferences + meetups',       accent: 'gold' },
]

const STEPS: Array<{ n: number; title: string; body: string; accent: Accent }> = [
  { n: 1, title: 'Create your account', body: 'Sign up free with your email. No credit card, no commitment, no ads shown to you.', accent: 'evergreen' },
  { n: 2, title: 'Claim your username', body: 'Pick a memorable username — your URL becomes earnova.app/u/yourname.',                accent: 'gold' },
  { n: 3, title: 'Build your first page', body: 'Choose a page type, drag in content blocks, and customize freely.',                accent: 'berry' },
  { n: 4, title: 'Share it with the world', body: 'Publish and share your URL anywhere. Watch your audience grow.',                accent: 'sage' },
]

const MONETIZATION_POINTS: Array<{ icon: LucideIcon; title: string; body: string; accent: Accent }> = [
  { icon: ShieldCheck, title: 'Optional, not required',        body: 'Earnova is free forever. Monetization is your choice — turn it on only if and when you want to.',          accent: 'evergreen' },
  { icon: Wallet,      title: 'Your ad networks, your rules',  body: 'Connect Adsterra or Monetag when you\u2019re ready. You own the relationship with the ad network — not us.', accent: 'gold' },
  { icon: TrendingUp,  title: 'No fake earnings',              body: 'We never fabricate revenue numbers. Real traffic, real analytics, real transparency — always.',           accent: 'berry' },
]

const REGIONS = [
  'Africa', 'North America', 'South America', 'Europe',
  'Asia', 'Middle East', 'Oceania',
]

const LOCAL_FEATURES: Array<{ icon: LucideIcon; label: string; value: string }> = [
  { icon: Globe,      label: 'Country',  value: 'Detected automatically' },
  { icon: Clock,      label: 'Timezone', value: 'Auto-set per visitor' },
  { icon: MapPin,     label: 'Locale',   value: 'Respects your region' },
  { icon: Smartphone, label: 'Language', value: 'Multi-language ready' },
]

/* ──────────────────────────────────────────────────────────────────────────
   Hooks + helpers used by the enhanced animations below.
   ────────────────────────────────────────────────────────────────────────── */

/** Returns true when the viewport is mobile-width. Used to dial down particle
 * counts and disable magnetic hover (which is awkward on touch). */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [breakpoint])
  return isMobile
}

/** MagneticWrap — wraps any child in a motion.div that subtly translates
 * toward the cursor on mouse-move. Returns to origin on leave. Springy.
 * Disabled on touch / mobile via `disabled` prop. */
function MagneticWrap({
  children,
  intensity = 0.25,
  disabled = false,
}: {
  children: React.ReactNode
  intensity?: number
  disabled?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 220, damping: 14, mass: 0.4 })
  const sy = useSpring(y, { stiffness: 220, damping: 14, mass: 0.4 })

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (disabled) return
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    x.set(dx * intensity)
    y.set(dy * intensity)
  }
  function onLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy, display: 'inline-block' }}
      whileTap={{ scale: 0.96 }}
    >
      {children}
    </motion.div>
  )
}

/** SplitHeadline — animates each word of a phrase with a staggered
 * slide-up + fade. Words that match `goldWord` get the shimmering
 * gradient-text-gold treatment plus the new fast shimmer keyframe. */
function SplitHeadline({
  words,
  goldWord,
}: {
  words: string[]
  goldWord?: string
}) {
  const container = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.12, delayChildren: 0.15 },
    },
  }
  const wordVariant = {
    hidden: { opacity: 0, y: 36 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 220, damping: 22 },
    },
  }
  return (
    <motion.h1
      variants={container}
      initial="hidden"
      animate="visible"
      className="font-serif text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6"
    >
      {words.map((w, i) => (
        <span key={i} className="block">
          <motion.span
            variants={wordVariant}
            className={
              w === goldWord
                ? 'inline-block gradient-text-gold animate-text-shimmer'
                : 'inline-block text-cream'
            }
          >
            {w}
          </motion.span>
        </span>
      ))}
    </motion.h1>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   LandingView — the redesigned home page.
   ────────────────────────────────────────────────────────────────────────── */
export default function LandingView({
  navigate, user,
}: {
  navigate: (v: View) => void
  user: CurrentUser | null
}) {
  // Logged-in users get routed to dashboard; logged-out users to signup.
  const primaryCtaTarget: View = user ? { name: 'dashboard' } : { name: 'signup' }

  // Mobile detection — used to dial down particle counts and disable
  // magnetic hover on touch devices (where there is no cursor).
  const isMobile = useIsMobile()
  const prefersReducedMotion = useReducedMotion()

  // Hero parallax — orbs + sparkle layer translate slower than content
  // as the user scrolls past the hero. Disabled for reduced-motion.
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress: heroScrollY } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const heroBgY = useTransform(heroScrollY, [0, 1], [0, prefersReducedMotion ? 0 : 120])
  const heroBgOpacity = useTransform(heroScrollY, [0, 1], [1, prefersReducedMotion ? 1 : 0.3])
  const heroContentY = useTransform(heroScrollY, [0, 1], [0, prefersReducedMotion ? 0 : -40])

  // Trust-bar stats trigger — CountUp should run only once, when the
  // section enters the viewport. `useInView` returns a stable boolean
  // after the first intersection.
  const statsRef = useRef<HTMLDivElement>(null)
  const statsInView = useInView(statsRef, { once: true, margin: '-80px' })

  // Smooth-scroll to the monetization section (no hash routing conflicts).
  const scrollToMonetization = () => {
    if (typeof document !== 'undefined') {
      document.getElementById('monetization')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  // Particle counts are dialled down on mobile for performance.
  const heroOrbCount = isMobile ? 3 : 5
  const heroSparkleCount = isMobile ? 6 : 10

  return (
    <MotionConfig reducedMotion="user">
    <div className="overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────────
          1. HERO — full-height, layered ambient background, centered CTA
          ─────────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-evergreen-dark via-evergreen to-berry/30" aria-hidden />
        <div className="absolute inset-0 bg-pine-pattern opacity-20" aria-hidden />
        <div className="absolute inset-0 mesh-bg opacity-30" aria-hidden />

        {/* Parallax-wrapped orbs + sparkles — they drift at a different rate
            than the content as the user scrolls past the hero. */}
        <motion.div style={{ y: heroBgY, opacity: heroBgOpacity }} className="absolute inset-0">
          <FloatingOrbs count={heroOrbCount} colors={['gold', 'berry', 'sage', 'evergreen', 'gold']} />
          <SparklesComponent count={heroSparkleCount} />
        </motion.div>

        {/* Soft vignette for text legibility at top + bottom edges */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-evergreen-dark/60 via-transparent to-evergreen-dark/40 pointer-events-none"
          aria-hidden
        />

        <motion.div style={{ y: heroContentY }} className="container mx-auto px-4 max-w-4xl text-center relative z-10 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Badge className="mb-6 glass-strong border-gold/30 text-gold-light hover:bg-gold/10 px-4 py-1.5 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5 mr-2 text-gold" />
              Global Creator Platform
              <span className="ml-2 h-1 w-1 rounded-full bg-gold animate-pulse" />
            </Badge>
          </motion.div>

          {/* Word-by-word spring stagger reveal — "Shine." gets the
              shimmering gold gradient (animated CSS keyframe). */}
          <SplitHeadline words={['Create.', 'Share.', 'Shine.']} goldWord="Shine." />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-base md:text-xl text-cream/85 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Build beautiful pages, grow your audience, and optionally monetize your content.
            Free forever — no ads required, no country restrictions.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-6"
          >
            {/* Primary CTA — magnetic hover. The button subtly slides toward
                the cursor on desktop. Disabled on touch / reduced-motion. */}
            <MagneticWrap intensity={0.3} disabled={isMobile || !!prefersReducedMotion}>
              <Button
                size="lg"
                onClick={() => navigate(primaryCtaTarget)}
                className="bg-gold text-cream hover:bg-gold-dark shadow-gold h-14 px-8 text-base btn-glow relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center font-semibold">
                  {user ? 'Go to dashboard' : 'Create Your Page'}
                  <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
            </MagneticWrap>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate({ name: 'public', slug: 'kingsley-christmas' })}
                className="border-cream/30 bg-cream/10 text-cream hover:bg-cream/20 hover:text-cream backdrop-blur-md h-14 px-8 text-base"
              >
                <Eye className="h-4 w-4 mr-2" />
                Explore Earnova
              </Button>
            </motion.div>
          </motion.div>

          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
            onClick={scrollToMonetization}
            className="inline-flex items-center gap-1 text-sm text-gold-light hover:text-gold transition-colors underline-offset-4 hover:underline"
          >
            Learn how monetization works
            <ArrowRight className="h-3.5 w-3.5" />
          </motion.button>
        </motion.div>

        {/* Animated scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none"
          aria-hidden
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-1"
          >
            <span className="text-[10px] uppercase tracking-widest text-cream/60">Scroll</span>
            <ChevronDown className="h-5 w-5 text-cream/70" />
          </motion.div>
        </motion.div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          2. TRUST / STATS BAR — 4 glass cards with CountUp + gradient icons
          ─────────────────────────────────────────────────────────────── */}
      <section className="relative px-4 py-16 md:py-20">
        <div className="absolute inset-0 mesh-bg opacity-20" aria-hidden />
        <div className="container mx-auto max-w-6xl relative">
          <FadeIn className="text-center mb-10 max-w-2xl mx-auto">
            <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight mb-2">
              Built for <span className="gradient-text-evergreen">everyone, everywhere</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              No paywalls. No gatekeeping. No country restrictions.
            </p>
          </FadeIn>

          <div ref={statsRef}>
            <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {TRUST_STATS.map((s, i) => {
                const Icon = s.icon
                return (
                  <StaggerItem key={s.big}>
                    <TiltCard intensity={4} className="h-full">
                      <div className="glass-card rounded-2xl p-5 shadow-festive border border-border/40 h-full flex flex-col gap-3 transition-shadow duration-300 hover:shadow-elevated hover:border-gold/40">
                        <div className="flex items-start justify-between gap-3">
                          {/* Gradient icon badge gently floats — each with its
                              own staggered delay so they don't sync up. */}
                          <div
                            className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${accentIconBg[s.accent]} animate-float-icon`}
                            style={{ animationDelay: `${i * 0.6}s` }}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className={`font-serif font-bold text-2xl md:text-3xl ${accentText[s.accent]}`}>
                            {s.count.prefix}<CountUp value={s.count.value} duration={1400} active={statsInView} />{s.count.suffix}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-serif text-lg md:text-xl font-bold leading-tight">{s.big}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                        </div>
                      </div>
                    </TiltCard>
                  </StaggerItem>
                )
              })}
            </StaggerContainer>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          3. WHAT IS EARNOVA? — 6 feature cards
          ─────────────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-20 max-w-6xl">
        <FadeIn className="text-center mb-14 max-w-3xl mx-auto">
          <Badge variant="outline" className="mb-3 border-evergreen/30 text-evergreen bg-evergreen/5">
            <Sparkles className="h-3 w-3 mr-1.5" /> What is Earnova?
          </Badge>
          <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="gradient-text-evergreen">Earnova</span> is your global creator platform
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Build pages. Grow an audience. Connect with creators worldwide. Monetize if and when you want.
            Everything you need to shine — in one beautiful place.
          </p>
        </FadeIn>

        <StaggerContainer className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon
            return (
              <StaggerItem key={f.title}>
                <TiltCard intensity={4} className="h-full">
                  <div className="glass-card rounded-2xl p-6 shadow-festive border border-border/40 h-full flex flex-col gap-4 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 hover:border-gold/40 group">
                    {/* Icon badge springs up + glows on card hover. */}
                    <motion.div
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${accentIconBg[f.accent]} transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3`}
                    >
                      <Icon className="h-5 w-5" />
                    </motion.div>
                    <div>
                      <h3 className="font-serif text-xl font-bold mb-2">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                    </div>
                  </div>
                </TiltCard>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          4. BUILD ANYTHING — 10 page-type tiles
          ─────────────────────────────────────────────────────────────── */}
      <section className="relative border-y border-border/60 bg-gradient-to-b from-evergreen/5 via-background to-gold/5 overflow-hidden">
        <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-50" />
        <div className="container mx-auto px-4 py-20 max-w-6xl relative">
          <FadeIn className="text-center mb-14 max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-3 border-gold/40 text-gold-dark bg-gold/5">
              <Sparkles className="h-3 w-3 mr-1.5" /> Page Types
            </Badge>
            <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Build anything you can <span className="gradient-text-gold">imagine</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Ten page types, infinitely customizable. Pick one, mix blocks, and make it yours.
            </p>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {PAGE_TYPES.map((p) => (
              <StaggerItem key={p.label}>
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 2, y: -4 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                  className="group relative glass-card rounded-2xl p-5 border border-border/40 shadow-festive h-full flex flex-col items-center text-center gap-3 overflow-hidden cursor-default"
                >
                  {/* Gradient wash on hover */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${accentGradient[p.accent]} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                    aria-hidden
                  />
                  {/* Emoji badge spring-scales + counter-rotates on hover */}
                  <motion.div
                    whileHover={{ scale: 1.18, rotate: -6 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 14 }}
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${accentGradient[p.accent]} shadow-md`}
                  >
                    <span className="text-2xl" aria-hidden>{p.emoji}</span>
                  </motion.div>
                  <div className="relative">
                    <div className="font-serif font-bold text-base">{p.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerContainer>

          <FadeIn delay={0.2} className="text-center mt-10">
            <Button
              size="lg"
              onClick={() => navigate(primaryCtaTarget)}
              className="bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive h-12 px-7 btn-glow overflow-hidden group"
            >
              <span className="relative z-10 flex items-center font-semibold">
                {user ? 'Go to dashboard' : 'Start building — free'}
                <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
              </span>
            </Button>
          </FadeIn>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          5. HOW IT WORKS — 4-step horizontal timeline
          ─────────────────────────────────────────────────────────────── */}
      <section className="container mx-auto px-4 py-20 max-w-6xl">
        <FadeIn className="text-center mb-14 max-w-3xl mx-auto">
          <Badge variant="outline" className="mb-3 border-berry/30 text-berry bg-berry/5">
            <Sparkles className="h-3 w-3 mr-1.5" /> How it works
          </Badge>
          <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight mb-4">
            Live in <span className="gradient-text-festive">four steps</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            No payment, no coding, no setup. Just sign up, build, and share.
          </p>
        </FadeIn>

        <div className="grid gap-8 md:grid-cols-4 relative">
          {/* Connecting line — draws in from left to right when scrolled
              into view, with the rich tri-color gradient + glow. */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 timeline-line origin-left opacity-70"
            aria-hidden
          />

          {STEPS.map((s, i) => (
            <FadeIn key={s.n} delay={i * 0.1} y={30}>
              <div className="relative text-center md:text-left">
                <div className="inline-flex">
                  {/* Number badge springs in (subtle rotate on hover) */}
                  <motion.div
                    whileHover={{ scale: 1.08, rotate: 4 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${accentIconBg[s.accent]} relative z-10`}
                  >
                    <span className="font-serif font-bold text-xl">{s.n}</span>
                  </motion.div>
                </div>
                <h3 className="font-semibold text-lg mt-4 mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          6. MONETIZATION, DONE RIGHT — distinctive gold/berry-tinted bg
          ─────────────────────────────────────────────────────────────── */}
      <section id="monetization" className="relative overflow-hidden border-y border-gold/20 scroll-mt-20">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-berry/5 to-evergreen/10" aria-hidden />
        <div className="absolute inset-0 bg-pine-pattern opacity-10" aria-hidden />
        <FloatingOrbs count={isMobile ? 2 : 3} colors={['gold', 'berry', 'gold']} className="opacity-50" />
        {/* Dynamic sparkle field — more particles on desktop, fewer on
            mobile. The Sparkles component already randomizes size, delay,
            duration, and rotation per particle. */}
        <SparklesComponent count={isMobile ? 4 : 12} />

        <div className="container mx-auto px-4 py-20 max-w-6xl relative">
          <FadeIn className="text-center mb-14 max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-3 border-gold/40 text-gold-dark bg-gold/10 backdrop-blur-sm">
              <Wallet className="h-3 w-3 mr-1.5" /> Monetization
            </Badge>
            <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Monetization, <span className="gradient-text-gold">done right</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Three principles that make Earnova different from every other creator platform.
            </p>
          </FadeIn>

          <StaggerContainer className="grid gap-5 md:grid-cols-3">
            {MONETIZATION_POINTS.map((p) => {
              const Icon = p.icon
              return (
                <StaggerItem key={p.title}>
                  <TiltCard intensity={4} className="h-full">
                    <div className="glass-card rounded-2xl p-6 shadow-festive border border-border/40 h-full flex flex-col gap-4">
                      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${accentIconBg[p.accent]}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-serif text-xl font-bold mb-2">{p.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                      </div>
                    </div>
                  </TiltCard>
                </StaggerItem>
              )
            })}
          </StaggerContainer>

          {/* Compliance callout */}
          <FadeIn delay={0.2}>
            <div className="mt-10 p-5 md:p-6 rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/10 via-gold/5 to-transparent relative overflow-hidden">
              <div className="absolute inset-0 shimmer-bg opacity-30" aria-hidden />
              <div className="flex items-start gap-4 relative">
                <div className="rounded-full bg-gold/20 p-2.5 shrink-0">
                  <ShieldCheck className="h-5 w-5 text-gold-dark" />
                </div>
                <div>
                  <p className="font-semibold text-foreground mb-1.5">Important compliance note</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Earnova does <strong className="text-foreground">not</strong> pay users. Earnings come from
                    external ad networks (Adsterra or Monetag) that you connect yourself. We cannot guarantee
                    any level of earnings — or any earnings at all. You are responsible for your traffic quality
                    and your ad-network account standing.
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          7. GLOBAL PLATFORM — regions + local features
          ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-70" aria-hidden />
        <div className="absolute inset-0 mesh-bg opacity-20" aria-hidden />
        <FloatingOrbs count={isMobile ? 2 : 3} colors={['evergreen', 'gold', 'sage']} className="opacity-50" />

        <div className="container mx-auto px-4 py-20 max-w-6xl relative">
          <FadeIn className="text-center mb-14 max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-3 border-evergreen/30 text-evergreen bg-evergreen/5">
              <Globe2 className="h-3 w-3 mr-1.5" /> Global Platform
            </Badge>
            <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Built for the <span className="gradient-text-evergreen">entire world</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Earnova is not tied to any country. Create from anywhere, for anyone — your audience is global.
            </p>
          </FadeIn>

          {/* Region pills */}
          <FadeIn delay={0.1}>
            <div className="flex flex-wrap justify-center gap-3 mb-12 max-w-4xl mx-auto">
              {REGIONS.map((region, i) => (
                <motion.div
                  key={region}
                  initial={{ opacity: 0, scale: 0.85 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.4, delay: i * 0.06, type: 'spring', stiffness: 200 }}
                  whileHover={{ y: -2, scale: 1.04 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-border/50 shadow-festive text-sm font-medium transition-shadow duration-300 hover:shadow-elevated hover:border-gold/40"
                >
                  <MapPin className="h-3.5 w-3.5 text-evergreen" />
                  {region}
                </motion.div>
              ))}
            </div>
          </FadeIn>

          {/* Local features grid */}
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {LOCAL_FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <StaggerItem key={f.label}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 18 }}
                    className="glass-card rounded-2xl p-5 border border-border/40 shadow-festive h-full text-center flex flex-col items-center gap-2 transition-shadow duration-300 hover:shadow-elevated hover:border-gold/40 group"
                  >
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-evergreen/10 text-evergreen transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">{f.label}</div>
                      <div className="text-sm font-medium mt-0.5">{f.value}</div>
                    </div>
                  </motion.div>
                </StaggerItem>
              )
            })}
          </StaggerContainer>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          8. FINAL CTA — large gradient card with breathing gold glow
          ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-4 py-20">
        <div className="container mx-auto max-w-5xl relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-3xl overflow-hidden shadow-elevated"
          >
            {/* Gradient card background (evergreen → berry with gold wash) */}
            <div className="absolute inset-0 bg-gradient-to-br from-evergreen-dark via-evergreen to-berry/40" aria-hidden />
            <div className="absolute inset-0 bg-gradient-to-tr from-gold/20 via-transparent to-berry/30 mix-blend-overlay" aria-hidden />
            <div className="absolute inset-0 bg-pine-pattern opacity-20" aria-hidden />
            <FloatingOrbs count={isMobile ? 2 : 3} colors={['gold', 'berry', 'sage']} />
            {/* Breathing gold glow overlay — opacity + scale pulse over 4s.
                Disabled by reduced-motion via the global CSS media query. */}
            <div
              className="absolute inset-0 pointer-events-none animate-cta-glow"
              style={{
                backgroundImage:
                  'radial-gradient(ellipse at center, oklch(0.78 0.14 84 / 0.35) 0%, transparent 60%)',
              }}
              aria-hidden
            />

            <div className="relative z-10 px-6 md:px-16 py-16 md:py-20 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0, rotate: -20 }}
                whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gold text-cream shadow-gold mb-6"
              >
                <Sparkles className="h-7 w-7" />
              </motion.div>

              <h2 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-cream mb-4">
                Ready to create your page?
              </h2>
              <p className="text-cream/80 text-lg mb-8 max-w-xl mx-auto">
                Join Earnova today. It&apos;s free — and always will be.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <MagneticWrap intensity={0.25} disabled={isMobile || !!prefersReducedMotion}>
                  <Button
                    size="lg"
                    onClick={() => navigate(primaryCtaTarget)}
                    className="bg-gold text-cream hover:bg-gold-dark shadow-gold h-14 px-10 text-base btn-glow relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center font-semibold">
                      {user ? 'Go to dashboard' : 'Get started — free'}
                      <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Button>
                </MagneticWrap>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate({ name: 'public', slug: 'kingsley-christmas' })}
                    className="border-cream/30 bg-cream/10 text-cream hover:bg-cream/20 hover:text-cream backdrop-blur-md h-14 px-8 text-base"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Explore Earnova
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          9. FOOTER LEGAL LINKS — Terms + Privacy (text-only for now)
          ─────────────────────────────────────────────────────────────── */}
      <section className="border-t border-border/60 py-8 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="text-xs text-muted-foreground leading-relaxed">
            By signing up, you agree to our{' '}
            <button
              type="button"
              className="text-evergreen hover:text-evergreen-dark hover:underline font-medium transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              Terms
            </button>
            {' + '}
            <button
              type="button"
              className="text-evergreen hover:text-evergreen-dark hover:underline font-medium transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              Privacy Policy
            </button>
            . Earnings are not guaranteed and depend on your own ad-network relationship.
          </p>
        </div>
      </section>
    </div>
    </MotionConfig>
  )
}
