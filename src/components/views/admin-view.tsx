'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  ChevronLeft, ShieldAlert, CheckCircle2, XCircle, Ban, Pause,
  ShieldCheck, Zap, Eye, Clock, User,
} from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'

type Integration = {
  id: string; integrationType: string; siteIdentifier: string | null
  zoneIdentifier: string | null; lifecycleState: string; rejectionReason: string | null
  createdAt: string; adNetwork: { id: string; code: string; displayName: string }
  user: { id: string; email: string; name: string | null; createdAt: string }
}

type Policy = {
  id: string; platformAdsEnabled: boolean; userAdsEnabled: boolean
  newIntegrationsManual: boolean; globalKillSwitch: boolean
  maxAdUnitsPerPage: number; maxPlatformAdsPerPage: number; maxUserAdsPerPage: number
}

export default function AdminView({
  user, navigate,
}: {
  user: CurrentUser
  navigate: (v: View) => void
}) {
  const [pending, setPending] = useState<Integration[]>([])
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const [p, k] = await Promise.all([
      fetch('/api/admin/pending').then(r => r.json()),
      fetch('/api/admin/kill-switch').then(r => r.json()),
    ])
    setPending(p.integrations || [])
    setPolicy(k.policy || null)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function act(integrationId: string, action: 'APPROVE' | 'REJECT' | 'REVOKE') {
    setActing(integrationId)
    await fetch(`/api/admin/integrations/${integrationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setActing(null)
    load()
  }

  async function togglePolicy(field: keyof Policy, value: boolean) {
    setPolicy(prev => prev ? { ...prev, [field]: value } : null)
    await fetch('/api/admin/kill-switch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    load()
  }

  if (loading) return <div className="container mx-auto px-4 py-8">Loading…</div>

  return (
    <div className="view-fade container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'dashboard' })}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
      </div>

      {/* Hero header */}
      <div className="mb-8 relative overflow-hidden rounded-2xl border border-evergreen/30 bg-gradient-to-br from-evergreen/10 via-background to-gold/5 p-6 md:p-8">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-evergreen/20 blur-3xl" />
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span className="text-xs uppercase tracking-wider font-semibold text-evergreen">Admin Console</span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mb-2">Platform controls</h1>
        <p className="text-muted-foreground">
          Logged in as <strong className="text-foreground">{user.email}</strong>
        </p>
      </div>

      {/* Global kill switch alert */}
      {policy?.globalKillSwitch && (
        <Alert variant="destructive" className="mb-6 border-cranberry/40 bg-cranberry/10">
          <ShieldAlert className="h-4 w-4 text-cranberry" />
          <AlertTitle className="text-cranberry">⚠ Global kill switch is ACTIVE</AlertTitle>
          <AlertDescription>
            No ads are rendering on any Special Page right now. Toggle it off below to restore.
          </AlertDescription>
        </Alert>
      )}

      {/* Platform-wide controls */}
      <Card className="mb-6 overflow-hidden shadow-festive border-evergreen/20">
        <div className="h-1.5 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Zap className="h-5 w-5 text-gold-dark" />
            Platform-wide controls
          </CardTitle>
          <CardDescription>
            These settings apply to every Special Page on the platform. Use the kill switch only in emergencies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <SwitchRow
            icon={<ShieldAlert className="h-4 w-4" />}
            iconColor="text-cranberry"
            label="Global ad kill switch"
            description="Disables ALL ads (platform + user) on every page immediately."
            checked={policy?.globalKillSwitch ?? false}
            onChange={v => togglePolicy('globalKillSwitch', v)}
            danger
          />
          <div className="border-t border-border/60" />
          <SwitchRow
            icon={<Eye className="h-4 w-4" />}
            iconColor="text-evergreen"
            label="Platform ads"
            description="Allows the platform's own Adsterra/Monetag publisher account to render on eligible pages."
            checked={policy?.platformAdsEnabled ?? false}
            onChange={v => togglePolicy('platformAdsEnabled', v)}
          />
          <div className="border-t border-border/60" />
          <SwitchRow
            icon={<User className="h-4 w-4" />}
            iconColor="text-berry"
            label="User ads"
            description="Allows approved user ad integrations to render on their pages."
            checked={policy?.userAdsEnabled ?? false}
            onChange={v => togglePolicy('userAdsEnabled', v)}
          />
          <div className="border-t border-border/60" />
          <SwitchRow
            icon={<Clock className="h-4 w-4" />}
            iconColor="text-gold-dark"
            label="Manual approval required"
            description="New ad integrations stay in PENDING_REVIEW until an admin reviews them."
            checked={policy?.newIntegrationsManual ?? false}
            onChange={v => togglePolicy('newIntegrationsManual', v)}
          />
        </CardContent>
      </Card>

      {/* Pending reviews */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock className="h-5 w-5 text-gold-dark" />
            Pending ad-integration reviews
            {pending.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-gold/15 text-gold-dark text-xs font-bold px-2 py-0.5">
                {pending.length}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Each integration must be reviewed before it can render ads. Verify the user&apos;s ad-network
            account and site-verification status before approving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto text-evergreen/40 mb-2" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm">No pending reviews.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(int => (
                <div key={int.id} className="border border-border/60 rounded-xl p-4 hover:border-evergreen/30 transition-colors">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          int.adNetwork.code === 'adsterra' ? 'bg-gold/15 text-gold-dark' : 'bg-berry/15 text-berry'
                        }`}>
                          ● {int.adNetwork.displayName}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">{int.integrationType}</span>
                      </div>
                      <p className="text-sm font-medium">
                        {int.user.name || int.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Account age: {Math.floor((Date.now() - new Date(int.user.createdAt).getTime()) / 86400000)} days
                      </p>
                      <div className="mt-2 space-y-0.5 text-xs">
                        <p className="text-muted-foreground">
                          <span className="font-medium">Site:</span>{' '}
                          <code className="font-mono text-foreground/80 bg-muted/40 px-1 py-0.5 rounded">
                            {int.siteIdentifier}
                          </code>
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-medium">Zone:</span>{' '}
                          <code className="font-mono text-foreground/80 bg-muted/40 px-1 py-0.5 rounded">
                            {int.zoneIdentifier}
                          </code>
                        </p>
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
                        className="text-cranberry hover:text-cranberry hover:bg-cranberry/10"
                      >
                        <Ban className="h-3.5 w-3.5 mr-1" /> Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review checklist */}
      <Card className="bg-gradient-to-br from-muted/30 to-background border-border/60">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Pause className="h-4 w-4 text-gold-dark" />
            Review checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-evergreen/10 text-evergreen text-xs mt-0.5">✓</span>
            Verify the user&apos;s ad-network account is in good standing.
          </p>
          <p className="flex items-start gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-evergreen/10 text-evergreen text-xs mt-0.5">✓</span>
            Verify the site identifier matches the user&apos;s Special Page URL.
          </p>
          <p className="flex items-start gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-evergreen/10 text-evergreen text-xs mt-0.5">✓</span>
            Check the page for prohibited content categories per ad-network rules.
          </p>
          <p className="flex items-start gap-2">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cranberry/10 text-cranberry text-xs mt-0.5">✗</span>
            Reject if anything looks automated, spoofed, or policy-violating.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function SwitchRow({
  icon, iconColor, label, description, checked, onChange, danger,
}: {
  icon: React.ReactNode
  iconColor: string
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  danger?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex items-start gap-3 flex-1">
        <div className={`rounded-lg p-1.5 mt-0.5 ${danger ? 'bg-cranberry/10' : 'bg-muted/40'}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        <div>
          <Label className={`font-medium ${danger ? 'text-cranberry' : ''}`}>{label}</Label>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  )
}
