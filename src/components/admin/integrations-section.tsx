'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import { GradientDialogHeader } from '@/components/animated/gradient-dialog-header'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animated/motion'
import { motion } from 'framer-motion'
import { safeFetch } from '@/lib/safe-fetch'
import { useConfetti } from '@/components/animated/confetti'
import {
  Search, Plug, Edit3, Pause, Play, Ban, Eye, ExternalLink, AlertTriangle,
} from 'lucide-react'

type Integration = {
  id: string
  integrationType: string
  siteIdentifier: string | null
  zoneIdentifier: string | null
  zoneKey: string | null
  cdnUrl: string | null
  lifecycleState: string
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  adNetwork: { id: string; code: string; displayName: string; policyDocUrl: string | null }
  user: { id: string; email: string; name: string | null }
}

const STATE_CONFIG: Record<string, { label: string; cls: string }> = {
  DRAFT:          { label: 'Draft',          cls: 'pill-draft' },
  PENDING_REVIEW: { label: 'Pending',        cls: 'pill-pending' },
  APPROVED:       { label: 'Approved',        cls: 'pill-approved' },
  DISABLED:       { label: 'Disabled',        cls: 'pill-restricted' },
  REVOKED:        { label: 'Revoked',        cls: 'pill-revoked' },
  DELETED:        { label: 'Deleted',         cls: 'pill-banned' },
}

const FILTER_STATES = ['ALL', 'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'DISABLED', 'REVOKED'] as const

export function IntegrationsSection() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('ALL')
  const [editing, setEditing] = useState<Integration | null>(null)
  const { fire: fireConfetti, ConfettiLayer } = useConfetti()

  const load = async () => {
    setLoading(true)
    setError(null)
    // Use the admin pending endpoint but we also need all integrations.
    // For now, we use /api/admin/pending for PENDING_REVIEW, and for ALL states
    // we'll need a new endpoint. Let's build a quick one inline.
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (stateFilter !== 'ALL') params.set('state', stateFilter)
    const res = await safeFetch<{ integrations?: Integration[] }>(`/api/admin/integrations-all?${params}`)
    if (res.error) setError(res.error)
    setIntegrations(res.data?.integrations || [])
    setLoading(false)
  }

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [search, stateFilter])

  async function transition(id: string, action: 'APPROVE' | 'REJECT' | 'DISABLE' | 'REVOKE') {
    const res = await safeFetch(`/api/admin/integrations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.error) { alert(res.error); return }
    if (action === 'APPROVE') fireConfetti({ count: 100, spread: 60, y: 0.35 })
    load()
  }

  if (loading && integrations.length === 0) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl shimmer-bg" />)}</div>
  }

  return (
    <div className="space-y-4">
      {ConfettiLayer}
      <FadeIn>
        <div className="mb-2">
          <h3 className="font-serif text-xl font-bold flex items-center gap-2">
            <Plug className="h-5 w-5 text-evergreen" />
            User ad integrations
          </h3>
          <p className="text-sm text-muted-foreground">
            All user-submitted ad-network integrations across the platform. Edit configuration, change lifecycle state, or revoke.
          </p>
        </div>
      </FadeIn>

      {/* Search + filter */}
      <FadeIn delay={0.05}>
        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by user email, site, or zone..."
              className="pl-9"
            />
          </div>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FILTER_STATES.map(s => <SelectItem key={s} value={s}>{s === 'ALL' ? 'All states' : s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </FadeIn>

      {error && (
        <Card className="border-cranberry/40">
          <CardContent className="py-4 text-sm text-cranberry">{error}</CardContent>
        </Card>
      )}

      {/* List */}
      <StaggerContainer className="space-y-2">
        {integrations.length === 0 && !loading ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Plug className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-medium">No integrations found</p>
              <p className="text-sm">Try a different search or filter.</p>
            </CardContent>
          </Card>
        ) : (
          integrations.map(int => {
            const cfg = STATE_CONFIG[int.lifecycleState] || { label: int.lifecycleState, cls: 'pill-draft' }
            return (
              <StaggerItem key={int.id} y={10}>
                <Card className="overflow-hidden hover:shadow-elevated transition-all">
                  <div className={`h-0.5 w-full ${
                    int.lifecycleState === 'APPROVED' ? 'bg-gradient-to-r from-evergreen to-evergreen-light' :
                    int.lifecycleState === 'PENDING_REVIEW' ? 'bg-gradient-to-r from-gold to-gold-dark' :
                    int.lifecycleState === 'REVOKED' ? 'bg-gradient-to-r from-cranberry to-berry' :
                    int.lifecycleState === 'DISABLED' ? 'bg-gradient-to-r from-amber-500 to-amber-700' :
                    'bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/10'
                  }`} />
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className={
                            int.adNetwork.code === 'adsterra'
                              ? 'bg-gold/15 text-gold-dark border-gold/30'
                              : 'bg-berry/15 text-berry border-berry/30'
                          }>
                            {int.adNetwork.displayName}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">{int.integrationType}</span>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          User: <strong className="text-foreground">{int.user.name || int.user.email}</strong>
                          {' · '}
                          Site: <code className="font-mono">{int.siteIdentifier || '—'}</code>
                          {' · '}
                          Zone: <code className="font-mono">{int.zoneIdentifier || '—'}</code>
                        </p>
                        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                          Zone key: <code className="font-mono">{int.zoneKey || '—'}</code>
                          {' · '}
                          CDN: <code className="font-mono">{int.cdnUrl || '—'}</code>
                          {int.cdnUrl && int.zoneKey ? ' · ✓ Ads will render' : ' · ⚠ Missing ad-tag config'}
                        </p>
                        {int.rejectionReason && (
                          <p className="text-xs text-cranberry mt-0.5">Rejection: {int.rejectionReason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditing(int)} title="Edit">
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        {int.lifecycleState === 'APPROVED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-amber-600 hover:bg-amber-50"
                            onClick={() => transition(int.id, 'DISABLE')}
                            title="Disable"
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {int.lifecycleState === 'DISABLED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-evergreen hover:bg-evergreen/5"
                            onClick={() => transition(int.id, 'APPROVE')}
                            title="Re-enable"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {int.lifecycleState === 'PENDING_REVIEW' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-evergreen hover:bg-evergreen/5"
                            onClick={() => transition(int.id, 'APPROVE')}
                            title="Approve"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {int.lifecycleState !== 'REVOKED' && int.lifecycleState !== 'DELETED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-cranberry hover:bg-cranberry/5"
                            onClick={() => {
                              if (confirm(`Revoke this ${int.adNetwork.displayName} integration? This will immediately stop ads from rendering.`)) {
                                transition(int.id, 'REVOKE')
                              }
                            }}
                            title="Revoke"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {int.adNetwork.policyDocUrl && (
                          <Button size="sm" variant="ghost" className="h-8 px-2" asChild>
                            <a href={int.adNetwork.policyDocUrl} target="_blank" rel="noopener noreferrer" title="Network rules">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            )
          })
        )}
      </StaggerContainer>

      {/* Edit dialog */}
      {editing && (
        <EditIntegrationDialog
          integration={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function EditIntegrationDialog({
  integration, onClose, onSaved,
}: {
  integration: Integration
  onClose: () => void
  onSaved: () => void
}) {
  const [zoneKey, setZoneKey] = useState(integration.zoneKey || '')
  const [cdnUrl, setCdnUrl] = useState(integration.cdnUrl || '')
  const [siteIdentifier, setSiteIdentifier] = useState(integration.siteIdentifier || '')
  const [zoneIdentifier, setZoneIdentifier] = useState(integration.zoneIdentifier || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError('')
    setLoading(true)
    const res = await safeFetch(`/api/admin/integrations/${integration.id}/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zoneKey: zoneKey.trim() || null,
        cdnUrl: cdnUrl.trim() || null,
        siteIdentifier: siteIdentifier.trim() || null,
        zoneIdentifier: zoneIdentifier.trim() || null,
      }),
    })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onSaved()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col" showCloseButton={false}>
        <GradientDialogHeader
          variant="gold"
          icon={Edit3}
          title={`Edit ${integration.adNetwork.displayName} integration`}
          description={`User: ${integration.user.name || integration.user.email} · State: ${integration.lifecycleState.replace('_', ' ')}`}
          onClose={onClose}
        />
        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Site identifier</Label>
            <Input
              value={siteIdentifier}
              onChange={e => setSiteIdentifier(e.target.value)}
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Zone identifier</Label>
            <Input
              value={zoneIdentifier}
              onChange={e => setZoneIdentifier(e.target.value)}
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Zone key (alphanumeric)</Label>
            <Input
              value={zoneKey}
              onChange={e => setZoneKey(e.target.value)}
              placeholder="e.g. abc123def456"
              className="mt-1 font-mono text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Required for ads to render. Found in the ad-network dashboard ad code snippet.
            </p>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">CDN URL (tag delivery domain)</Label>
            <Input
              value={cdnUrl}
              onChange={e => setCdnUrl(e.target.value)}
              placeholder="e.g. www.highperformanceformat.com"
              className="mt-1 font-mono text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Required for ads to render. Found in the ad code snippet src attribute.
            </p>
          </div>
          {!cdnUrl && !zoneKey && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                This integration has no CDN URL or zone key configured. Ads will NOT render until these are set.
                Either the admin fills them in here, or the user provides them when creating the integration.
              </p>
            </div>
          )}
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
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
