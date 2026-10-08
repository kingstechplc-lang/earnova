'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Sparkles as SparklesComponent } from '@/components/animated/sparkles'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { safeFetch } from '@/lib/safe-fetch'
import {
  Share2, ExternalLink, Lock, Sparkles, ChevronLeft, Info,
} from 'lucide-react'
import type { View } from '@/app/page'
import { AdSlot } from '@/components/ad/ad-slot'

type PublicPage = {
  id: string; slug: string; title: string; description: string | null
  pageType: string; campaign: { title: string } | null
  owner: { name: string | null; image: string | null; bio: string | null }
  moderationState: string
  blocks: Array<{ id: string; type: string; data: any; order: number }>
  theme?: {
    id: string
    slug: string
    name: string
    icon: string
    previewGradient: string
    cssVars: Record<string, string>
  } | null
}

type Placement = {
  id: string; slot: string; source: string; adNetworkCode: string
  integrationType: string | null; scriptReference: string | null; priority: number
}

type ApiResponse = {
  page: PublicPage
  placements: Placement[]
  policy: {
    platformAdsEnabled: boolean
    userAdsEnabled: boolean
    globalKillSwitch: boolean
    maxAdUnitsPerPage: number
  }
}

export default function PublicPageView({
  slug, navigate,
}: {
  slug: string
  navigate: (v: View) => void
}) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 300], [0, 60])
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0.4])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      const res = await safeFetch<ApiResponse>(`/api/p/${slug}`)
      if (cancelled) return
      if (res.error) {
        setError(res.error)
        setLoading(false)
        return
      }
      setData(res.data)
      setLoading(false)

      // ── Fire analytics event (Phase 6) ──────────────────────────────
      // Track the page view with the page ID + any campaign ref from the URL.
      // Fire-and-forget — doesn't affect rendering.
      if (res.data?.page?.id) {
        try {
          const { trackPageView } = await import('@/lib/analytics-client')
          const urlParams = new URLSearchParams(window.location.search)
          const campaign = urlParams.get('ref') || undefined
          trackPageView(res.data.page.id, campaign)
        } catch {
          // Analytics is best-effort — don't break on tracking failure
        }
      }
    })()
    return () => { cancelled = true }
  }, [slug])

  async function share() {
    const url = `${window.location.origin}/#/p/${slug}`
    try {
      if (navigator.share) {
        await navigator.share({ title: data?.page.title || '', url })
      } else {
        await navigator.clipboard.writeText(url)
        alert('Link copied to clipboard')
      }
    } catch {}
  }

  if (loading) return (
    <div className="container mx-auto px-4 py-20 max-w-md text-center">
      <div className="relative inline-block">
        <div className="absolute inset-0 rounded-full bg-evergreen/30 blur-xl animate-ping" />
        <div className="relative h-12 w-12 rounded-full border-2 border-evergreen/30 border-t-evergreen animate-spin" />
      </div>
      <p className="text-muted-foreground mt-4">Loading page…</p>
    </div>
  )

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card>
          <CardContent className="py-16 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cranberry/10 mb-4"
            >
              <Lock className="h-7 w-7 text-cranberry" />
            </motion.div>
            <p className="text-xl font-bold mb-1 font-serif">{error}</p>
            <p className="text-sm text-muted-foreground mb-6">This page may not exist or may have been removed.</p>
            <Button variant="outline" onClick={() => navigate({ name: 'landing' })}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  if (!data) return null

  const { page, placements, policy } = data
  const placementBySlot = (slot: string) => placements.find(p => p.slot === slot)
  const hasAds = placements.length > 0 && !policy.globalKillSwitch

  // ── Theme CSS variables ────────────────────────────────────────────────
  // When a page has a theme applied, propagate its cssVars to the root
  // container so all descendants pick up the overridden brand colors
  // (e.g., --evergreen, --gold, --background). The values come pre-parsed
  // from /api/p/[slug].
  const themeCssVars = (page.theme?.cssVars || {}) as React.CSSProperties

  return (
    <div className="min-h-screen" style={themeCssVars}>
      {/* ── Parallax Hero ── */}
      <div className="relative overflow-hidden border-b border-border/60">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-evergreen-dark via-evergreen to-berry/30" />
          <div className="absolute inset-0 mesh-bg opacity-30" />
          <div className="absolute inset-0 bg-pine-pattern opacity-20" />
          <FloatingOrbs count={4} colors={['gold', 'berry', 'sage', 'evergreen']} />
          <SparklesComponent count={12} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="container mx-auto px-4 py-12 md:py-16 max-w-3xl relative"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="flex flex-wrap items-center gap-2"
            >
              {page.campaign && (
                <Badge className="bg-gold/20 text-gold-light border-gold/30 backdrop-blur-sm">
                  <Sparkles className="h-3 w-3 mr-1 anim-sparkle-pulse" /> {page.campaign.title}
                </Badge>
              )}
              <Badge variant="outline" className="bg-cream/10 text-cream border-cream/30 backdrop-blur-sm capitalize">
                {page.pageType.replace('_', ' ').toLowerCase()}
              </Badge>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="sm"
                variant="secondary"
                onClick={share}
                className="bg-cream/15 text-cream hover:bg-cream/25 border-cream/20 backdrop-blur-sm btn-glow overflow-hidden"
              >
                <Share2 className="h-4 w-4 mr-1.5" /> Share
              </Button>
            </motion.div>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-cream break-words leading-tight"
          >
            {page.title}
          </motion.h1>
          {page.owner.name && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-cream/80 text-sm md:text-base mt-3 flex items-center gap-2"
            >
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-cream text-xs font-bold shadow-gold"
              >
                {page.owner.name[0]?.toUpperCase()}
              </motion.span>
              by <strong className="font-medium text-cream">{page.owner.name}</strong>
            </motion.p>
          )}
          {page.description && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-cream/70 mt-3 text-sm md:text-base max-w-2xl"
            >
              {page.description}
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* Post-hero ambient layer — very subtle, doesn't compete with the hero. */}
      <div className="relative">
        <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" aria-hidden />
        <FloatingOrbs count={1} colors={['evergreen']} className="opacity-15" />

      {/* Compliance banner */}
      {hasAds && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 container mx-auto px-4 pt-4 max-w-3xl"
        >
          <Alert className="border-gold/40 bg-gold/10 backdrop-blur-sm shadow-festive">
            <Info className="h-4 w-4 text-gold-dark" />
            <AlertDescription className="text-xs text-foreground/85">
              This page may display ads from the page creator&apos;s ad-network account (Adsterra/Monetag)
              and from the platform&apos;s own ad-network account. The platform does not pay the page creator;
              earnings come from the ad networks directly.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Content + ad placements */}
      <article className="relative z-10 container mx-auto px-4 py-8 max-w-3xl overflow-x-hidden">
        {placementBySlot('HEADER') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-6 bg-card/60 backdrop-blur-sm rounded-2xl p-2 shadow-sm"
          >
            <AdSlot placement={placementBySlot('HEADER')!} responsive={(data?.policy as any)?.adSlotResponsive ?? true} />
          </motion.div>
        )}

        {page.blocks.map((block, idx) => (
          <motion.div
            key={block.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <BlockRenderer block={block} />
            {idx === 0 && placementBySlot('AFTER_FIRST_BLOCK') && (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="my-8 bg-card/60 backdrop-blur-sm rounded-2xl p-2 shadow-sm"
              >
                <AdSlot placement={placementBySlot('AFTER_FIRST_BLOCK')!} responsive={(data?.policy as any)?.adSlotResponsive ?? true} />
              </motion.div>
            )}
            {idx === 2 && page.blocks.length > 5 && placementBySlot('MID_CONTENT') && (
              <div className="my-8 bg-card/60 backdrop-blur-sm rounded-2xl p-2 shadow-sm">
                <AdSlot placement={placementBySlot('MID_CONTENT')!} responsive={(data?.policy as any)?.adSlotResponsive ?? true} />
              </div>
            )}
          </motion.div>
        ))}

        {placementBySlot('BEFORE_FOOTER') && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="my-8 bg-card/60 backdrop-blur-sm rounded-2xl p-2 shadow-sm"
          >
            <AdSlot placement={placementBySlot('BEFORE_FOOTER')!} responsive={(data?.policy as any)?.adSlotResponsive ?? true} />
          </motion.div>
        )}
        {placementBySlot('FOOTER') && (
          <div className="mt-8 bg-card/60 backdrop-blur-sm rounded-2xl p-2 shadow-sm">
            <AdSlot placement={placementBySlot('FOOTER')!} responsive={(data?.policy as any)?.adSlotResponsive ?? true} />
          </div>
        )}

        {/* Share CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card className="mt-12 overflow-hidden border-gold/20 relative">
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
              <p className="font-semibold mb-1 relative z-10">Enjoyed this page?</p>
              <p className="text-sm text-muted-foreground mb-4 relative z-10">Share it with someone who would too.</p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="relative z-10 inline-block">
                <Button onClick={share} className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden">
                  <Share2 className="h-4 w-4 mr-2" /> Share this page
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </article>
      </div>
    </div>
  )
}

function BlockRenderer({ block }: { block: { type: string; data: any } }) {
  const d = block.data || {}
  switch (block.type) {
    case 'HEADING':
      return (
        <h2 className="font-serif text-2xl md:text-3xl font-bold mt-8 mb-4 text-evergreen-dark flex items-center gap-3">
          <motion.span
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="h-2 w-2 rounded-full bg-gold anim-sparkle-pulse"
          />
          {d.text}
        </h2>
      )
    case 'TEXT':
      return <p className="text-base md:text-lg leading-relaxed mb-5 text-foreground/90">{d.text}</p>
    case 'IMAGE':
      return (
        <figure className="my-8">
          {d.url && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="relative overflow-hidden rounded-2xl shadow-elevated"
            >
              <img
                src={d.url}
                alt={d.alt || ''}
                className="w-full object-cover transition-transform hover:scale-105 duration-700"
              />
              <div className="absolute inset-0 ring-2 ring-gold/30 ring-inset rounded-2xl pointer-events-none" />
            </motion.div>
          )}
          {d.caption && (
            <figcaption className="text-sm text-muted-foreground mt-3 text-center italic">{d.caption}</figcaption>
          )}
        </figure>
      )
    case 'QUOTE':
      return (
        <motion.blockquote
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="my-8 relative pl-8 pr-4 py-2"
        >
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-gold to-gold-dark rounded-full origin-top"
          />
          <div className="absolute -top-2 -left-2 font-serif text-5xl text-gold/30 leading-none">&ldquo;</div>
          <p className="font-serif text-xl md:text-2xl italic text-foreground leading-relaxed">
            {d.text}
          </p>
          {d.author && (
            <footer className="text-sm text-muted-foreground mt-2">— {d.author}</footer>
          )}
        </motion.blockquote>
      )
    case 'LINK':
      return (
        <motion.a
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ x: 4 }}
          className="inline-flex items-center gap-2 text-evergreen underline decoration-gold/50 decoration-2 underline-offset-4 hover:decoration-gold mt-2 mb-4 font-medium"
        >
          <ExternalLink className="h-3.5 w-3.5" /> {d.label || d.url}
        </motion.a>
      )
    case 'SOCIAL_LINK':
      return (
        <motion.a
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-5 py-2.5 mb-3 mr-2 hover:border-evergreen/40 hover:bg-evergreen/5 hover:shadow-festive transition-all"
        >
          <SocialIcon platform={d.platform} />
          <span className="text-sm font-medium">{d.label || d.platform}</span>
        </motion.a>
      )
    case 'DIVIDER':
      return (
        <div className="my-8 flex items-center justify-center gap-3">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/40" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          >
            <Sparkles className="h-3 w-3 text-gold/60" />
          </motion.div>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/40" />
        </div>
      )
    default:
      return null
  }
}

function SocialIcon({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    whatsapp: 'bg-evergreen text-cream',
    telegram: 'bg-chart-4 text-cream',
    facebook: 'bg-berry text-cream',
    x: 'bg-foreground text-background',
    instagram: 'bg-gradient-to-br from-berry via-gold to-evergreen text-cream',
    tiktok: 'bg-foreground text-background',
    youtube: 'bg-cranberry text-cream',
  }
  const c = colors[platform] || 'bg-muted text-foreground'
  return (
    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${c} text-xs font-bold uppercase`}>
      {platform[0]}
    </span>
  )
}
