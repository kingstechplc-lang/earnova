'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ShieldCheck, ExternalLink, Plus, ChevronLeft, AlertCircle } from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'

type AdNetwork = {
  id: string; code: string; displayName: string
  integrationTypes: string[]; requiresSiteVerification: boolean; policyDocUrl: string | null
}

type Integration = {
  id: string; integrationType: string; siteIdentifier: string | null
  zoneIdentifier: string | null; scriptReference: string | null
  lifecycleState: string; rejectionReason: string | null
  approvedAt: string | null; createdAt: string
  adNetwork: AdNetwork
}

type Disclaimer = {
  version: string; text: string; acknowledged: boolean; acknowledgedAt: string | null
}

const STATE_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  PENDING_REVIEW: { label: 'Pending Review', variant: 'secondary' },
  APPROVED: { label: 'Approved', variant: 'default' },
  DISABLED: { label: 'Disabled', variant: 'secondary' },
  REVOKED: { label: 'Revoked', variant: 'destructive' },
  DELETED: { label: 'Deleted', variant: 'destructive' },
}

export default function MonetizationView({
  user, navigate,
}: {
  user: CurrentUser
  navigate: (v: View) => void
}) {
  const [disclaimer, setDisclaimer] = useState<Disclaimer | null>(null)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [networks, setNetworks] = useState<AdNetwork[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [d, i, n] = await Promise.all([
        fetch('/api/monetization/disclaimer').then(r => r.json()),
        fetch('/api/monetization/integrations').then(r => r.json()),
        fetch('/api/networks').then(r => r.json()),
      ])
      if (cancelled) return
      setDisclaimer(d)
      setIntegrations(i.integrations || [])
      setNetworks(n.networks || [])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  async function acknowledgeDisclaimer() {
    const res = await fetch('/api/monetization/disclaimer', { method: 'POST' })
    if (res.ok) {
      const d = await res.json()
      setDisclaimer(prev => prev ? { ...prev, acknowledged: true, acknowledgedAt: new Date().toISOString() } : prev)
      if (!d.alreadyAcknowledged) {
        // refresh
        const updated = await fetch('/api/monetization/disclaimer').then(r => r.json())
        setDisclaimer(updated)
      }
    }
  }

  if (loading) return <div className="container mx-auto px-4 py-8">Loading…</div>

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'dashboard' })}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Monetization</h1>
      </div>

      {/* Compliance notice */}
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>The platform does not pay you.</AlertTitle>
        <AlertDescription>
          Earnings from ads on your Special Pages come from your own Adsterra or Monetag publisher account.
          The platform cannot guarantee any level of earnings, or any earnings at all.
          You are solely responsible for your ad-network relationship and traffic quality.
        </AlertDescription>
      </Alert>

      {/* Disclaimer gate */}
      {disclaimer && !disclaimer.acknowledged && (
        <Card className="mb-6 border-primary">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Acknowledge the earnings disclaimer
            </CardTitle>
            <CardDescription>You must acknowledge this before connecting an ad network.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted/50 p-4 rounded-md max-h-64 overflow-y-auto">
              {disclaimer.text}
            </div>
            <Button className="mt-4" onClick={acknowledgeDisclaimer}>I acknowledge</Button>
          </CardContent>
        </Card>
      )}

      {/* Existing integrations */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your ad integrations</h2>
        <Button onClick={() => setShowCreate(true)} disabled={!disclaimer?.acknowledged}>
          <Plus className="h-4 w-4 mr-1" /> Connect ad network
        </Button>
      </div>

      {integrations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No ad integrations connected yet.
            {!disclaimer?.acknowledged && <div className="text-xs mt-2">Acknowledge the disclaimer above to enable.</div>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {integrations.map(int => (
            <Card key={int.id}>
              <CardContent className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{int.adNetwork.displayName}</span>
                      <Badge variant={(STATE_LABELS[int.lifecycleState] || { variant: 'secondary' }).variant as any}>
                        {(STATE_LABELS[int.lifecycleState] || { label: int.lifecycleState }).label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {int.integrationType} · Zone: {int.zoneIdentifier || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Site: {int.siteIdentifier || '—'} · Created {new Date(int.createdAt).toLocaleDateString()}
                    </p>
                    {int.rejectionReason && (
                      <p className="text-xs text-destructive mt-1">Reason: {int.rejectionReason}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {int.lifecycleState === 'DRAFT' && (
                      <SubmitButton integrationId={int.id} onDone={() => reload()} />
                    )}
                    {int.lifecycleState === 'APPROVED' && (
                      <DisableButton integrationId={int.id} onDone={() => reload()} />
                    )}
                    {int.adNetwork.policyDocUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={int.adNetwork.policyDocUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" /> Network rules
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Educational note */}
      <Card className="mt-8 bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">How to get legitimate visitors</CardTitle>
          <CardDescription>Ad networks prohibit bot and incentivized traffic. Build real audiences.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Share your page naturally with people who would actually want to see it.</p>
          <p>• Create useful content — visitors who find value will return and share.</p>
          <p>• Use basic SEO: descriptive page title, clear URL slug, relevant content blocks.</p>
          <p>• Don&apos;t ask friends to click ads. Don&apos;t use traffic exchanges. Don&apos;t use bots.</p>
          <p>• If your ad-network account is suspended, the platform will automatically disable your integration.</p>
        </CardContent>
      </Card>

      {showCreate && networks.length > 0 && (
        <CreateIntegrationDialog
          networks={networks}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); reload() }}
        />
      )}
    </div>
  )

  async function reload() {
    const i = await fetch('/api/monetization/integrations').then(r => r.json())
    setIntegrations(i.integrations || [])
  }
}

function SubmitButton({ integrationId, onDone }: { integrationId: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  return (
    <Button
      size="sm"
      onClick={async () => {
        setLoading(true)
        await fetch(`/api/monetization/integrations/${integrationId}/submit`, { method: 'POST' })
        setLoading(false)
        onDone()
      }}
      disabled={loading}
    >
      {loading ? 'Submitting…' : 'Submit for review'}
    </Button>
  )
}

function DisableButton({ integrationId, onDone }: { integrationId: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        setLoading(true)
        await fetch(`/api/monetization/integrations/${integrationId}/disable`, { method: 'POST' })
        setLoading(false)
        onDone()
      }}
      disabled={loading}
    >
      {loading ? 'Disabling…' : 'Disable'}
    </Button>
  )
}

function CreateIntegrationDialog({
  networks, onClose, onCreated,
}: {
  networks: AdNetwork[]
  onClose: () => void
  onCreated: () => void
}) {
  const [networkId, setNetworkId] = useState('')
  const [integrationType, setIntegrationType] = useState('')
  const [siteIdentifier, setSiteIdentifier] = useState('')
  const [zoneIdentifier, setZoneIdentifier] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedNetwork = networks.find(n => n.id === networkId)

  async function submit() {
    setError('')
    setLoading(true)
    const res = await fetch('/api/monetization/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adNetworkId: networkId,
        integrationType,
        siteIdentifier,
        zoneIdentifier,
      }),
    })
    setLoading(false)
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Failed')
      return
    }
    onCreated()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect an ad network</DialogTitle>
          <DialogDescription>
            Submit your ad-network account details. The platform stores only sanitized identifiers —
            never raw JavaScript. Your integration starts in Draft; you must submit it for review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Ad network</Label>
            <Select value={networkId} onValueChange={(v) => { setNetworkId(v); setIntegrationType('') }}>
              <SelectTrigger><SelectValue placeholder="Choose network" /></SelectTrigger>
              <SelectContent>
                {networks.map(n => <SelectItem key={n.id} value={n.id}>{n.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {selectedNetwork && (
            <div>
              <Label>Integration type</Label>
              <Select value={integrationType} onValueChange={setIntegrationType}>
                <SelectTrigger><SelectValue placeholder="Choose type" /></SelectTrigger>
                <SelectContent>
                  {selectedNetwork.integrationTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Site identifier (your website/domain registered with the network)</Label>
            <Input
              placeholder="e.g. yourplatform.com/p/your-page"
              value={siteIdentifier}
              onChange={e => setSiteIdentifier(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              For Adsterra/Monetag, this is the page URL you added to your publisher account.
            </p>
          </div>

          <div>
            <Label>Zone identifier</Label>
            <Input
              placeholder="e.g. zone-1234567"
              value={zoneIdentifier}
              onChange={e => setZoneIdentifier(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              The zone ID or tag key from your ad-network dashboard.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !networkId || !integrationType || !siteIdentifier || !zoneIdentifier}>
            {loading ? 'Creating…' : 'Create draft integration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
