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
import type { View, CurrentUser } from '@/app/page'

type Page = {
  id: string; slug: string; title: string; description: string | null
  pageType: string; moderationState: string; publishedAt: string | null
  campaign: { id: string; title: string } | null
  _count: { blocks: number }
}

const PAGE_TYPES: Array<[string, string]> = [
  ['PERSONAL', 'Personal Page'],
  ['CELEBRATION', 'Celebration / Holiday'],
  ['LINK_HUB', 'Link Hub'],
  ['CREATOR', 'Creator Page'],
  ['BLOGGER', 'Blogger'],
  ['PHOTOGRAPHY', 'Photography'],
  ['MUSIC', 'Music'],
  ['GAMING', 'Gaming'],
  ['BUSINESS', 'Business'],
  ['EVENT', 'Event'],
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
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState('PERSONAL')
  const [newCampaignId, setNewCampaignId] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [p, c] = await Promise.all([
        fetch('/api/pages').then(r => r.json()),
        fetch('/api/campaigns').then(r => r.json()),
      ])
      if (cancelled) return
      setPages(p.pages || [])
      setCampaigns((c.campaigns || []).map((cmp: any) => ({ id: cmp.id, title: cmp.title })))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  async function createPage() {
    if (!newTitle.trim()) return
    setCreating(true)
    const res = await fetch('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        pageType: newType,
        campaignId: newCampaignId && newCampaignId !== '__none__' ? newCampaignId : undefined,
      }),
    })
    setCreating(false)
    if (res.ok) {
      const data = await res.json()
      navigate({ name: 'builder', pageId: data.page.id })
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Your Special Pages</h1>
          <p className="text-muted-foreground text-sm">Create and manage pages you can share with the world.</p>
        </div>
        <Button onClick={() => navigate({ name: 'monetization' })}>Monetization →</Button>
      </div>

      {/* Create new page */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Create a new page</CardTitle>
          <CardDescription>Each page gets its own URL like /p/your-page-title.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="My Christmas Hub" />
            </div>
            <div>
              <Label className="text-xs">Page type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Campaign (optional)</Label>
              <Select value={newCampaignId} onValueChange={setNewCampaignId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={createPage} disabled={creating || !newTitle.trim()}>
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pages list */}
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No pages yet. Create one above to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {pages.map(p => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{p.title}</h3>
                    <ModBadge state={p.moderationState} />
                    {p.publishedAt ? (
                      <Badge variant="outline">Published</Badge>
                    ) : (
                      <Badge variant="outline">Draft</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    /p/{p.slug} · {p._count.blocks} blocks · {p.campaign?.title || 'No campaign'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => navigate({ name: 'analytics', pageId: p.id })}>
                    Analytics
                  </Button>
                  <Button size="sm" onClick={() => navigate({ name: 'builder', pageId: p.id })}>
                    Edit
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => {
                    window.location.hash = `/p/${p.slug}`
                    navigate({ name: 'public', slug: p.slug })
                  }}>
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function ModBadge({ state }: { state: string }) {
  const map: Record<string, 'default' | 'secondary' | 'destructive'> = {
    PENDING: 'secondary',
    APPROVED: 'default',
    RESTRICTED: 'secondary',
    SUSPENDED: 'destructive',
    BANNED: 'destructive',
  }
  return <Badge variant={map[state] || 'default'}>{state}</Badge>
}
