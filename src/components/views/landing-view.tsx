'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
    <div>
      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
          <Badge variant="secondary" className="mb-4">Christmas 2026 campaign · now active</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-3xl">
            Create a page. Share it. <span className="text-muted-foreground">Optionally monetize.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8">
            A global creator-publishing platform. Build a Special Page for Christmas 2026, publish
            content, share the URL, and optionally connect your own Adsterra or Monetag account to
            monetize your legitimate traffic.
          </p>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <Button size="lg" onClick={() => navigate({ name: 'dashboard' })}>
                Open dashboard
              </Button>
            ) : (
              <Button size="lg" onClick={() => navigate({ name: 'signup' })}>
                Create your page
              </Button>
            )}
            <Button size="lg" variant="outline" onClick={() => navigate({ name: 'public', slug: 'kingsley-christmas' })}>
              See an example page
            </Button>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
            <StatCard label="Active campaigns" value={campaigns.length.toString()} />
            <StatCard label="Featured campaign" value="Christmas 2026" />
            <StatCard label="Ad networks supported" value="Adsterra · Monetag" />
          </div>
        </div>
      </section>

      {/* Campaigns */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-6">Active campaigns</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map(c => (
            <Card key={c.id} className={c.featured ? 'border-primary' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {c.title}
                    {c.featured && <Badge>Featured</Badge>}
                  </CardTitle>
                  <Badge variant="outline">{c._count.pages} pages</Badge>
                </div>
                <CardDescription>
                  {new Date(c.startsAt).toLocaleDateString()} → {new Date(c.endsAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{c.description}</p>
                <Button
                  size="sm"
                  onClick={() => navigate(user ? { name: 'dashboard' } : { name: 'signup' })}
                >
                  Create page for this campaign
                </Button>
              </CardContent>
            </Card>
          ))}
          {campaigns.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No active campaigns right now.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <h2 className="text-2xl font-bold mb-8">How it works</h2>
          <div className="grid gap-8 md:grid-cols-4">
            <Step n={1} title="Create your page" body="Sign up and create a Special Page. Pick a page type — Christmas hub, link hub, personal page, etc." />
            <Step n={2} title="Add content blocks" body="Use the page builder to add text, images, quotes, social links. Drag to reorder." />
            <Step n={3} title="Share the URL" body="Share your page on WhatsApp, social, or anywhere. Drive legitimate traffic to your content." />
            <Step n={4} title="Optionally monetize" body="Connect your Adsterra or Monetag account (subject to platform review). Your ad code runs in a controlled, sandboxed placement engine." />
          </div>
          <div className="mt-10 p-4 border border-border rounded-md bg-background text-sm text-muted-foreground">
            <strong className="text-foreground">Important:</strong> the platform does not pay you. Earnings come
            from your ad-network relationship. The platform cannot guarantee any level of earnings.
          </div>
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-background">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  )
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div>
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background text-sm font-bold mb-3">
        {n}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
