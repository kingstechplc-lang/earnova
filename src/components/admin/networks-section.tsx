'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import { GradientDialogHeader } from '@/components/animated/gradient-dialog-header'
import { StaggerContainer, StaggerItem, FadeIn } from '@/components/animated/motion'
import { safeFetch } from '@/lib/safe-fetch'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Edit3, Trash2, Network, ShieldCheck, AlertTriangle, ExternalLink,
} from 'lucide-react'

type AdNetwork = {
  id: string; code: string; displayName: string
  integrationTypes: string[]
  requiresSiteVerification: boolean
  policyDocUrl: string | null
  status: 'ACTIVE' | 'DEPRECATED' | 'BANNED'
  tcfVendorId: number | null
  integrationsCount: number
  platformIntegrationsCount: number
  createdAt: string
}

const ALL_INTEGRATION_TYPES = ['SCRIPT', 'DIRECT_LINK', 'NATIVE', 'BANNER', 'IN_PAGE', 'VIGNETTE', 'PUSH', 'MULTITAG']

export function NetworksSection() {
  const [networks, setNetworks] = useState<AdNetwork[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdNetwork | null>(null)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    const res = await safeFetch<{ networks?: AdNetwork[] }>('/api/admin/networks')
    if (res.error) setError(res.error)
    setNetworks(res.data?.networks || [])
    setLoading(false)
  }
  useEffect(() => {
    const id = window.setTimeout(() => { load() }, 0)
    return () => window.clearTimeout(id)
  }, [])

  async function deleteNetwork(id: string, displayName: string) {
    if (!confirm(`Delete ad network "${displayName}"? This cannot be undone.`)) return
    const res = await safeFetch(`/api/admin/networks/${id}`, { method: 'DELETE' })
    if (res.error) {
      alert(res.error)
      return
    }
    load()
  }

  if (loading) return <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-32 rounded-xl shimmer-bg" />)}</div>
  if (error) return (
    <Card className="border-cranberry/40">
      <CardContent className="py-8 text-center">
        <p className="text-cranberry mb-3">Couldn&apos;t load networks</p>
        <Button variant="outline" size="sm" onClick={load}>Try again</Button>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h3 className="font-serif text-xl font-bold flex items-center gap-2">
              <Network className="h-5 w-5 text-evergreen" />
              Ad Networks
            </h3>
            <p className="text-sm text-muted-foreground">{networks.length} total · {networks.filter(n => n.status === 'ACTIVE').length} active</p>
          </div>
          <Button onClick={() => setCreating(true)} className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden">
            <Plus className="h-4 w-4 mr-1" /> New network
          </Button>
        </div>
      </FadeIn>

      <StaggerContainer className="grid gap-3 md:grid-cols-2">
        {networks.map(n => (
          <StaggerItem key={n.id}>
            <Card className={`overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 ${
              n.status === 'ACTIVE' ? 'border-evergreen/30' :
              n.status === 'DEPRECATED' ? 'border-gold/40' : 'border-cranberry/40'
            }`}>
              <div className={`h-1.5 w-full ${
                n.status === 'ACTIVE' ? 'bg-gradient-to-r from-evergreen to-evergreen-light' :
                n.status === 'DEPRECATED' ? 'bg-gradient-to-r from-gold to-gold-dark' :
                'bg-gradient-to-r from-cranberry to-berry'
              }`} />
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-serif text-lg font-bold flex items-center gap-2">
                      {n.displayName}
                      {n.code === 'platform' && <Badge variant="outline" className="text-[10px] bg-evergreen/10 text-evergreen">PLATFORM</Badge>}
                    </h4>
                    <p className="text-xs text-muted-foreground font-mono">code: {n.code}</p>
                  </div>
                  <Badge className={
                    n.status === 'ACTIVE' ? 'bg-evergreen text-cream' :
                    n.status === 'DEPRECATED' ? 'bg-gold text-cream' : 'bg-cranberry text-cream'
                  }>
                    {n.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {n.integrationTypes.map(t => (
                    <span key={t} className="text-[10px] font-mono bg-muted/60 px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                  <div>
                    <ShieldCheck className="h-3 w-3 inline mr-1 text-evergreen" />
                    {n.requiresSiteVerification ? 'Requires verification' : 'No verification'}
                  </div>
                  <div>
                    TCF vendor: <span className="font-mono">{n.tcfVendorId ?? '—'}</span>
                  </div>
                  <div>
                    User integrations: <span className="font-bold text-foreground">{n.integrationsCount}</span>
                  </div>
                  <div>
                    Platform integrations: <span className="font-bold text-foreground">{n.platformIntegrationsCount}</span>
                  </div>
                </div>
                {n.policyDocUrl && (
                  <a
                    href={n.policyDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-evergreen underline decoration-gold/50 hover:decoration-gold mr-3"
                  >
                    <ExternalLink className="h-3 w-3" /> Policy docs
                  </a>
                )}
                <div className="flex gap-2 mt-2 pt-3 border-t border-border/60">
                  <Button size="sm" variant="outline" onClick={() => setEditing(n)} className="border-evergreen/30 text-evergreen hover:bg-evergreen/5">
                    <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  {n.code !== 'platform' && (
                    <Button size="sm" variant="ghost" onClick={() => deleteNetwork(n.id, n.displayName)} className="text-muted-foreground hover:text-cranberry hover:bg-cranberry/5">
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  )}
                  {n.code === 'platform' && (
                    <span className="text-[10px] text-muted-foreground self-center ml-auto">
                      <AlertTriangle className="h-3 w-3 inline mr-1 text-gold-dark" />
                      Cannot delete platform network
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerContainer>

      <AnimatePresence>
        {(creating || editing) && (
          <NetworkDialog
            network={editing}
            onClose={() => { setCreating(false); setEditing(null) }}
            onSaved={() => { setCreating(false); setEditing(null); load() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function NetworkDialog({
  network, onClose, onSaved,
}: {
  network: AdNetwork | null
  onClose: () => void
  onSaved: () => void
}) {
  const [code, setCode] = useState(network?.code || '')
  const [displayName, setDisplayName] = useState(network?.displayName || '')
  const [integrationTypes, setIntegrationTypes] = useState<string[]>(network?.integrationTypes || [])
  const [requiresSiteVerification, setRequiresSiteVerification] = useState(network?.requiresSiteVerification ?? true)
  const [policyDocUrl, setPolicyDocUrl] = useState(network?.policyDocUrl || '')
  const [tcfVendorId, setTcfVendorId] = useState(network?.tcfVendorId?.toString() || '')
  const [status, setStatus] = useState<AdNetwork['status']>(network?.status || 'ACTIVE')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleType(t: string) {
    setIntegrationTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  async function submit() {
    setError('')
    setLoading(true)
    if (!code || !displayName || integrationTypes.length === 0) {
      setError('Code, display name, and at least one integration type are required.')
      setLoading(false)
      return
    }
    const payload: any = {
      code: code.toLowerCase().trim(),
      displayName: displayName.trim(),
      integrationTypes,
      requiresSiteVerification,
      policyDocUrl: policyDocUrl.trim() || null,
      tcfVendorId: tcfVendorId ? parseInt(tcfVendorId, 10) : null,
    }
    if (network) payload.status = status
    const url = network ? `/api/admin/networks/${network.id}` : '/api/admin/networks'
    const method = network ? 'PATCH' : 'POST'
    const res = await safeFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onSaved()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" showCloseButton={false}>
        <GradientDialogHeader
          variant={network ? 'gold' : 'evergreen'}
          icon={network ? Edit3 : Plus}
          title={network ? 'Edit ad network' : 'Add ad network'}
          description={network ? 'Update network configuration, integration types, and status.' : 'Register a new ad network that creators can connect to.'}
          onClose={onClose}
        />
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Code</Label>
              <Input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="adsterra"
                disabled={!!network && network.code === 'platform'}
                className="mt-1 font-mono text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Lowercase identifier</p>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Display name</Label>
              <Input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Adsterra"
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Integration types</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALL_INTEGRATION_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={`text-xs font-mono px-2 py-1 rounded transition-all ${
                    integrationTypes.includes(t)
                      ? 'bg-evergreen text-cream shadow-festive'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Policy doc URL (optional)</Label>
              <Input
                value={policyDocUrl}
                onChange={e => setPolicyDocUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">TCF vendor ID (optional)</Label>
              <Input
                type="number"
                value={tcfVendorId}
                onChange={e => setTcfVendorId(e.target.value)}
                placeholder="470"
                className="mt-1 font-mono text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <Label className="font-medium">Requires site verification</Label>
              <p className="text-xs text-muted-foreground">Creator must verify their site with this network</p>
            </div>
            <Button
              type="button"
              variant={requiresSiteVerification ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRequiresSiteVerification(!requiresSiteVerification)}
              className={requiresSiteVerification ? 'bg-evergreen text-cream' : ''}
            >
              {requiresSiteVerification ? 'Required' : 'Not required'}
            </Button>
          </div>
          {network && (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Status</Label>
              <div className="mt-2 flex gap-1.5">
                {(['ACTIVE', 'DEPRECATED', 'BANNED'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`text-xs font-bold px-3 py-1.5 rounded transition-all ${
                      status === s
                        ? s === 'ACTIVE' ? 'bg-evergreen text-cream' : s === 'DEPRECATED' ? 'bg-gold text-cream' : 'bg-cranberry text-cream'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
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
              {loading ? 'Saving…' : network ? 'Save changes' : 'Add network'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
