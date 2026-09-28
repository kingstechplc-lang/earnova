'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import { GradientDialogHeader } from '@/components/animated/gradient-dialog-header'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animated/motion'
import { motion, AnimatePresence } from 'framer-motion'
import { safeFetch } from '@/lib/safe-fetch'
import { useConfetti } from '@/components/animated/confetti'
import {
  Plus, Edit3, Trash2, Zap, ShieldCheck, ShieldAlert, FlaskConical, CheckCircle2,
  XCircle, Clock, Layers, AlertTriangle, RotateCcw, Pause, ExternalLink,
} from 'lucide-react'

type AdNetworkLite = { id: string; code: string; displayName: string }
type TestResult = {
  ok: boolean
  status?: number
  message: string
  latencyMs: number
  details?: string
}
type Integration = {
  id: string
  adNetwork: AdNetworkLite
  integrationType: string
  zoneIdentifier: string
  scriptReference: string
  isActive: boolean
  verificationState: 'UNVERIFIED' | 'VERIFYING' | 'VERIFIED' | 'SUSPENDED'
  verifiedAt: string | null
  lastTestedAt: string | null
  lastTestResult: TestResult | null
  verificationNotes: string | null
  createdAt: string
  updatedAt: string
}

const ALL_INTEGRATION_TYPES = ['SCRIPT', 'DIRECT_LINK', 'NATIVE', 'BANNER', 'IN_PAGE', 'VIGNETTE', 'PUSH', 'MULTITAG']

const STATE_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  UNVERIFIED: { label: 'Unverified', cls: 'bg-muted/60 text-muted-foreground border-border/60', icon: <Clock className="h-3 w-3" /> },
  VERIFYING:  { label: 'Verifying',  cls: 'bg-gold/15 text-gold-dark border-gold/30',           icon: <FlaskConical className="h-3 w-3" /> },
  VERIFIED:   { label: 'Verified',   cls: 'bg-evergreen/15 text-evergreen border-evergreen/30', icon: <ShieldCheck className="h-3 w-3" /> },
  SUSPENDED:  { label: 'Suspended',  cls: 'bg-cranberry/15 text-cranberry border-cranberry/30', icon: <ShieldAlert className="h-3 w-3" /> },
}

export function PlatformIntegrationsSection() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [networks, setNetworks] = useState<AdNetworkLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Integration | null>(null)
  const [creating, setCreating] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [verifyTarget, setVerifyTarget] = useState<Integration | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<Integration | null>(null)
  const [unverifyTarget, setUnverifyTarget] = useState<Integration | null>(null)
  const { fire: fireConfetti, ConfettiLayer } = useConfetti()

  const load = async () => {
    setLoading(true)
    setError(null)
    const [intsRes, netsRes] = await Promise.all([
      safeFetch<{ integrations?: Integration[] }>('/api/admin/platform-integrations'),
      safeFetch<{ networks?: any[] }>('/api/admin/networks'),
    ])
    if (intsRes.error) setError(intsRes.error)
    setIntegrations(intsRes.data?.integrations || [])
    setNetworks((netsRes.data?.networks || [])
      .filter((n: any) => n.code !== 'platform')
      .map((n: any) => ({ id: n.id, code: n.code, displayName: n.displayName })))
    setLoading(false)
  }
  useEffect(() => {
    const id = window.setTimeout(() => { load() }, 0)
    return () => window.clearTimeout(id)
  }, [])

  async function runTest(int: Integration) {
    setTesting(int.id)
    const res = await safeFetch<{ result?: TestResult; verificationState?: string }>(
      `/api/admin/platform-integrations/${int.id}/test`,
      { method: 'POST' }
    )
    setTesting(null)
    if (res.error) {
      alert(res.error)
    } else if (res.data?.result) {
      if (res.data.result.ok) {
        fireConfetti({ count: 60, spread: 50, y: 0.35 })
      }
    }
    load()
  }

  async function deleteIntegration(id: string, name: string) {
    if (!confirm(`Delete platform integration "${name}"? This cannot be undone.`)) return
    const res = await safeFetch(`/api/admin/platform-integrations/${id}`, { method: 'DELETE' })
    if (res.error) { alert(res.error); return }
    load()
  }

  if (loading) {
    return <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-40 rounded-xl shimmer-bg" />)}</div>
  }
  if (error) {
    return (
      <Card className="border-cranberry/40">
        <CardContent className="py-8 text-center">
          <p className="text-cranberry mb-3">Couldn&apos;t load platform integrations</p>
          <Button variant="outline" size="sm" onClick={load}>Try again</Button>
        </CardContent>
      </Card>
    )
  }

  const verifiedCount = integrations.filter(i => i.verificationState === 'VERIFIED').length
  const unverifiedCount = integrations.filter(i => i.verificationState === 'UNVERIFIED').length

  return (
    <div className="space-y-4">
      {ConfettiLayer}

      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h3 className="font-serif text-xl font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-evergreen" />
              Platform ad inventory
            </h3>
            <p className="text-sm text-muted-foreground">
              {integrations.length} integration(s) · <span className="text-evergreen font-medium">{verifiedCount} verified</span> ·{' '}
              <span className="text-gold-dark font-medium">{unverifiedCount} need verification</span>
            </p>
          </div>
          <Button onClick={() => setCreating(true)} className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden">
            <Plus className="h-4 w-4 mr-1" /> New integration
          </Button>
        </div>
      </FadeIn>

      {/* Important notice */}
      <FadeIn delay={0.05}>
        <div className="p-4 rounded-xl border border-gold/30 bg-gradient-to-r from-gold/5 to-transparent">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-gold/20 p-2 mt-0.5">
              <AlertTriangle className="h-4 w-4 text-gold-dark" />
            </div>
            <div className="text-sm">
              <p className="font-semibold mb-1">Only VERIFIED integrations render ads on Special Pages</p>
              <p className="text-muted-foreground">
                Each platform ad-network integration must be tested and verified before it can serve ads.
                Workflow: <strong>1)</strong> Add platform domain to your ad-network publisher account ·{' '}
                <strong>2)</strong> Verify site ownership (DNS TXT or meta tag) at the ad network ·{' '}
                <strong>3)</strong> Create a zone and obtain the zone ID ·{' '}
                <strong>4)</strong> Enter zone ID + sanitized script reference here ·{' '}
                <strong>5)</strong> Click &quot;Run test&quot; ·{' '}
                <strong>6)</strong> Click &quot;Verify&quot; once the test passes.
              </p>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Integrations list */}
      <StaggerContainer className="grid gap-3">
        {integrations.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Layers className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-medium">No platform integrations yet</p>
              <p className="text-sm">Add your platform&apos;s first Adsterra or Monetag integration.</p>
            </CardContent>
          </Card>
        )}
        {integrations.map(int => {
          const stateCfg = STATE_CONFIG[int.verificationState] || STATE_CONFIG.UNVERIFIED
          return (
            <StaggerItem key={int.id} y={10}>
              <Card className={`overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 ${
                int.verificationState === 'VERIFIED' ? 'border-evergreen/40' :
                int.verificationState === 'SUSPENDED' ? 'border-cranberry/40' :
                int.verificationState === 'VERIFYING' ? 'border-gold/40' :
                'border-border'
              }`}>
                <div className={`h-1.5 w-full ${
                  int.verificationState === 'VERIFIED' ? 'bg-gradient-to-r from-evergreen to-evergreen-light' :
                  int.verificationState === 'SUSPENDED' ? 'bg-gradient-to-r from-cranberry to-berry' :
                  int.verificationState === 'VERIFYING' ? 'bg-gradient-to-r from-gold to-gold-dark' :
                  'bg-gradient-to-r from-muted-foreground/40 to-muted-foreground/20'
                }`} />
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-serif text-lg font-bold">{int.adNetwork.displayName}</h4>
                        <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30 font-mono">
                          {int.adNetwork.code}
                        </Badge>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border ${stateCfg.cls}`}>
                          {stateCfg.icon}
                          {stateCfg.label}
                        </span>
                        {!int.isActive && (
                          <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium text-foreground">Type:</span> <code className="font-mono">{int.integrationType}</code>
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Zone:</span> <code className="font-mono">{int.zoneIdentifier}</code>
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Script ref:</span> <code className="font-mono">{int.scriptReference}</code>
                        </div>
                        <div>
                          {int.verifiedAt ? (
                            <span><span className="font-medium text-foreground">Verified:</span> {new Date(int.verifiedAt).toLocaleDateString()}</span>
                          ) : (
                            <span><span className="font-medium text-foreground">Created:</span> {new Date(int.createdAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Last test result */}
                  {int.lastTestResult && (
                    <div className={`p-3 rounded-lg mb-3 border ${
                      int.lastTestResult.ok
                        ? 'bg-evergreen/5 border-evergreen/20'
                        : 'bg-cranberry/5 border-cranberry/20'
                    }`}>
                      <div className="flex items-start gap-2">
                        {int.lastTestResult.ok
                          ? <CheckCircle2 className="h-4 w-4 text-evergreen flex-shrink-0 mt-0.5" />
                          : <XCircle className="h-4 w-4 text-cranberry flex-shrink-0 mt-0.5" />
                        }
                        <div className="text-xs min-w-0 flex-1">
                          <p className="font-medium">
                            Last test {int.lastTestedAt && <span className="text-muted-foreground">· {new Date(int.lastTestedAt).toLocaleString()}</span>}
                            {int.lastTestResult.status && <span className="font-mono ml-2">HTTP {int.lastTestResult.status}</span>}
                            {int.lastTestResult.latencyMs && <span className="font-mono ml-2">{int.lastTestResult.latencyMs}ms</span>}
                          </p>
                          <p className="text-muted-foreground mt-0.5">{int.lastTestResult.message}</p>
                          {int.lastTestResult.details && (
                            <p className="text-muted-foreground/70 mt-1 italic">{int.lastTestResult.details}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Verification notes */}
                  {int.verificationNotes && (
                    <div className="p-2 rounded-lg bg-muted/30 mb-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Notes:</span> {int.verificationNotes}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-border/60">
                    {/* Test button (always available) */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runTest(int)}
                      disabled={testing === int.id}
                      className="border-gold/30 text-gold-dark hover:bg-gold/5"
                    >
                      {testing === int.id ? (
                        <>
                          <span className="h-3.5 w-3.5 border-2 border-gold/30 border-t-gold-dark rounded-full animate-spin mr-1" />
                          Testing…
                        </>
                      ) : (
                        <>
                          <FlaskConical className="h-3.5 w-3.5 mr-1" /> Run test
                        </>
                      )}
                    </Button>

                    {/* Verify button (only when VERIFYING or UNVERIFIED) */}
                    {(int.verificationState === 'UNVERIFIED' || int.verificationState === 'VERIFYING') && (
                      <Button
                        size="sm"
                        onClick={() => setVerifyTarget(int)}
                        className="bg-evergreen text-cream hover:bg-evergreen-dark"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Verify
                      </Button>
                    )}

                    {/* Suspend button (only when VERIFIED) */}
                    {int.verificationState === 'VERIFIED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSuspendTarget(int)}
                        className="border-cranberry/30 text-cranberry hover:bg-cranberry/5"
                      >
                        <Pause className="h-3.5 w-3.5 mr-1" /> Suspend
                      </Button>
                    )}

                    {/* Reset to unverified (when VERIFIED or SUSPENDED) */}
                    {(int.verificationState === 'VERIFIED' || int.verificationState === 'SUSPENDED') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setUnverifyTarget(int)}
                        className="text-muted-foreground hover:text-gold-dark hover:bg-gold/5"
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                      </Button>
                    )}

                    {/* Edit + Delete (always) */}
                    <div className="flex-1" />
                    <Button size="sm" variant="ghost" onClick={() => setEditing(int)} className="h-8 px-2">
                      <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteIntegration(int.id, `${int.adNetwork.displayName} · ${int.zoneIdentifier}`)}
                      className="h-8 px-2 text-muted-foreground hover:text-cranberry hover:bg-cranberry/5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          )
        })}
      </StaggerContainer>

      {/* Dialogs */}
      <AnimatePresence>
        {(creating || editing) && (
          <IntegrationDialog
            integration={editing}
            networks={networks}
            onClose={() => { setCreating(false); setEditing(null) }}
            onSaved={() => { setCreating(false); setEditing(null); load() }}
          />
        )}
      </AnimatePresence>

      {verifyTarget && (
        <ReasonDialog
          title="Verify platform integration"
          description={`Confirm that you have tested and verified this ${verifyTarget.adNetwork.displayName} integration in your publisher dashboard. The integration will start serving ads on Special Pages immediately.`}
          variant="evergreen"
          icon={ShieldCheck}
          confirmLabel="Verify integration"
          onClose={() => setVerifyTarget(null)}
          onSubmit={async (notes) => {
            const res = await safeFetch(`/api/admin/platform-integrations/${verifyTarget.id}/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notes }),
            })
            if (res.error) { alert(res.error); return false }
            fireConfetti({ count: 150, spread: 80, y: 0.3 })
            setVerifyTarget(null)
            load()
            return true
          }}
        />
      )}

      {suspendTarget && (
        <ReasonDialog
          title="Suspend platform integration"
          description={`Suspending this ${suspendTarget.adNetwork.displayName} integration will immediately stop it from serving ads on Special Pages. Provide a reason for the audit log.`}
          variant="cranberry"
          icon={ShieldAlert}
          confirmLabel="Suspend integration"
          onClose={() => setSuspendTarget(null)}
          onSubmit={async (reason) => {
            const res = await safeFetch(`/api/admin/platform-integrations/${suspendTarget.id}/suspend`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason }),
            })
            if (res.error) { alert(res.error); return false }
            setSuspendTarget(null)
            load()
            return true
          }}
          requireText
        />
      )}

      {unverifyTarget && (
        <ReasonDialog
          title="Reset integration to unverified"
          description={`Resetting ${unverifyTarget.adNetwork.displayName} back to UNVERIFIED will stop it from serving ads. You'll need to re-test and re-verify before it can serve again. Provide a reason for the audit log.`}
          variant="gold"
          icon={RotateCcw}
          confirmLabel="Reset to unverified"
          onClose={() => setUnverifyTarget(null)}
          onSubmit={async (reason) => {
            const res = await safeFetch(`/api/admin/platform-integrations/${unverifyTarget.id}/unverify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reason }),
            })
            if (res.error) { alert(res.error); return false }
            setUnverifyTarget(null)
            load()
            return true
          }}
          requireText
        />
      )}
    </div>
  )
}

function IntegrationDialog({
  integration, networks, onClose, onSaved,
}: {
  integration: Integration | null
  networks: AdNetworkLite[]
  onClose: () => void
  onSaved: () => void
}) {
  const [adNetworkId, setAdNetworkId] = useState(integration?.adNetwork.id || '')
  const [integrationType, setIntegrationType] = useState(integration?.integrationType || 'BANNER')
  const [zoneIdentifier, setZoneIdentifier] = useState(integration?.zoneIdentifier || '')
  const [scriptReference, setScriptReference] = useState(integration?.scriptReference || '')
  const [isActive, setIsActive] = useState(integration?.isActive ?? true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError('')
    if (!adNetworkId || !integrationType || !zoneIdentifier.trim() || !scriptReference.trim()) {
      setError('All fields are required.')
      setLoading(false)
      return
    }
    setLoading(true)
    const payload = {
      adNetworkId,
      integrationType,
      zoneIdentifier: zoneIdentifier.trim(),
      scriptReference: scriptReference.trim(),
      isActive,
    }
    const url = integration ? `/api/admin/platform-integrations/${integration.id}` : '/api/admin/platform-integrations'
    const method = integration ? 'PATCH' : 'POST'
    const res = await safeFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    if (integration && (zoneIdentifier !== integration.zoneIdentifier || scriptReference !== integration.scriptReference)) {
      // zone/script changed — verification was reset to UNVERIFIED, inform user
      alert('Saved. Note: zone/script changes reset verification to UNVERIFIED — re-test and re-verify before ads will render.')
    }
    onSaved()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" showCloseButton={false}>
        <GradientDialogHeader
          variant={integration ? 'gold' : 'evergreen'}
          icon={integration ? Edit3 : Plus}
          title={integration ? 'Edit platform integration' : 'Add platform integration'}
          description={integration ? 'Update the zone ID and script reference. Note: changing these resets verification.' : 'Configure your platform\'s own ad-network publisher account so it can serve ads on Special Pages.'}
          onClose={onClose}
        />
        <div className="p-6 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ad network</Label>
            <Select value={adNetworkId} onValueChange={setAdNetworkId} disabled={!!integration}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose network" /></SelectTrigger>
              <SelectContent>
                {networks.map(n => <SelectItem key={n.id} value={n.id}>{n.displayName}</SelectItem>)}
              </SelectContent>
            </Select>
            {integration && (
              <p className="text-[10px] text-muted-foreground mt-1">Network cannot be changed after creation.</p>
            )}
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Integration type</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALL_INTEGRATION_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setIntegrationType(t)}
                  className={`text-xs font-mono px-2 py-1 rounded transition-all ${
                    integrationType === t ? 'bg-evergreen text-cream shadow-festive' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Zone identifier</Label>
            <Input
              value={zoneIdentifier}
              onChange={e => setZoneIdentifier(e.target.value)}
              placeholder="e.g. zone-1234567"
              className="mt-1 font-mono text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1">The zone ID from your ad-network publisher dashboard.</p>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Script reference (sanitized)</Label>
            <Input
              value={scriptReference}
              onChange={e => setScriptReference(e.target.value)}
              placeholder="e.g. platform-adsterra-banner-001"
              className="mt-1 font-mono text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              A sanitized identifier used by the renderer. Never paste raw JavaScript — the platform emits tags from this reference.
            </p>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <Label className="font-medium">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive integrations are skipped by the placement engine</p>
            </div>
            <Button
              type="button"
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsActive(!isActive)}
              className={isActive ? 'bg-evergreen text-cream' : ''}
            >
              {isActive ? 'Active' : 'Inactive'}
            </Button>
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
              {loading ? 'Saving…' : integration ? 'Save changes' : 'Create integration'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReasonDialog({
  title, description, variant, icon: Icon, confirmLabel, onClose, onSubmit, requireText,
}: {
  title: string
  description: string
  variant: 'evergreen' | 'cranberry' | 'gold'
  icon: React.ComponentType<{ className?: string }>
  confirmLabel: string
  onClose: () => void
  onSubmit: (text: string) => Promise<boolean>
  requireText?: boolean
}) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const variantCls = {
    evergreen: 'bg-evergreen text-cream hover:bg-evergreen-dark',
    cranberry: 'bg-cranberry text-cream hover:bg-cranberry/80',
    gold: 'bg-gold text-cream hover:bg-gold-dark',
  }[variant]

  async function submit() {
    setLoading(true)
    const ok = await onSubmit(text.trim())
    setLoading(false)
    if (!ok) {
      // error already shown by caller
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden" showCloseButton={false}>
        <GradientDialogHeader
          variant={variant === 'cranberry' ? 'cranberry' : variant === 'gold' ? 'gold' : 'evergreen'}
          icon={Icon}
          title={title}
          onClose={onClose}
        />
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">{description}</p>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              {requireText ? 'Reason (required)' : 'Notes (optional)'}
            </Label>
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={requireText ? 'Required for audit log...' : 'Optional notes for the audit log...'}
              rows={3}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={loading || (requireText && !text.trim())}
              className={variantCls}
            >
              {loading ? 'Working…' : confirmLabel}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
