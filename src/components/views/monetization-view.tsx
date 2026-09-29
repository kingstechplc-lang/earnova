'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { motion } from 'framer-motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animated/motion'
import { safeFetch } from '@/lib/safe-fetch'
import { GradientDialogHeader } from '@/components/animated/gradient-dialog-header'
import { useConfetti } from '@/components/animated/confetti'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  ShieldCheck, ExternalLink, Plus, ChevronLeft, AlertCircle, Wallet, Sparkles,
  Send, Pause, Lock, Info, TrendingUp, Globe2, Paperclip, MapPin, FileText, Layers,
} from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'

type AdNetwork = {
  id: string; code: string; displayName: string
  integrationTypes: string[]; requiresSiteVerification: boolean; policyDocUrl: string | null
}

type Placement = {
  id: string
  pageId: string
  slot: string
  enabled: boolean
  page: { slug: string; title: string }
}

type Integration = {
  id: string; integrationType: string; siteIdentifier: string | null
  zoneIdentifier: string | null; scriptReference: string | null
  lifecycleState: string; rejectionReason: string | null
  approvedAt: string | null; createdAt: string
  adNetwork: AdNetwork
  placements?: Placement[]
}

type Disclaimer = {
  version: string; text: string; acknowledged: boolean; acknowledgedAt: string | null
}

const STATE_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  DRAFT:          { label: 'Draft',          cls: 'pill-draft',     icon: <Info className="h-3 w-3" /> },
  PENDING_REVIEW: { label: 'Pending Review', cls: 'pill-pending',   icon: <Sparkles className="h-3 w-3" /> },
  APPROVED:       { label: 'Approved',       cls: 'pill-approved',  icon: <ShieldCheck className="h-3 w-3" /> },
  DISABLED:       { label: 'Disabled',       cls: 'pill-restricted', icon: <Pause className="h-3 w-3" /> },
  REVOKED:        { label: 'Revoked',        cls: 'pill-revoked',   icon: <AlertCircle className="h-3 w-3" /> },
  DELETED:        { label: 'Deleted',        cls: 'pill-banned',   icon: <AlertCircle className="h-3 w-3" /> },
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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [userAdFormatSelection, setUserAdFormatSelection] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      const [dRes, iRes, nRes, pRes] = await Promise.all([
        safeFetch<Disclaimer>('/api/monetization/disclaimer'),
        safeFetch<{ integrations?: Integration[] }>('/api/monetization/integrations'),
        safeFetch<{ networks?: AdNetwork[] }>('/api/networks'),
        safeFetch<{ policy?: { userAdFormatSelection?: boolean } }>('/api/admin/policy'),
      ])
      if (cancelled) return
      const firstError = dRes.error || iRes.error || nRes.error
      if (firstError) setLoadError(firstError)
      if (dRes.data) setDisclaimer(dRes.data)
      setIntegrations(iRes.data?.integrations || [])
      setNetworks(nRes.data?.networks || [])
      setUserAdFormatSelection(pRes.data?.policy?.userAdFormatSelection ?? true)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  async function acknowledgeDisclaimer() {
    const res = await safeFetch('/api/monetization/disclaimer', { method: 'POST' })
    if (res.data) {
      setDisclaimer(prev => prev ? { ...prev, acknowledged: true, acknowledgedAt: new Date().toISOString() } : prev)
      const updated = await safeFetch<Disclaimer>('/api/monetization/disclaimer')
      if (updated.data) setDisclaimer(updated.data)
    } else if (res.error) {
      setLoadError(res.error)
    }
  }

  async function reload() {
    const i = await safeFetch<{ integrations?: Integration[] }>('/api/monetization/integrations')
    setIntegrations(i.data?.integrations || [])
    if (i.error) setLoadError(i.error)
  }

  if (loading) return <div className="container mx-auto px-4 py-8">Loading…</div>

  return (
    <div className="view-fade container mx-auto px-4 py-6 max-w-4xl">
      <FadeIn>
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'dashboard' })}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        </div>
      </FadeIn>

      {/* Hero header */}
      <FadeIn delay={0.05}>
        <div className="mb-8 relative overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-background to-berry/5 p-6 md:p-8">
          <FloatingOrbs count={2} colors={['gold', 'berry']} />
          <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-gold/20 blur-3xl animate-pulse" />
          <div className="relative">
            <Badge variant="outline" className="mb-3 border-gold/40 text-gold-dark bg-gold/5">
              <Wallet className="h-3 w-3 mr-1" /> Monetization Center
            </Badge>
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mb-2">
              Connect your <span className="gradient-text-gold">ad network.</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Link your own Adsterra or Monetag publisher account. The platform stores only sanitized
              identifiers — never raw JavaScript. Each integration goes through manual review.
            </p>
          </div>
        </div>
      </FadeIn>

      {/* Compliance notice */}
      <Alert className="mb-6 border-cranberry/30 bg-cranberry/5">
        <AlertCircle className="h-4 w-4 text-cranberry" />
        <AlertTitle className="text-cranberry">The platform does not pay you.</AlertTitle>
        <AlertDescription>
          Earnings from ads on your Special Pages come from your own Adsterra or Monetag publisher account.
          The platform cannot guarantee any level of earnings, or any earnings at all.
          You are solely responsible for your ad-network relationship and traffic quality.
        </AlertDescription>
      </Alert>

      {/* Disclaimer gate */}
      {disclaimer && !disclaimer.acknowledged && (
        <Card className="mb-6 border-gold/40 shadow-gold">
          <div className="h-1.5 w-full bg-gradient-to-r from-gold via-gold-dark to-gold rounded-t-xl" />
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gold-dark" />
              Acknowledge the earnings disclaimer
            </CardTitle>
            <CardDescription>You must acknowledge this before connecting an ad network.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground whitespace-pre-line bg-muted/30 p-4 rounded-lg max-h-64 overflow-y-auto border border-border/60">
              {disclaimer.text}
            </div>
            <Button className="mt-4 bg-evergreen text-cream hover:bg-evergreen-dark" onClick={acknowledgeDisclaimer}>
              <ShieldCheck className="h-4 w-4 mr-2" /> I acknowledge
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Existing integrations */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-serif text-2xl font-bold">Your ad integrations</h2>
        <Button
          onClick={() => setShowCreate(true)}
          disabled={!disclaimer?.acknowledged}
          className="bg-evergreen text-cream hover:bg-evergreen-dark"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Connect ad network
        </Button>
      </div>

      {integrations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-evergreen/10 mb-3">
              <Wallet className="h-6 w-6 text-evergreen" />
            </div>
            <p className="font-medium mb-1">No ad integrations connected yet.</p>
            {!disclaimer?.acknowledged && (
              <p className="text-xs text-muted-foreground mt-2">Acknowledge the disclaimer above to enable.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <StaggerContainer className="space-y-3">
          {integrations.map(int => {
            const cfg = STATE_CONFIG[int.lifecycleState] || { label: int.lifecycleState, cls: 'pill-draft', icon: null }
            return (
              <StaggerItem key={int.id}>
              <Card className="overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5">
                <div className={`h-1 w-full ${
                  int.lifecycleState === 'APPROVED' ? 'bg-gradient-to-r from-evergreen to-evergreen-light' :
                  int.lifecycleState === 'PENDING_REVIEW' ? 'bg-gradient-to-r from-gold to-gold-dark' :
                  int.lifecycleState === 'REVOKED' ? 'bg-gradient-to-r from-cranberry to-berry' :
                  'bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/10'
                }`} />
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <NetworkBadge code={int.adNetwork.code} name={int.adNetwork.displayName} />
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-mono text-xs">{int.integrationType}</span> · Zone: <span className="font-mono text-xs">{int.zoneIdentifier || '—'}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Site: <span className="font-mono">{int.siteIdentifier || '—'}</span> · Created {new Date(int.createdAt).toLocaleDateString()}
                      </p>
                      {int.rejectionReason && (
                        <p className="text-xs text-cranberry mt-1.5 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Reason: {int.rejectionReason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {int.lifecycleState === 'DRAFT' && (
                        <SubmitButton integrationId={int.id} onDone={reload} />
                      )}
                      {int.lifecycleState === 'APPROVED' && (
                        <>
                          <DisableButton integrationId={int.id} onDone={reload} />
                          <AttachButton integration={int} onDone={reload} />
                        </>
                      )}
                      {int.adNetwork.policyDocUrl && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={int.adNetwork.policyDocUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" /> Rules
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                  {int.placements && int.placements.length > 0 && (
                    <AttachedPagesPills placements={int.placements} />
                  )}
                </CardContent>
              </Card>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      )}

      {/* Educational section */}
      <Card className="mt-8 overflow-hidden border-evergreen/20">
        <div className="h-1 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-evergreen" />
            How to get legitimate visitors
          </CardTitle>
          <CardDescription>Ad networks prohibit bot and incentivized traffic. Build real audiences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Tip icon={<Globe2 className="h-4 w-4" />} text="Share your page naturally with people who would actually want to see it." />
          <Tip icon={<Sparkles className="h-4 w-4" />} text="Create useful content — visitors who find value will return and share." />
          <Tip icon={<TrendingUp className="h-4 w-4" />} text="Use basic SEO: descriptive page title, clear URL slug, relevant content blocks." />
          <Tip icon={<AlertCircle className="h-4 w-4" />} text="Don't ask friends to click ads. Don't use traffic exchanges. Don't use bots." />
          <Tip icon={<Lock className="h-4 w-4" />} text="If your ad-network account is suspended, the platform will automatically disable your integration." />
        </CardContent>
      </Card>

      {showCreate && networks.length > 0 && (
        <CreateIntegrationDialog
          networks={networks}
          userAdFormatSelection={userAdFormatSelection}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); reload() }}
        />
      )}
    </div>
  )
}

function NetworkBadge({ code, name }: { code: string; name: string }) {
  const colors: Record<string, string> = {
    adsterra: 'bg-gold/15 text-gold-dark border-gold/30',
    monetag:  'bg-berry/15 text-berry border-berry/30',
    platform: 'bg-evergreen/15 text-evergreen border-evergreen/30',
  }
  const cls = colors[code] || 'bg-muted text-muted-foreground'
  return <Badge variant="outline" className={cls}>{name}</Badge>
}

function Tip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-evergreen/10 p-1.5 mt-0.5 text-evergreen">{icon}</div>
      <p className="text-muted-foreground">{text}</p>
    </div>
  )
}

function SubmitButton({ integrationId, onDone }: { integrationId: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false)
  const { fire: fireConfetti, ConfettiLayer } = useConfetti()
  return (
    <>
      {ConfettiLayer}
      <Button
        size="sm"
        onClick={async () => {
          setLoading(true)
          const res = await safeFetch(`/api/monetization/integrations/${integrationId}/submit`, { method: 'POST' })
          setLoading(false)
          if (!res.error) {
            // Small celebration when submitting for review
            fireConfetti({ count: 80, spread: 50, y: 0.4 })
          }
          onDone()
        }}
        disabled={loading}
        className="bg-gold text-cream hover:bg-gold-dark"
      >
        <Send className="h-3 w-3 mr-1" />
        {loading ? 'Submitting…' : 'Submit for review'}
      </Button>
    </>
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
        await safeFetch(`/api/monetization/integrations/${integrationId}/disable`, { method: 'POST' })
        setLoading(false)
        onDone()
      }}
      disabled={loading}
    >
      <Pause className="h-3 w-3 mr-1" />
      {loading ? 'Disabling…' : 'Disable'}
    </Button>
  )
}

// All 6 placement slots supported by the platform. We show all of them in the
// dialog — the placement engine filters out disabled ones at render time, so
// we don't need to fetch the admin-only AdSlotConfig here.
const SLOT_INFO: Array<{ slot: string; label: string; description: string }> = [
  { slot: 'HEADER',            label: 'Header',            description: 'Top of page, above first content block' },
  { slot: 'AFTER_FIRST_BLOCK',  label: 'After first block', description: 'Right after the first content block' },
  { slot: 'MID_CONTENT',        label: 'Mid content',       description: 'Midway through the content (only on pages with 5+ blocks)' },
  { slot: 'BEFORE_FOOTER',     label: 'Before footer',     description: 'Just before the page footer' },
  { slot: 'FOOTER',            label: 'Footer',            description: 'At the very bottom of the page' },
  { slot: 'SIDEBAR',           label: 'Sidebar',           description: 'Sidebar (hidden on mobile)' },
]

type PageLite = {
  id: string
  slug: string
  title: string
  pageType: string
  _count: { blocks: number }
}

function AttachedPagesPills({ placements }: { placements: Placement[] }) {
  // Only show placements that are actually enabled; disabled placements
  // (e.g. admin flipped the slot off after the user attached) are noise here.
  const enabled = placements.filter(p => p.enabled)
  if (enabled.length === 0) return null

  // Group placements by page so we render one pill per page with all its slots.
  const byPage = new Map<string, { slug: string; title: string; slots: string[] }>()
  for (const p of enabled) {
    if (!byPage.has(p.pageId)) {
      byPage.set(p.pageId, { slug: p.page.slug, title: p.page.title, slots: [] })
    }
    byPage.get(p.pageId)!.slots.push(p.slot)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mt-3 pt-3 border-t border-border/60"
    >
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
        <MapPin className="h-3 w-3" /> Attached to {byPage.size} page{byPage.size === 1 ? '' : 's'}
      </p>
      <div className="flex flex-wrap gap-2">
        {Array.from(byPage.entries()).map(([pageId, info]) => (
          <span
            key={pageId}
            className="inline-flex items-center gap-1.5 rounded-md bg-evergreen/10 border border-evergreen/25 px-2 py-1 text-xs"
            title={`/${info.slug}`}
          >
            <FileText className="h-3 w-3 text-evergreen flex-shrink-0" />
            <span className="font-medium truncate max-w-[160px]">{info.title}</span>
            <span className="text-muted-foreground/70">·</span>
            <span className="text-muted-foreground font-mono text-[10px]">{info.slots.join(', ')}</span>
          </span>
        ))}
      </div>
    </motion.div>
  )
}

function AttachButton({ integration, onDone }: { integration: Integration; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const { fire: fireConfetti, ConfettiLayer } = useConfetti()
  const { toast } = useToast()
  return (
    <>
      {ConfettiLayer}
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Paperclip className="h-3 w-3 mr-1" /> Attach to page
      </Button>
      {open && (
        <AttachToPageDialog
          integration={integration}
          onClose={() => setOpen(false)}
          onDone={onDone}
          fireConfetti={fireConfetti}
          toast={toast}
        />
      )}
    </>
  )
}

function AttachToPageDialog({
  integration, onClose, onDone, fireConfetti, toast,
}: {
  integration: Integration
  onClose: () => void
  onDone: () => void
  fireConfetti: (opts?: { count?: number; spread?: number; y?: number; x?: number }) => void
  toast: ReturnType<typeof useToast>['toast']
}) {
  const [pages, setPages] = useState<PageLite[]>([])
  const [loadingPages, setLoadingPages] = useState(true)
  const [pageId, setPageId] = useState<string>('')
  const [slots, setSlots] = useState<Set<string>>(new Set(['AFTER_FIRST_BLOCK']))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch the user's pages when the dialog opens. We don't pre-fetch at
  // MonetizationView mount because most users won't open this dialog, and
  // we want the list to be fresh when they do.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingPages(true)
      setError(null)
      const res = await safeFetch<{ pages?: PageLite[] }>('/api/pages')
      if (cancelled) return
      if (res.error) {
        setError(res.error)
        setPages([])
      } else {
        setPages(res.data?.pages || [])
      }
      setLoadingPages(false)
    })()
    return () => { cancelled = true }
  }, [])

  function pickPage(id: string) {
    setPageId(id)
    // If the user already has placements for this page, pre-check those slots
    // so the dialog reflects the current state — they can toggle more or fewer.
    const existing = integration.placements?.filter(p => p.pageId === id && p.enabled) || []
    if (existing.length > 0) {
      setSlots(new Set(existing.map(p => p.slot)))
    } else {
      setSlots(new Set(['AFTER_FIRST_BLOCK']))
    }
  }

  function toggleSlot(slot: string) {
    setSlots(prev => {
      const next = new Set(prev)
      if (next.has(slot)) next.delete(slot)
      else next.add(slot)
      return next
    })
  }

  async function submit() {
    setError(null)
    if (!pageId) {
      setError('Please choose a page first.')
      return
    }
    if (slots.size === 0) {
      setError('Please select at least one ad slot.')
      return
    }
    setSubmitting(true)
    const res = await safeFetch(`/api/monetization/integrations/${integration.id}/attach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageId, slots: Array.from(slots) }),
    })
    setSubmitting(false)
    if (res.error) {
      setError(res.error)
      return
    }
    const pageCount = slots.size
    toast({
      title: 'Attached to page ✓',
      description: `Your ad integration is now placed in ${pageCount} slot${pageCount === 1 ? '' : 's'} on the selected page.`,
    })
    // Celebratory confetti burst — 80 particles as per the task spec.
    fireConfetti({ count: 80, spread: 60, y: 0.4 })
    onDone()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col"
        showCloseButton={false}
      >
        <GradientDialogHeader
          variant="evergreen"
          icon={Paperclip}
          title="Attach to a page"
          description="Pick a Special Page you own and choose which ad slots this integration should appear in. Re-attaching replaces any previous placements for that page."
          onClose={onClose}
        />

        <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* ── Page selection ─────────────────────────────────────── */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Choose a page
            </Label>
            <div className="mt-2 space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {loadingPages ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-14 rounded-lg shimmer-bg" />
                  ))}
                </div>
              ) : pages.length === 0 ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>No pages yet</AlertTitle>
                  <AlertDescription>
                    You don&apos;t own any Special Pages yet. Create one from the
                    dashboard first, then come back here to attach this integration.
                  </AlertDescription>
                </Alert>
              ) : (
                pages.map(p => {
                  const selected = pageId === p.id
                  const blockCount = p._count?.blocks ?? 0
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => pickPage(p.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selected
                          ? 'border-evergreen bg-evergreen/5 shadow-elevated'
                          : 'border-border hover:border-evergreen/40 hover:bg-evergreen/5'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                            selected ? 'border-evergreen' : 'border-muted-foreground/30'
                          }`}
                          aria-hidden
                        >
                          {selected && <div className="h-2 w-2 rounded-full bg-evergreen" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{p.title}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">/{p.slug}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {blockCount} block{blockCount === 1 ? '' : 's'} · {p.pageType}
                            {blockCount < 5 && (
                              <span className="ml-1 text-gold-dark">(MID_CONTENT needs 5+ blocks)</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* ── Slot selection ────────────────────────────────────── */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3 w-3" /> Ad slots
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Pick which slots your integration should appear in. Slots that the
              admin has disabled won&apos;t render even if selected — the placement
              engine filters them at render time.
            </p>
            <div className="mt-2 space-y-2">
              {SLOT_INFO.map(s => {
                const checked = slots.has(s.slot)
                return (
                  <label
                    key={s.slot}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      checked
                        ? 'border-evergreen bg-evergreen/5'
                        : 'border-border hover:border-evergreen/40 hover:bg-evergreen/5'
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleSlot(s.slot)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{s.label}</p>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono flex-shrink-0">
                      {s.slot}
                    </Badge>
                  </label>
                )
              })}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={submitting || loadingPages || !pageId || slots.size === 0 || pages.length === 0}
              className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
            >
              <Paperclip className="h-3 w-3 mr-1" />
              {submitting ? 'Attaching…' : 'Attach to page'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CreateIntegrationDialog({
  networks, userAdFormatSelection, onClose, onCreated,
}: {
  networks: AdNetwork[]
  userAdFormatSelection: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [networkId, setNetworkId] = useState('')
  const [integrationType, setIntegrationType] = useState('')
  const [siteIdentifier, setSiteIdentifier] = useState('')
  const [zoneIdentifier, setZoneIdentifier] = useState('')
  const [zoneKey, setZoneKey] = useState('')
  const [cdnUrl, setCdnUrl] = useState('')
  const [bannerWidth, setBannerWidth] = useState('300')
  const [bannerHeight, setBannerHeight] = useState('250')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedNetwork = networks.find(n => n.id === networkId)

  // When user format selection is disabled, auto-assign default format
  useEffect(() => {
    if (!userAdFormatSelection && selectedNetwork) {
      const t = window.setTimeout(() => {
        setIntegrationType(selectedNetwork.integrationTypes[0] || 'BANNER')
      }, 0)
      return () => window.clearTimeout(t)
    }
  }, [userAdFormatSelection, selectedNetwork])

  async function submit() {
    setError('')
    setLoading(true)
    const formatOptions = integrationType === 'BANNER' ? {
      width: parseInt(bannerWidth) || 300,
      height: parseInt(bannerHeight) || 250,
      format: 'iframe',
    } : null
    const res = await safeFetch('/api/monetization/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adNetworkId: networkId,
        integrationType,
        siteIdentifier,
        zoneIdentifier,
        zoneKey: zoneKey || undefined,
        cdnUrl: cdnUrl || undefined,
        formatOptions,
      }),
    })
    setLoading(false)
    if (res.error) {
      setError(res.error)
      return
    }
    onCreated()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden max-h-[90vh] flex flex-col" showCloseButton={false}>
        <GradientDialogHeader
          variant="festive"
          icon={Plus}
          title="Connect an ad network"
          description="Submit your ad-network account details. The platform stores only sanitized identifiers — never raw JavaScript. Your integration starts in Draft; you must submit it for review."
          onClose={onClose}
        />

        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ad network</Label>
            <Select value={networkId} onValueChange={(v) => { setNetworkId(v); setIntegrationType('') }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose network" /></SelectTrigger>
              <SelectContent>
                {networks.map(n => (
                  <SelectItem key={n.id} value={n.id}>
                    <span className="mr-2">●</span> {n.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedNetwork && userAdFormatSelection && (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ad format type</Label>
              <Select value={integrationType} onValueChange={setIntegrationType}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose ad format" /></SelectTrigger>
                <SelectContent>
                  {selectedNetwork.integrationTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Choose the ad format type. Different formats display differently (banners, native, push, etc.).
              </p>
            </div>
          )}
          {selectedNetwork && !userAdFormatSelection && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/60">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Ad format: {integrationType || 'BANNER'}</strong> — the admin has
                disabled user ad format selection. Your integration will use this default format.
              </p>
            </div>
          )}

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Site identifier</Label>
            <Input
              placeholder="e.g. yourplatform.com/p/your-page"
              value={siteIdentifier}
              onChange={e => setSiteIdentifier(e.target.value)}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              For Adsterra/Monetag, this is the page URL you added to your publisher account.
            </p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Zone identifier</Label>
            <Input
              placeholder="e.g. zone-1234567"
              value={zoneIdentifier}
              onChange={e => setZoneIdentifier(e.target.value)}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The zone ID from your ad-network dashboard.
            </p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Zone key (alphanumeric)</Label>
            <Input
              placeholder="e.g. abc123def456 (Adsterra) or 1234567 (Monetag)"
              value={zoneKey}
              onChange={e => setZoneKey(e.target.value)}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The ad-network-specific key used in the script src URL. Found in your ad-network dashboard ad code snippet.
            </p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">CDN URL (tag delivery domain)</Label>
            <Input
              placeholder="e.g. www.highperformanceformat.com (Adsterra) or pl12345.profitabledisplaynetwork.com (Monetag)"
              value={cdnUrl}
              onChange={e => setCdnUrl(e.target.value)}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The CDN domain your ad network serves tags from. Found in the ad code snippet from your publisher dashboard.
            </p>
          </div>

          {integrationType === 'BANNER' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Banner width (px)</Label>
                <Input
                  type="number"
                  value={bannerWidth}
                  onChange={e => setBannerWidth(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Banner height (px)</Label>
                <Input
                  type="number"
                  value={bannerHeight}
                  onChange={e => setBannerHeight(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-gold/5 border border-gold/20">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Need help?</strong> Copy the ad code snippet from your ad-network
              publisher dashboard. The zone key and CDN URL are in the <code className="font-mono">src</code> attribute
              of the <code className="font-mono">&lt;script&gt;</code> tag. For Adsterra banners, the zone key is in
              the <code className="font-mono">atOptions</code> config object.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={loading || !networkId || !integrationType || !siteIdentifier || !zoneIdentifier}
              className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
            >
              {loading ? 'Creating…' : 'Create draft integration'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
