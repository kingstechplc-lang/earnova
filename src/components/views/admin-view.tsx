'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ChevronLeft, ShieldAlert, CheckCircle2, XCircle, Ban, Pause } from 'lucide-react'
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
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'dashboard' })}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold">Admin</h1>
        <Badge>Moderator: {user.email}</Badge>
      </div>

      {/* Platform-wide controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Platform-wide controls</CardTitle>
          <CardDescription>
            These settings apply to every Special Page on the platform. Use the kill switch only in emergencies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {policy?.globalKillSwitch && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Global kill switch is ACTIVE</AlertTitle>
              <AlertDescription>No ads are rendering on any Special Page right now.</AlertDescription>
            </Alert>
          )}
          <SwitchRow
            label="Global ad kill switch"
            description="Disables ALL ads (platform + user) on every page immediately."
            checked={policy?.globalKillSwitch ?? false}
            onChange={v => togglePolicy('globalKillSwitch', v)}
          />
          <SwitchRow
            label="Platform ads"
            description="Allows the platform's own Adsterra/Monetag publisher account to render on eligible pages."
            checked={policy?.platformAdsEnabled ?? false}
            onChange={v => togglePolicy('platformAdsEnabled', v)}
          />
          <SwitchRow
            label="User ads"
            description="Allows approved user ad integrations to render on their pages."
            checked={policy?.userAdsEnabled ?? false}
            onChange={v => togglePolicy('userAdsEnabled', v)}
          />
          <SwitchRow
            label="Manual approval required"
            description="New ad integrations stay in PENDING_REVIEW until an admin reviews them."
            checked={policy?.newIntegrationsManual ?? false}
            onChange={v => togglePolicy('newIntegrationsManual', v)}
          />
        </CardContent>
      </Card>

      {/* Pending integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending ad-integration reviews</CardTitle>
          <CardDescription>
            Each integration must be reviewed before it can render ads. Verify the user&apos;s
            ad-network account and site-verification status before approving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No pending reviews.</div>
          ) : (
            <div className="space-y-3">
              {pending.map(int => (
                <div key={int.id} className="border border-border rounded-md p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{int.adNetwork.displayName}</span>
                        <Badge variant="secondary">{int.integrationType}</Badge>
                      </div>
                      <p className="text-sm">
                        <strong>User:</strong> {int.user.name || int.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Account age: {Math.floor((Date.now() - new Date(int.user.createdAt).getTime()) / 86400000)} days
                      </p>
                      <p className="text-sm mt-1">
                        <strong>Site:</strong> <code className="text-xs">{int.siteIdentifier}</code>
                      </p>
                      <p className="text-sm">
                        <strong>Zone:</strong> <code className="text-xs">{int.zoneIdentifier}</code>
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => act(int.id, 'APPROVE')}
                        disabled={acting === int.id}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => act(int.id, 'REJECT')}
                        disabled={acting === int.id}
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => act(int.id, 'REVOKE')}
                        disabled={acting === int.id}
                      >
                        <Ban className="h-3 w-3 mr-1" /> Revoke
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Review checklist</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p><Pause className="inline h-3 w-3 mr-1" /> Verify the user&apos;s ad-network account is in good standing.</p>
          <p><Pause className="inline h-3 w-3 mr-1" /> Verify the site identifier matches the user&apos;s Special Page URL.</p>
          <p><Pause className="inline h-3 w-3 mr-1" /> Check the page for prohibited content categories per ad-network rules.</p>
          <p><Pause className="inline h-3 w-3 mr-1" /> Reject if anything looks automated, spoofed, or policy-violating.</p>
        </CardContent>
      </Card>
    </div>
  )
}

function SwitchRow({
  label, description, checked, onChange,
}: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <Label className="font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
