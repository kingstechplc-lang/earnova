'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { safeFetch } from '@/lib/safe-fetch'
import { useConfetti } from '@/components/animated/confetti'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animated/motion'
import {
  CheckCircle2, XCircle, Ban, Clock, User, ExternalLink, ShieldCheck, Link2,
} from 'lucide-react'

type PendingIntegration = {
  id: string
  integrationType: string
  siteIdentifier: string | null
  zoneIdentifier: string | null
  zoneKey: string | null
  cdnUrl: string | null
  lifecycleState: string
  rejectionReason: string | null
  createdAt: string
  adNetwork: { id: string; code: string; displayName: string; policyDocUrl: string | null }
  user: { id: string; email: string; name: string | null; createdAt: string }
}

export function ReviewsSection() {
  const [pending, setPending] = useState<PendingIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const { fire: fireConfetti, ConfettiLayer } = useConfetti()

  const load = async () => {
    setLoading(true)
    setError(null)
    const res = await safeFetch<{ integrations?: PendingIntegration[] }>('/api/admin/pending')
    if (res.error) setError(res.error)
    setPending(res.data?.integrations || [])
    setLoading(false)
  }

  useEffect(() => {
    const id = window.setTimeout(() => { load() }, 0)
    return () => window.clearTimeout(id)
  }, [])

  async function act(integrationId: string, action: 'APPROVE' | 'REJECT' | 'REVOKE') {
    setActing(integrationId)
    const res = await safeFetch(`/api/admin/integrations/${integrationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setActing(null)
    if (action === 'APPROVE' && !res.error) {
      fireConfetti({ count: 150, spread: 80, y: 0.3 })
    }
    load()
  }

  if (loading) {
    return <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-24 rounded-xl shimmer-bg" />)}</div>
  }
  if (error) {
    return (
      <Card className="border-cranberry/40">
        <CardContent className="py-8 text-center">
          <p className="text-cranberry mb-3">Couldn&apos;t load pending reviews</p>
          <Button variant="outline" size="sm" onClick={load}>Try again</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {ConfettiLayer}
      <FadeIn>
        <div className="mb-2">
          <h3 className="font-serif text-xl font-bold flex items-center gap-2">
            <Clock className="h-5 w-5 text-gold-dark" />
            Pending ad-integration reviews
          </h3>
          <p className="text-sm text-muted-foreground">
            These are <strong>user-submitted</strong> ad-network integrations (Adsterra/Monetag) awaiting admin approval.
            This is separate from the <strong>Platform ads</strong> tab which manages the platform&apos;s own ad inventory.
          </p>
        </div>
      </FadeIn>

      {pending.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="inline-block mb-2"
            >
              <CheckCircle2 className="h-10 w-10 mx-auto text-evergreen/60" />
            </motion.div>
            <p className="font-medium">All caught up!</p>
            <p className="text-sm text-muted-foreground">No pending user ad-integration reviews.</p>
          </CardContent>
        </Card>
      ) : (
        <StaggerContainer className="space-y-3">
          {pending.map(int => (
            <StaggerItem key={int.id} y={10}>
              <Card className="overflow-hidden hover:shadow-elevated hover:-translate-y-0.5 transition-all">
                <div className={`h-0.5 w-full ${
                  int.adNetwork.code === 'adsterra' ? 'bg-gradient-to-r from-gold to-gold-dark' : 'bg-gradient-to-r from-berry to-berry/70'
                }`} />
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <Badge variant="outline" className={
                          int.adNetwork.code === 'adsterra'
                            ? 'bg-gold/15 text-gold-dark border-gold/30'
                            : 'bg-berry/15 text-berry border-berry/30'
                        }>
                          {int.adNetwork.displayName}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">{int.integrationType}</span>
                        {int.adNetwork.policyDocUrl && (
                          <a
                            href={int.adNetwork.policyDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-xs text-evergreen underline decoration-gold/50 hover:decoration-gold"
                          >
                            <ExternalLink className="h-3 w-3" /> Rules
                          </a>
                        )}
                      </div>
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {int.user.name || int.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Account age: {Math.floor((Date.now() - new Date(int.user.createdAt).getTime()) / 86400000)} days · Submitted {new Date(int.createdAt).toLocaleDateString()}
                      </p>
                      <div className="mt-2 space-y-1 text-xs">
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">Site:</span>{' '}
                          <code className="font-mono text-foreground/80 bg-muted/40 px-1 py-0.5 rounded break-all">
                            {int.siteIdentifier}
                          </code>
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">Zone:</span>{' '}
                          <code className="font-mono text-foreground/80 bg-muted/40 px-1 py-0.5 rounded">
                            {int.zoneIdentifier}
                          </code>
                        </p>
                        {int.zoneKey && (
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">Zone key:</span>{' '}
                            <code className="font-mono text-foreground/80 bg-muted/40 px-1 py-0.5 rounded">
                              {int.zoneKey}
                            </code>
                          </p>
                        )}
                        {int.cdnUrl && (
                          <p className="text-muted-foreground">
                            <span className="font-medium text-foreground">CDN:</span>{' '}
                            <code className="font-mono text-foreground/80 bg-muted/40 px-1 py-0.5 rounded break-all">
                              {int.cdnUrl}
                            </code>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => act(int.id, 'APPROVE')}
                        disabled={acting === int.id}
                        className="bg-evergreen text-cream hover:bg-evergreen-dark"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act(int.id, 'REJECT')}
                        disabled={acting === int.id}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => act(int.id, 'REVOKE')}
                        disabled={acting === int.id}
                        className="text-muted-foreground hover:text-cranberry hover:bg-cranberry/5"
                      >
                        <Ban className="h-3.5 w-3.5 mr-1" /> Revoke
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}

      {/* Clarification note */}
      <Card className="bg-gradient-to-br from-muted/30 to-background border-border/60">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-evergreen/10 p-2 mt-0.5">
              <Link2 className="h-4 w-4 text-evergreen" />
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How these two sections relate</p>
              <p>
                <strong>Reviews</strong> (this tab) = user-submitted ad-network integrations. Users connect their own
                Adsterra/Monetag accounts. Admin approves/rejects each one.
              </p>
              <p className="mt-1">
                <strong>Platform ads</strong> (separate tab) = the platform&apos;s own ad-network publisher account.
                Admin configures + verifies the platform&apos;s own zone IDs. These render on every eligible Special Page
                alongside any approved user integrations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
