'use client'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animated/motion'
import { motion } from 'framer-motion'
import { safeFetch } from '@/lib/safe-fetch'
import { useConfetti } from '@/components/animated/confetti'
import { toast } from '@/hooks/use-toast'
import {
  ShieldCheck, BadgeCheck, CheckCircle2, XCircle, Loader2, User, Globe2,
  Link2, ExternalLink, FileCheck, Clock, ChevronRight,
} from 'lucide-react'

type RequestUser = {
  id: string
  email: string
  name: string | null
  username: string | null
  image: string | null
  bio: string | null
  createdAt: string
}

type VerificationRequest = {
  id: string
  userId: string
  type: 'CREATOR' | 'BUSINESS'
  realName: string
  bio: string | null
  websiteUrl: string | null
  socialLinks: string | null  // JSON
  evidenceUrls: string | null  // JSON
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
  reviewedById: string | null
  reviewNotes: string | null
  reviewedAt: string | null
  createdAt: string
  user: RequestUser
  reviewer?: { id: string; name: string | null; username: string | null; email: string } | null
}

const STATUS_FILTERS = ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'] as const

const STATUS_BADGES: Record<string, string> = {
  PENDING: 'bg-gold/15 text-gold-dark border-gold/30',
  APPROVED: 'bg-evergreen/15 text-evergreen border-evergreen/40',
  REJECTED: 'bg-cranberry/10 text-cranberry border-cranberry/30',
  EXPIRED: 'bg-muted text-muted-foreground border-border/60',
}

const TYPE_LABELS: Record<string, { label: string; cls: string; icon: typeof BadgeCheck }> = {
  CREATOR: { label: 'Creator', cls: 'bg-berry/10 text-berry border-berry/30', icon: BadgeCheck },
  BUSINESS: { label: 'Business', cls: 'bg-evergreen/10 text-evergreen border-evergreen/30', icon: ShieldCheck },
}

/**
 * AdminVerificationSection — verification request queue.
 *
 * Lists pending verification requests (with user-submitted evidence) and lets
 * admins approve / reject each one. Approval emits a confetti burst + an
 * ACCOUNT_VERIFICATION notification to the user (server-side). Rejection
 * requires a review note (server-validated).
 */
export function VerificationSection() {
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<VerificationRequest | null>(null)
  const { fire: fireConfetti, ConfettiLayer } = useConfetti()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    params.set('status', statusFilter)
    params.set('limit', '50')
    const res = await safeFetch<{ requests?: VerificationRequest[]; nextCursor?: string | null }>(`/api/admin/verification?${params}`)
    if (res.error) setError(res.error)
    setRequests(res.data?.requests || [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    const t = setTimeout(load, 0)
    return () => clearTimeout(t)
  }, [statusFilter])

  async function approve(req: VerificationRequest) {
    setActingId(req.id)
    const res = await safeFetch(`/api/admin/verification/${req.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewNotes: '' }),
    })
    setActingId(null)
    if (res.error) {
      toast({ title: 'Approval failed', description: res.error, variant: 'destructive' })
      return
    }
    fireConfetti({ count: 120, spread: 70, y: 0.3 })
    toast({ title: 'Approved!', description: `${req.user.name || req.user.email.split('@')[0]} is now verified.` })
    setRequests(prev => prev.filter(r => r.id !== req.id))
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => <div key={i} className="h-32 rounded-xl shimmer-bg" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {ConfettiLayer}
      <FadeIn>
        <div className="mb-3">
          <h3 className="font-serif text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-evergreen" />
            Verification requests
          </h3>
          <p className="text-sm text-muted-foreground">
            Review creator / business verification submissions. Approvals emit a notification + a verified badge can be added to the User model later.
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
                  ? 'bg-evergreen text-cream shadow-festive'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{requests.length} shown</span>
        </div>
      </FadeIn>

      {error && (
        <Card className="border-cranberry/40">
          <CardContent className="py-4 text-sm text-cranberry">{error}</CardContent>
        </Card>
      )}

      {requests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto text-evergreen/60 mb-2" />
            <p className="font-medium">No {statusFilter.toLowerCase()} requests</p>
            <p className="text-sm text-muted-foreground">
              {statusFilter === 'PENDING'
                ? 'When users submit verification requests, they\'ll appear here.'
                : 'No requests have been marked as ' + statusFilter.toLowerCase() + '.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <StaggerContainer className="space-y-3">
          {requests.map(r => {
            const name = r.user.name || r.user.email.split('@')[0]
            const typeCfg = TYPE_LABELS[r.type] || TYPE_LABELS.CREATOR
            let socialLinks: { platform: string; url: string }[] = []
            let evidence: string[] = []
            try { socialLinks = r.socialLinks ? JSON.parse(r.socialLinks) : [] } catch {}
            try { evidence = r.evidenceUrls ? JSON.parse(r.evidenceUrls) : [] } catch {}
            return (
              <StaggerItem key={r.id} y={10}>
                <Card className="overflow-hidden hover:shadow-elevated hover:-translate-y-0.5 transition-all">
                  <div className={`h-0.5 w-full ${r.type === 'BUSINESS' ? 'bg-gradient-to-r from-evergreen to-evergreen-light' : 'bg-gradient-to-r from-berry to-berry/70'}`} />
                  <CardContent className="py-4">
                    <div className="flex flex-wrap items-start gap-3">
                      {/* User avatar */}
                      <div className="flex-shrink-0">
                        {r.user.image ? (
                          <img src={r.user.image} alt={name} className="h-12 w-12 rounded-xl object-cover border border-border" />
                        ) : (
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-evergreen to-evergreen-dark text-cream font-bold">
                            {name[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className={`text-[10px] ${typeCfg.cls}`}>
                            <typeCfg.icon className="h-2.5 w-2.5 mr-0.5" /> {typeCfg.label}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] ${STATUS_BADGES[r.status]}`}>
                            {r.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(r.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <p className="font-semibold flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          {name}
                          {r.user.username && (
                            <span className="text-xs text-muted-foreground font-normal">@{r.user.username}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Real name: <strong className="text-foreground">{r.realName}</strong>
                        </p>

                        {r.bio && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-3 break-words">
                            {r.bio}
                          </p>
                        )}

                        {/* Evidence links */}
                        {(socialLinks.length > 0 || evidence.length > 0 || r.websiteUrl) && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {r.websiteUrl && (
                              <a
                                href={r.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-evergreen/8 text-evergreen border border-evergreen/30 hover:bg-evergreen/15"
                              >
                                <Globe2 className="h-2.5 w-2.5" /> Website
                              </a>
                            )}
                            {socialLinks.map((s, i) => (
                              <a
                                key={i}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold-dark border border-gold/30 hover:bg-gold/15"
                              >
                                <Link2 className="h-2.5 w-2.5" /> {s.platform}
                              </a>
                            ))}
                            {evidence.map((u, i) => (
                              <a
                                key={`ev-${i}`}
                                href={u}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-berry/10 text-berry border border-berry/30 hover:bg-berry/15"
                              >
                                <FileCheck className="h-2.5 w-2.5" /> Evidence {i + 1}
                              </a>
                            ))}
                          </div>
                        )}

                        {r.reviewNotes && r.status !== 'PENDING' && (
                          <p className="text-xs mt-2 p-2 rounded-lg bg-muted/40">
                            <strong>Admin note:</strong> {r.reviewNotes}
                            {r.reviewer && (
                              <span className="text-muted-foreground"> · by {r.reviewer.name || r.reviewer.email.split('@')[0]}</span>
                            )}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      {r.status === 'PENDING' && (
                        <div className="flex flex-col gap-1.5 flex-shrink-0 w-full sm:w-auto">
                          <Button
                            size="sm"
                            onClick={() => approve(r)}
                            disabled={actingId === r.id}
                            className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden h-8 text-xs"
                          >
                            {actingId === r.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectTarget(r)}
                            disabled={actingId === r.id}
                            className="h-8 text-xs border-cranberry/30 text-cranberry hover:bg-cranberry/5"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      )}

      {rejectTarget && (
        <RejectDialog
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={() => {
            setRejectTarget(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function RejectDialog({
  request,
  onClose,
  onRejected,
}: {
  request: VerificationRequest
  onClose: () => void
  onRejected: () => void
}) {
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!notes.trim()) {
      setError('A note is required so the user can fix and resubmit.')
      return
    }
    setSubmitting(true)
    setError('')
    const res = await safeFetch(`/api/admin/verification/${request.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewNotes: notes.trim() }),
    })
    setSubmitting(false)
    if (res.error) {
      setError(res.error)
      return
    }
    toast({ title: 'Rejected', description: 'Verification request denied with feedback.' })
    onRejected()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-cranberry" />
            Reject verification request
          </DialogTitle>
          <DialogDescription>
            Your note will be sent to {request.user.name || request.user.email.split('@')[0]} via in-app notification.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="reject-notes" className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Feedback <span className="text-cranberry">*</span>
            </Label>
            <Textarea
              id="reject-notes"
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 2000))}
              placeholder="Explain what the user needs to fix or provide to be approved."
              className="min-h-[100px] resize-y"
            />
            <div className="flex justify-end mt-1">
              <span className={`text-[10px] tabular-nums ${notes.length > 1950 ? 'text-cranberry' : 'text-muted-foreground/60'}`}>
                {notes.length}/2000
              </span>
            </div>
          </div>
          {error && (
            <div className="text-sm text-cranberry bg-cranberry/5 border border-cranberry/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            size="sm"
            onClick={submit}
            disabled={submitting}
            className="bg-cranberry text-cream hover:bg-cranberry/90 btn-glow overflow-hidden"
          >
            {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
            Reject request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
