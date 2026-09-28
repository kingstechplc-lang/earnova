'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Share2, ExternalLink, Lock } from 'lucide-react'
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

  if (loading) return <div className="container mx-auto px-4 py-12">Loading…</div>
  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-lg font-semibold mb-1">{error}</p>
            <p className="text-sm text-muted-foreground mb-4">This page may not exist or may have been removed.</p>
            <Button variant="outline" onClick={() => navigate({ name: 'landing' })}>Back to home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  if (!data) return null

  const { page, placements, policy } = data
  const placementBySlot = (slot: string) => placements.find(p => p.slot === slot)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border bg-background/80 backdrop-blur">
        <div className="container mx-auto px-4 py-4 max-w-3xl">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {page.campaign && (
                <Badge variant="secondary" className="mb-1">{page.campaign.title}</Badge>
              )}
              <h1 className="text-2xl md:text-3xl font-bold break-words">{page.title}</h1>
              {page.owner.name && (
                <p className="text-sm text-muted-foreground mt-1">by {page.owner.name}</p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={share}>
              <Share2 className="h-4 w-4 mr-1" /> Share
            </Button>
          </div>
          {page.description && (
            <p className="text-muted-foreground mt-3 text-sm">{page.description}</p>
          )}
        </div>
      </div>

      {/* Compliance banner (only on first view) */}
      {(policy.platformAdsEnabled || policy.userAdsEnabled) && !policy.globalKillSwitch && placements.length > 0 && (
        <div className="container mx-auto px-4 pt-3 max-w-3xl">
          <Alert>
            <AlertDescription className="text-xs">
              This page may display ads from the page creator&apos;s ad-network account (Adsterra/Monetag)
              and from the platform&apos;s own ad-network account. The platform does not pay the page creator;
              earnings come from the ad networks directly.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Content + ad placements */}
      <article className="container mx-auto px-4 py-6 max-w-3xl">
        {/* HEADER placement */}
        {placementBySlot('HEADER') && (
          <div className="mb-6">
            <AdSlot placement={placementBySlot('HEADER')!} />
          </div>
        )}

        {page.blocks.map((block, idx) => (
          <div key={block.id}>
            <BlockRenderer block={block} />
            {/* AFTER_FIRST_BLOCK placement */}
            {idx === 0 && placementBySlot('AFTER_FIRST_BLOCK') && (
              <div className="my-8">
                <AdSlot placement={placementBySlot('AFTER_FIRST_BLOCK')!} />
              </div>
            )}
            {/* MID_CONTENT placement (after block index 2 if many blocks) */}
            {idx === 2 && page.blocks.length > 5 && placementBySlot('MID_CONTENT') && (
              <div className="my-8">
                <AdSlot placement={placementBySlot('MID_CONTENT')!} />
              </div>
            )}
          </div>
        ))}

        {/* BEFORE_FOOTER + FOOTER placements */}
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

        {/* Share CTA at bottom */}
        <Card className="mt-12 bg-muted/30">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Enjoyed this page? Share it with someone who would too.
            </p>
            <Button size="sm" onClick={share}>
              <Share2 className="h-4 w-4 mr-1" /> Share this page
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
      return <h2 className="text-xl md:text-2xl font-bold mt-6 mb-3">{d.text}</h2>
    case 'TEXT':
      return <p className="text-base leading-relaxed mb-4 whitespace-pre-line">{d.text}</p>
    case 'IMAGE':
      return (
        <figure className="my-6">
          {d.url && (
            <img
              src={d.url}
              alt={d.alt || ''}
              className="w-full rounded-lg border border-border"
            />
          )}
          {d.caption && (
            <figcaption className="text-sm text-muted-foreground mt-2 text-center">{d.caption}</figcaption>
          )}
        </figure>
      )
    case 'QUOTE':
      return (
        <blockquote className="my-6 border-l-4 border-primary pl-4 italic text-lg">
          {d.text}
          {d.author && <footer className="text-sm not-italic text-muted-foreground mt-1">— {d.author}</footer>}
        </blockquote>
      )
    case 'LINK':
      return (
        <a
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary underline mt-2 mb-4"
        >
          <ExternalLink className="h-3 w-3" /> {d.label || d.url}
        </a>
      )
    case 'SOCIAL_LINK':
      return (
        <a
          href={d.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 mb-3 mr-2 hover:bg-muted/40 transition"
        >
          <SocialIcon platform={d.platform} />
          <span className="text-sm">{d.label || d.platform}</span>
        </a>
      )
    case 'DIVIDER':
      return <hr className="my-6 border-border" />
    default:
      return null
  }
}

function SocialIcon({ platform }: { platform: string }) {
  return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-bold uppercase">{platform[0]}</span>
}
