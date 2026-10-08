'use client'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import { GradientDialogHeader } from '@/components/animated/gradient-dialog-header'
import { Textarea } from '@/components/ui/textarea'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animated/motion'
import { motion } from 'framer-motion'
import { safeFetch } from '@/lib/safe-fetch'
import { useConfetti } from '@/components/animated/confetti'
import { toast } from '@/hooks/use-toast'
import {
  Flag, CheckCircle2, XCircle, ArrowUpCircle, Eye, ExternalLink, Loader2,
  ShieldAlert, Clock, User, ChevronRight, MessageSquare,
} from 'lucide-react'
import type { View } from '@/app/page'

type Reporter = {
  id: string
  name: string | null
  username: string | null
  email: string
  image: string | null
}

type Report = {
  id: string
  reporterId: string
  entityType: 'USER' | 'PAGE' | 'POST' | 'COMMENT' | 'LINK' | 'AD'
  entityId: string
  reason: string
  description: string | null
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED' | 'ESCALATED'
  resolution: string | null
  resolutionAction: string | null
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  reporter: Reporter
  resolver?: { id: string; name: string | null; username: string | null; email: string } | null
}

const STATUS_FILTERS = ['ALL', 'PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED', 'ESCALATED'] as const
const RESOLUTION_ACTIONS = ['warning', 'suspension', 'ban', 'content_removed', 'no_action'] as const

const STATUS_BADGES: Record<string, string> = {
  PENDING: 'bg-gold/15 text-gold-dark border-gold/30',
  UNDER_REVIEW: 'bg-evergreen/10 text-evergreen border-evergreen/30',
  RESOLVED: 'bg-evergreen/15 text-evergreen border-evergreen/40',
  DISMISSED: 'bg-muted text-muted-foreground border-border/60',
  ESCALATED: 'bg-cranberry/10 text-cranberry border-cranberry/30',
}

const ENTITY_LABELS: Record<string, string> = {
  USER: 'User', PAGE: 'Page', POST: 'Post', COMMENT: 'Comment', LINK: 'Link', AD: 'Ad',
}

const ENTITY_ICONS: Record<string, typeof User> = {
  USER: User, PAGE: ExternalLink, POST: ExternalLink, COMMENT: MessageSquare, LINK: ExternalLink, AD: ExternalLink,
}

/**
 * AdminReportsSection — Trust & Safety reports queue.
 *
 * Fetches /api/admin/reports (paginated by cursor). Each report is a card
 * with the entity-type + reason badges, reporter attribution, the
 * reporter's description, and admin action buttons:
 *   - Resolve (opens a dialog with a freeform note + resolutionAction picker)
 *   - Dismiss (one click, no note required)
 *   - Escalate (one click, marks for senior review)
 *   - View entity → opens the public URL in a new tab (when possible)
 */
export function ReportsSection({ navigate }: { navigate?: (v: View) => void }) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)
  const [resolveTarget, setResolveTarget] = useState<Report | null>(null)
  const { fire: fireConfetti, ConfettiLayer } = useConfetti()

  const load = useCallback(async (reset = true) => {
    if (reset) {
      setLoading(true)
      setCursor(null)
    } else {
      setLoadingMore(true)
    }
    setError(null)
    const params = new URLSearchParams()
    if (statusFilter !== 'ALL') params.set('status', statusFilter)
    params.set('limit', '20')
    if (!reset && cursor) params.set('cursor', cursor)
    const res = await safeFetch<{ reports?: Report[]; nextCursor?: string | null }>(`/api/admin/reports?${params}`)
    if (res.error) setError(res.error)
    const newItems = res.data?.reports || []
    setReports(prev => reset ? newItems : [...prev, ...newItems])
    setCursor(res.data?.nextCursor ?? null)
    setLoading(false)
    setLoadingMore(false)
  }, [statusFilter, cursor])

  useEffect(() => {
    const t = setTimeout(() => load(true), 0)
    return () => clearTimeout(t)
  }, [statusFilter])

  async function act(report: Report, status: 'DISMISSED' | 'ESCALATED' | 'UNDER_REVIEW') {
    setActingId(report.id)
    const res = await safeFetch(`/api/admin/reports/${report.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setActingId(null)
    if (res.error) {
      toast({ title: 'Action failed', description: res.error, variant: 'destructive' })
      return
    }
    if (status === 'ESCALATED') {
      toast({ title: 'Escalated', description: 'Report flagged for senior review.' })
    } else if (status === 'UNDER_REVIEW') {
      toast({ title: 'Marked under review' })
    } else {
      toast({ title: 'Dismissed', description: 'Report closed with no action.' })
    }
    // Remove from list (will be filtered out by status on next reload, but
    // removing locally gives instant feedback)
    setReports(prev => prev.filter(r => r.id !== report.id))
  }

  function viewEntity(r: Report) {
    // The entityId is opaque without a follow-up fetch — but we know the
    // pretty URL pattern by entity type. For USER we route to the profile.
    // For others, we leave the admin to look it up (a future enhancement
    // could enrich the API with the page slug / post slug).
    if (r.entityType === 'USER' && r.reporter?.username) {
      // The reporter's username is the reporter, not the reported user.
      // We don't have the reported user's username here without another
      // fetch — fall through to the generic alert below.
    }
    if (navigate && r.entityType === 'USER') {
      navigate({ name: 'admin' }) // Stay on admin — a deep link would require another fetch
    }
    toast({
      title: `Entity ID: ${r.entityType.toLowerCase()}/${r.entityId}`,
      description: 'Deep-link to the reported entity will be added once the API exposes slugs.',
    })
  }

  if (loading && reports.length === 0) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl shimmer-bg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {ConfettiLayer}
      <FadeIn>
        <div className="mb-3">
          <h3 className="font-serif text-xl font-bold flex items-center gap-2">
            <Flag className="h-5 w-5 text-cranberry" />
            Trust &amp; Safety reports
          </h3>
          <p className="text-sm text-muted-foreground">
            User-submitted reports about profiles, pages, posts, comments, links, and ads. Resolve, dismiss, or escalate each report.
          </p>
        </div>
      </FadeIn>

      {/* Status filter */}
      <FadeIn delay={0.05}>
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === s
                  ? 'bg-cranberry text-cream shadow-festive'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {s === 'ALL' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {reports.length} shown
          </span>
        </div>
      </FadeIn>

      {error && (
        <Card className="border-cranberry/40">
          <CardContent className="py-4 text-sm text-cranberry">{error}</CardContent>
        </Card>
      )}

      {/* Report cards */}
      {reports.length === 0 && !loading ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto text-evergreen/60 mb-2" />
            <p className="font-medium">No reports in this view</p>
            <p className="text-sm text-muted-foreground">When users file reports, they&apos;ll appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <StaggerContainer className="space-y-3">
          {reports.map(r => {
            const reporterName = r.reporter.name || r.reporter.username || r.reporter.email.split('@')[0]
            const EntityIcon = ENTITY_ICONS[r.entityType] || ExternalLink
            return (
              <StaggerItem key={r.id} y={10}>
                <Card className="overflow-hidden hover:shadow-elevated hover:-translate-y-0.5 transition-all">
                  <div className={`h-0.5 w-full ${
                    r.status === 'PENDING' ? 'bg-gradient-to-r from-gold to-gold-dark' :
                    r.status === 'UNDER_REVIEW' ? 'bg-gradient-to-r from-evergreen to-evergreen-light' :
                    r.status === 'RESOLVED' ? 'bg-gradient-to-r from-evergreen to-evergreen-light' :
                    r.status === 'ESCALATED' ? 'bg-gradient-to-r from-cranberry to-berry' :
                    'bg-gradient-to-r from-muted to-muted-foreground/30'
                  }`} />
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-start gap-3">
                      {/* Reporter avatar */}
                      <div className="flex-shrink-0">
                        {r.reporter.image ? (
                          <img
                            src={r.reporter.image}
                            alt={reporterName}
                            className="h-10 w-10 rounded-xl object-cover border border-border"
                          />
                        ) : (
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-evergreen to-evergreen-dark text-cream text-sm font-bold">
                            {reporterName[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <Badge variant="outline" className="bg-evergreen/8 text-evergreen border-evergreen/30 text-[10px]">
                            <EntityIcon className="h-2.5 w-2.5 mr-0.5" />
                            {ENTITY_LABELS[r.entityType] || r.entityType}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] ${STATUS_BADGES[r.status] || ''}`}>
                            {r.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className="bg-cranberry/8 text-cranberry border-cranberry/30 text-[10px]">
                            {r.reason.replace('_', ' ')}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                            <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          Filed by {reporterName}
                          {r.reporter.username && (
                            <span className="text-muted-foreground text-xs font-normal">@{r.reporter.username}</span>
                          )}
                        </p>
                        {r.description ? (
                          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-3 break-words">
                            &ldquo;{r.description}&rdquo;
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic mt-1.5">No description provided.</p>
                        )}
                        {r.resolution && (
                          <p className="text-xs text-evergreen mt-1.5">
                            <strong>Resolution:</strong> {r.resolution}
                            {r.resolutionAction && <span className="text-muted-foreground"> ({r.resolutionAction})</span>}
                            {r.resolver && (
                              <span className="text-muted-foreground"> · by {r.resolver.name || r.resolver.email.split('@')[0]}</span>
                            )}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground font-mono mt-1.5">
                          Target ID: <code className="bg-muted/40 px-1 py-0.5 rounded">{r.entityType.toLowerCase()}/{r.entityId}</code>
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 flex-shrink-0 w-full sm:w-auto">
                        <Button
                          size="sm"
                          onClick={() => setResolveTarget(r)}
                          disabled={actingId === r.id || r.status === 'RESOLVED'}
                          className="bg-evergreen text-cream hover:bg-evergreen-dark h-8 text-xs"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => act(r, 'DISMISSED')}
                          disabled={actingId === r.id || r.status === 'DISMISSED'}
                          className="h-8 text-xs"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Dismiss
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => act(r, 'ESCALATED')}
                          disabled={actingId === r.id || r.status === 'ESCALATED'}
                          className="h-8 text-xs border-cranberry/30 text-cranberry hover:bg-cranberry/5"
                        >
                          <ArrowUpCircle className="h-3.5 w-3.5 mr-1" /> Escalate
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      )}

      {/* Load more */}
      {cursor && !loading && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => load(false)}
            disabled={loadingMore}
            className="text-evergreen hover:bg-evergreen/5"
          >
            {loadingMore ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ChevronRight className="h-4 w-4 mr-1" />}
            Load more
          </Button>
        </div>
      )}

      {/* Resolve dialog */}
      {resolveTarget && (
        <ResolveDialog
          report={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onResolved={() => {
            setResolveTarget(null)
            fireConfetti({ count: 60, spread: 50, y: 0.3 })
            // Refresh the list with the current filter
            load(true)
          }}
        />
      )}
    </div>
  )
}

function ResolveDialog({
  report,
  onClose,
  onResolved,
}: {
  report: Report
  onClose: () => void
  onResolved: () => void
}) {
  const [resolution, setResolution] = useState('')
  const [action, setAction] = useState<string>('no_action')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    setSubmitting(true)
    setError('')
    const res = await safeFetch(`/api/admin/reports/${report.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'RESOLVED',
        resolution: resolution.trim() || undefined,
        resolutionAction: action,
      }),
    })
    setSubmitting(false)
    if (res.error) {
      setError(res.error)
      return
    }
    toast({ title: 'Report resolved', description: 'The report has been marked as resolved.' })
    onResolved()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-lg overflow-hidden">
        <GradientDialogHeader
          variant="evergreen"
          icon={CheckCircle2}
          title="Resolve this report"
          description={`Marking report on ${report.entityType.toLowerCase()} as resolved.`}
        />
        <div className="p-6 space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Action taken
            </Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESOLUTION_ACTIONS.map(a => (
                  <SelectItem key={a} value={a}>
                    {a.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground mt-1">
              <strong>warning</strong>: user warned · <strong>suspension</strong>: account temporarily suspended ·{' '}
              <strong>ban</strong>: account banned · <strong>content_removed</strong>: content taken down ·{' '}
              <strong>no_action</strong>: reviewed, no violation found.
            </p>
          </div>
          <div>
            <Label htmlFor="resolution" className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Resolution note <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Textarea
              id="resolution"
              value={resolution}
              onChange={e => setResolution(e.target.value.slice(0, 2000))}
              placeholder="What did you do? What did you find? (visible to other admins)"
              className="min-h-[100px] resize-y"
            />
            <div className="flex justify-end mt-1">
              <span className={`text-[10px] tabular-nums ${resolution.length > 1950 ? 'text-cranberry' : 'text-muted-foreground/60'}`}>
                {resolution.length}/2000
              </span>
            </div>
          </div>
          {error && (
            <div className="text-sm text-cranberry bg-cranberry/5 border border-cranberry/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>
        <DialogFooter className="p-4 pt-3 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={submitting}
            className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
          >
            {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ShieldAlert className="h-4 w-4 mr-1" />}
            Mark as resolved
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
