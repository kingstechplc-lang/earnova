'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      const res = await fetch(`/api/p/${slug}`)
      if (cancelled) return
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Page not found')
        setLoading(false)
        return
      }
      const d = await res.json()
      setData(d)
      setLoading(false)
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
      <div className="animate-pulse text-muted-foreground">Loading page…</div>
    </div>
  )

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card>
          <CardContent className="py-16 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cranberry/10 mb-4">
              <Lock className="h-7 w-7 text-cranberry" />
            </div>
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

  return (
    <div className="view-fade min-h-screen">
      {/* Hero header with gradient */}
      <div className="relative overflow-hidden border-b border-border/60">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-evergreen-dark via-evergreen to-berry/30" />
        <div className="absolute inset-0 bg-pine-pattern opacity-20" />
        {/* Floating orbs */}
        <div className="absolute top-10 right-10 h-32 w-32 rounded-full bg-gold/20 blur-3xl" />
        <div className="absolute bottom-10 left-10 h-40 w-40 rounded-full bg-berry/30 blur-3xl" />

        <div className="container mx-auto px-4 py-10 md:py-14 max-w-3xl relative">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex flex-wrap items-center gap-2">
              {page.campaign && (
                <Badge className="bg-gold/20 text-gold-light border-gold/30 backdrop-blur-sm">
                  <Sparkles className="h-3 w-3 mr-1" /> {page.campaign.title}
                </Badge>
              )}
              <Badge variant="outline" className="bg-cream/10 text-cream border-cream/30 backdrop-blur-sm">
                {page.pageType.replace('_', ' ').toLowerCase()}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={share}
              className="bg-cream/15 text-cream hover:bg-cream/25 border-cream/20 backdrop-blur-sm"
            >
              <Share2 className="h-4 w-4 mr-1.5" /> Share
            </Button>
          </div>
          <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-tight text-cream break-words leading-tight">
            {page.title}
          </h1>
          {page.owner.name && (
            <p className="text-cream/80 text-sm md:text-base mt-2 flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold text-cream text-xs font-bold">
                {page.owner.name[0]?.toUpperCase()}
              </span>
              by <strong className="font-medium text-cream">{page.owner.name}</strong>
            </p>
          )}
          {page.description && (
            <p className="text-cream/70 mt-3 text-sm md:text-base max-w-2xl">{page.description}</p>
          )}
        </div>
      </div>

      {/* Compliance banner */}
      {hasAds && (
        <div className="container mx-auto px-4 pt-4 max-w-3xl">
          <Alert className="border-gold/30 bg-gold/5">
            <Info className="h-4 w-4 text-gold-dark" />
            <AlertDescription className="text-xs text-foreground/80">
              This page may display ads from the page creator&apos;s ad-network account (Adsterra/Monetag)
              and from the platform&apos;s own ad-network account. The platform does not pay the page creator;
              earnings come from the ad networks directly.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Content + ad placements */}
      <article className="container mx-auto px-4 py-8 max-w-3xl">
        {placementBySlot('HEADER') && (
          <div className="mb-6">
            <AdSlot placement={placementBySlot('HEADER')!} />
          </div>
        )}

        {page.blocks.map((block, idx) => (
          <div key={block.id}>
            <BlockRenderer block={block} />
            {idx === 0 && placementBySlot('AFTER_FIRST_BLOCK') && (
              <div className="my-8">
                <AdSlot placement={placementBySlot('AFTER_FIRST_BLOCK')!} />
              </div>
            )}
            {idx === 2 && page.blocks.length > 5 && placementBySlot('MID_CONTENT') && (
              <div className="my-8">
                <AdSlot placement={placementBySlot('MID_CONTENT')!} />
              </div>
            )}
          </div>
        ))}

        {placementBySlot('BEFORE_FOOTER') && (
          <div className="my-8">
            <AdSlot placement={placementBySlot('BEFORE_FOOTER')!} />
          </div>
        )}
        {placementBySlot('FOOTER') && (
          <div className="mt-8">
            <AdSlot placement={placementBySlot('FOOTER')!} />
          </div>
        )}

        {/* Share CTA */}
        <Card className="mt-12 overflow-hidden border-gold/20">
          <div className="h-1 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
          <CardContent className="py-8 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 mb-3">
              <Share2 className="h-5 w-5 text-gold-dark" />
            </div>
            <p className="font-semibold mb-1">Enjoyed this page?</p>
            <p className="text-sm text-muted-foreground mb-4">Share it with someone who would too.</p>
            <Button onClick={share} className="bg-evergreen text-cream hover:bg-evergreen-dark">
              <Share2 className="h-4 w-4 mr-2" /> Share this page
            </Button>
          </CardContent>
        </Card>
      </article>
    </div>
  )
}

function BlockRenderer({ block }: { block: { type: string; data: any } }) {
  const d = block.data || {}
  switch (block.type) {
    case 'HEADING':
      return (
        <h2 className="font-serif text-2xl md:text-3xl font-bold mt-8 mb-4 text-evergreen-dark flex items-center gap-3">
          <span className="h-1 w-1 rounded-full bg-gold" />
          {d.text}
        </h2>
      )
    case 'TEXT':
      return <p className="text-base md:text-lg leading-relaxed mb-5 text-foreground/90">{d.text}</p>
    case 'IMAGE':
      return (
        <figure className="my-8">
          {d.url && (
            <div className="relative overflow-hidden rounded-2xl shadow-festive">
              <img
                src={d.url}
                alt={d.alt || ''}
                className="w-full object-cover"
              />
              <div className="absolute inset-0 ring-2 ring-gold/30 ring-inset rounded-2xl pointer-events-none" />
            </div>
          )}
          {d.caption && (
            <figcaption className="text-sm text-muted-foreground mt-3 text-center italic">{d.caption}</figcaption>
          )}
        </figure>
      )
    case 'QUOTE':
      return (
        <blockquote className="my-8 relative pl-8 pr-4 py-2">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-gold to-gold-dark rounded-full" />
          <div className="absolute -top-2 -left-2 font-serif text-5xl text-gold/30 leading-none">&ldquo;</div>
          <p className="font-serif text-xl md:text-2xl italic text-foreground leading-relaxed">
            {d.text}
          </p>
          {d.author && (
            <footer className="text-sm text-muted-foreground mt-2">— {d.author}</footer>
          )}
        </blockquote>
      )
    case 'LINK':
      return (
        <a
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-evergreen underline decoration-gold/50 decoration-2 underline-offset-4 hover:decoration-gold mt-2 mb-4 font-medium"
        >
          <ExternalLink className="h-3.5 w-3.5" /> {d.label || d.url}
        </a>
      )
    case 'SOCIAL_LINK':
      return (
        <a
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 rounded-full border border-border bg-card px-5 py-2.5 mb-3 mr-2 hover:border-evergreen/40 hover:bg-evergreen/5 hover:shadow-festive transition-all"
        >
          <SocialIcon platform={d.platform} />
          <span className="text-sm font-medium">{d.label || d.platform}</span>
        </a>
      )
    case 'DIVIDER':
      return (
        <div className="my-8 flex items-center justify-center gap-3">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/40" />
          <Sparkles className="h-3 w-3 text-gold/60" />
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
