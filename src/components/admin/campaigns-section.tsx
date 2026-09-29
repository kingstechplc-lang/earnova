'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import { GradientDialogHeader } from '@/components/animated/gradient-dialog-header'
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animated/motion'
import { CountUp } from '@/components/animated/count-up'
import { motion, AnimatePresence } from 'framer-motion'
import { safeFetch } from '@/lib/safe-fetch'
import { useConfetti } from '@/components/animated/confetti'
import {
  Plus, Edit3, Trash2, Megaphone, Star, Calendar, Users,
} from 'lucide-react'

type Campaign = {
  id: string; slug: string; title: string; description: string | null
  startsAt: string; endsAt: string; isActive: boolean; featured: boolean
  _count: { pages: number }
}

export function CampaignsSection() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [creating, setCreating] = useState(false)
  const { fire: fireConfetti, ConfettiLayer } = useConfetti()

  const load = async () => {
    setLoading(true)
    setError(null)
    const res = await safeFetch<{ campaigns?: Campaign[] }>('/api/admin/campaigns')
    if (res.error) setError(res.error)
    setCampaigns(res.data?.campaigns || [])
    setLoading(false)
  }
  useEffect(() => {
    const id = window.setTimeout(() => { load() }, 0)
    return () => window.clearTimeout(id)
  }, [])

  async function deleteCampaign(id: string, title: string) {
    if (!confirm(`Delete campaign "${title}"? This cannot be undone.`)) return
    const res = await safeFetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' })
    if (res.error) {
      alert(res.error)
      return
    }
    load()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl shimmer-bg" />)}
      </div>
    )
  }
  if (error) {
    return (
      <Card className="border-cranberry/40">
        <CardContent className="py-8 text-center">
          <p className="text-cranberry mb-3">Couldn&apos;t load campaigns</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={load}>Try again</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {ConfettiLayer}
      <FadeIn>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h3 className="font-serif text-xl font-bold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-evergreen" />
              Campaigns
            </h3>
            <p className="text-sm text-muted-foreground">{campaigns.length} total · {campaigns.filter(c => c.isActive).length} active</p>
          </div>
          <Button
            onClick={() => setCreating(true)}
            className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
          >
            <Plus className="h-4 w-4 mr-1" /> New campaign
          </Button>
        </div>
      </FadeIn>

      <StaggerContainer className="grid gap-3 md:grid-cols-2">
        {campaigns.map(c => {
          const now = new Date()
          const startsAt = new Date(c.startsAt)
          const endsAt = new Date(c.endsAt)
          const isLive = c.isActive && startsAt <= now && endsAt >= now
          const isUpcoming = c.isActive && startsAt > now
          const isPast = endsAt < now
          return (
            <StaggerItem key={c.id}>
              <Card className={`relative overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 ${c.featured ? 'border-evergreen/40 shadow-festive' : ''}`}>
                <div className={`h-1.5 w-full ${
                  isLive ? 'bg-gradient-to-r from-evergreen via-gold to-berry' :
                  isUpcoming ? 'bg-gradient-to-r from-gold to-gold-dark' :
                  isPast ? 'bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/10' :
                  'bg-gradient-to-r from-cranberry to-berry'
                }`} />
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif text-lg font-bold flex items-center gap-2 truncate">
                        {c.title}
                        {c.featured && <Star className="h-4 w-4 text-gold-dark fill-current flex-shrink-0" />}
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono truncate">/{c.slug}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {isLive && <Badge className="bg-evergreen text-cream"><span className="h-1.5 w-1.5 rounded-full bg-cream mr-1 animate-pulse" /> Live</Badge>}
                      {isUpcoming && <Badge className="bg-gold text-cream"><Calendar className="h-3 w-3 mr-1" /> Upcoming</Badge>}
                      {isPast && <Badge variant="outline" className="text-muted-foreground">Ended</Badge>}
                      {!c.isActive && <Badge variant="outline" className="text-cranberry border-cranberry/40">Inactive</Badge>}
                    </div>
                  </div>
                  {c.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{c.description}</p>}
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      <span className="font-mono">{startsAt.toLocaleDateString()}</span>
                      <span>→</span>
                      <span className="font-mono">{endsAt.toLocaleDateString()}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      <span className="font-bold text-foreground"><CountUp value={c._count.pages} duration={800} /></span>
                      pages
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/60">
                    <Button size="sm" variant="outline" onClick={() => setEditing(c)} className="border-evergreen/30 text-evergreen hover:bg-evergreen/5">
                      <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteCampaign(c.id, c.title)} className="text-muted-foreground hover:text-cranberry hover:bg-cranberry/5">
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          )
        })}
        {campaigns.length === 0 && (
          <Card className="md:col-span-2 border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Megaphone className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-medium">No campaigns yet</p>
              <p className="text-sm">Click &quot;New campaign&quot; to create your first one.</p>
            </CardContent>
          </Card>
        )}
      </StaggerContainer>

      <AnimatePresence>
        {(creating || editing) && (
          <CampaignDialog
            campaign={editing}
            onClose={() => { setCreating(false); setEditing(null) }}
            onSaved={() => { setCreating(false); setEditing(null); load(); fireConfetti({ count: 100, spread: 70, y: 0.3 }) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

const PAGE_TYPES_INPUT = ['slug', 'title', 'description', 'startsAt', 'endsAt']

function CampaignDialog({
  campaign, onClose, onSaved,
}: {
  campaign: Campaign | null
  onClose: () => void
  onSaved: () => void
}) {
  const [slug, setSlug] = useState(campaign?.slug || '')
  const [title, setTitle] = useState(campaign?.title || '')
  const [description, setDescription] = useState(campaign?.description || '')
  // Format dates for datetime-local input: YYYY-MM-DDTHH:mm
  const toLocalInput = (iso: string) => {
    const d = new Date(iso)
    const tzOffset = d.getTimezoneOffset() * 60000
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
  }
  const [startsAt, setStartsAt] = useState(campaign ? toLocalInput(campaign.startsAt) : '')
  const [endsAt, setEndsAt] = useState(campaign ? toLocalInput(campaign.endsAt) : '')
  const [isActive, setIsActive] = useState(campaign?.isActive ?? true)
  const [featured, setFeatured] = useState(campaign?.featured ?? false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError('')
    setLoading(true)
    const payload = {
      slug: slug.toLowerCase().trim(),
      title: title.trim(),
      description: description.trim() || null,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      isActive,
      featured,
    }
    if (!payload.slug || !payload.title || !startsAt || !endsAt) {
      setError('All fields except description are required.')
      setLoading(false)
      return
    }
    if (new Date(startsAt) >= new Date(endsAt)) {
      setError('Start date must be before end date.')
      setLoading(false)
      return
    }
    const url = campaign ? `/api/admin/campaigns/${campaign.id}` : '/api/admin/campaigns'
    const method = campaign ? 'PATCH' : 'POST'
    const res = await safeFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setLoading(false)
    if (res.error) {
      setError(res.error)
      return
    }
    onSaved()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col" showCloseButton={false}>
        <GradientDialogHeader
          variant={campaign ? 'gold' : 'evergreen'}
          icon={campaign ? Edit3 : Plus}
          title={campaign ? 'Edit campaign' : 'Create new campaign'}
          description={campaign ? 'Update campaign details, dates, and visibility.' : 'Define a new themed season for creators to build pages around.'}
          onClose={onClose}
        />
        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Slug</Label>
              <Input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="christmas-2026"
                className="mt-1 font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Lowercase, hyphens. Used in URLs.</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Title</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Christmas 2026"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what this campaign is about..."
              rows={3}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Starts at</Label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={e => setStartsAt(e.target.value)}
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ends at</Label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={e => setEndsAt(e.target.value)}
                className="mt-1 font-mono text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <Label className="font-medium">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive campaigns don&apos;t appear in creator UI</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <Label className="font-medium flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-gold-dark" /> Featured
              </Label>
              <p className="text-xs text-muted-foreground">Featured campaigns get visual emphasis</p>
            </div>
            <Switch checked={featured} onCheckedChange={setFeatured} />
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/5 p-2.5 rounded-md border border-destructive/20">
              {error}
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={loading}
              className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
            >
              {loading ? 'Saving…' : campaign ? 'Save changes' : 'Create campaign'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
