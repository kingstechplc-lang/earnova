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
import {
  Plus, Eye, Edit3, BarChart3, Wallet, FileText, Sparkles,
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
    <div className="view-fade container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <Badge variant="outline" className="mb-2 border-gold/40 text-gold-dark bg-gold/5">
            <Sparkles className="h-3 w-3 mr-1" /> Creator dashboard
          </Badge>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
            Welcome back, {user.name || user.email.split('@')[0]}
          </h1>
          <p className="text-muted-foreground mt-1">Manage your Special Pages and grow your audience.</p>
        </div>
        <Button
          onClick={() => navigate({ name: 'monetization' })}
          className="bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive"
        >
          <Wallet className="h-4 w-4 mr-2" />
          Monetization
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 mb-8 md:grid-cols-3">
        <QuickStat
          icon={<FileText className="h-4 w-4" />}
          label="Total pages"
          value={pages.length.toString()}
          accent="evergreen"
        />
        <QuickStat
          icon={<Eye className="h-4 w-4" />}
          label="Published"
          value={pages.filter(p => p.publishedAt).length.toString()}
          accent="gold"
        />
        <QuickStat
          icon={<Sparkles className="h-4 w-4" />}
          label="Approved"
          value={pages.filter(p => p.moderationState === 'APPROVED').length.toString()}
          accent="berry"
        />
      </div>

      {/* Create new page */}
      <Card className="mb-8 border-evergreen/20 shadow-festive">
        <div className="h-1 w-full bg-gradient-to-r from-evergreen via-gold to-berry rounded-t-xl" />
        <CardHeader>
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <Plus className="h-5 w-5 text-evergreen" />
            Create a new Special Page
          </CardTitle>
          <CardDescription>
            Each page gets its own URL like <code className="text-evergreen font-mono">/p/your-page-title</code>
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
                className="mt-1"
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
                className="bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive"
              >
                {creating ? 'Creating…' : 'Create page'}
                {!creating && <Plus className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pages list */}
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold mb-4">Your pages</h2>
        {loading ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Loading…</CardContent></Card>
        ) : pages.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-medium text-foreground mb-1">No pages yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create your first Special Page above to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {pages.map(p => (
              <Card key={p.id} className="overflow-hidden transition-all hover:shadow-festive hover:-translate-y-0.5">
                {/* Left accent bar */}
                <div className={`h-1 w-full ${
                  p.moderationState === 'APPROVED' ? 'bg-gradient-to-r from-evergreen to-evergreen-light' :
                  p.moderationState === 'PENDING' ? 'bg-gradient-to-r from-gold to-gold-dark' :
                  p.moderationState === 'BANNED' || p.moderationState === 'SUSPENDED' ? 'bg-gradient-to-r from-cranberry to-berry' :
                  'bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/20'
                }`} />
                <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-lg truncate">{p.title}</h3>
                      <ModBadge state={p.moderationState} />
                      {p.publishedAt ? (
                        <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-evergreen mr-1.5" /> Published
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted-foreground/5 text-muted-foreground border-muted-foreground/30">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate font-mono">
                      /p/{p.slug} · {p._count.blocks} blocks · {p.campaign?.title || 'No campaign'}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => navigate({ name: 'analytics', pageId: p.id })}>
                      <BarChart3 className="h-4 w-4 mr-1" /> Analytics
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate({ name: 'builder', pageId: p.id })}>
                      <Edit3 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      className="bg-evergreen text-cream hover:bg-evergreen-dark"
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuickStat({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: string; accent: 'evergreen' | 'gold' | 'berry'
}) {
  const accents = {
    evergreen: 'bg-evergreen/10 text-evergreen',
    gold: 'bg-gold/15 text-gold-dark',
    berry: 'bg-berry/10 text-berry',
  }
  return (
    <Card>
      <CardContent className="py-4 flex items-center gap-4">
        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${accents[accent]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold font-serif">{value}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        </div>
      </CardContent>
    </Card>
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
