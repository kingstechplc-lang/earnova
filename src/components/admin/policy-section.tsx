'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { motion } from 'framer-motion'
import { safeFetch } from '@/lib/safe-fetch'
import { FadeIn } from '@/components/animated/motion'
import { ShieldAlert, Eye, User, Clock, Sliders, Save, Zap } from 'lucide-react'

type Policy = {
  id: string
  maxAdUnitsPerPage: number
  maxPlatformAdsPerPage: number
  maxUserAdsPerPage: number
  minContentBetweenAdsPx: number
  platformAdsEnabled: boolean
  userAdsEnabled: boolean
  newIntegrationsManual: boolean
  globalKillSwitch: boolean
}

export function PolicySection({ initialPolicy }: { initialPolicy: Policy | null }) {
  const [policy, setPolicy] = useState<Policy | null>(initialPolicy)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    if (initialPolicy) setPolicy(initialPolicy)
  }, [initialPolicy])

  async function save() {
    if (!policy) return
    setSaving(true)
    setError(null)
    const res = await safeFetch('/api/admin/policy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        maxAdUnitsPerPage: policy.maxAdUnitsPerPage,
        maxPlatformAdsPerPage: policy.maxPlatformAdsPerPage,
        maxUserAdsPerPage: policy.maxUserAdsPerPage,
        minContentBetweenAdsPx: policy.minContentBetweenAdsPx,
      }),
    })
    setSaving(false)
    if (res.error) {
      setError(res.error)
    } else if (res.data) {
      setPolicy(res.data.policy)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    }
  }

  async function toggle(key: 'globalKillSwitch' | 'platformAdsEnabled' | 'userAdsEnabled' | 'newIntegrationsManual', value: boolean) {
    setPolicy(prev => prev ? { ...prev, [key]: value } : null)
    const res = await safeFetch('/api/admin/policy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    if (res.error) setError(res.error)
    else if (res.data) setPolicy(res.data.policy)
  }

  if (!policy) return <div className="text-muted-foreground">Loading policy…</div>

  return (
    <div className="space-y-4">
      {ConfettiLayerForPolicy(policy, error)}

      {/* Quick toggles */}
      <FadeIn>
        <Card className="overflow-hidden shadow-festive border-evergreen/20">
          <div className="h-1.5 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Zap className="h-5 w-5 text-gold-dark" />
              Platform-wide toggles
            </CardTitle>
            <CardDescription>These settings apply to every Special Page on the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <SwitchRow
              icon={<ShieldAlert className="h-4 w-4" />}
              iconColor="text-cranberry"
              label="Global ad kill switch"
              description="Disables ALL ads (platform + user) on every page immediately. Use only in emergencies."
              checked={policy.globalKillSwitch}
              onChange={v => toggle('globalKillSwitch', v)}
              danger
            />
            <div className="border-t border-border/60" />
            <SwitchRow
              icon={<Eye className="h-4 w-4" />}
              iconColor="text-evergreen"
              label="Platform ads"
              description="Allows the platform's own Adsterra/Monetag publisher account to render on eligible pages."
              checked={policy.platformAdsEnabled}
              onChange={v => toggle('platformAdsEnabled', v)}
            />
            <div className="border-t border-border/60" />
            <SwitchRow
              icon={<User className="h-4 w-4" />}
              iconColor="text-berry"
              label="User ads"
              description="Allows approved user ad integrations to render on their pages."
              checked={policy.userAdsEnabled}
              onChange={v => toggle('userAdsEnabled', v)}
            />
            <div className="border-t border-border/60" />
            <SwitchRow
              icon={<Clock className="h-4 w-4" />}
              iconColor="text-gold-dark"
              label="Manual approval required"
              description="New ad integrations stay in PENDING_REVIEW until an admin reviews them."
              checked={policy.newIntegrationsManual}
              onChange={v => toggle('newIntegrationsManual', v)}
            />
          </CardContent>
        </Card>
      </FadeIn>

      {/* Numeric caps */}
      <FadeIn delay={0.05}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sliders className="h-5 w-5 text-evergreen" />
              Placement caps
            </CardTitle>
            <CardDescription>Maximum ad density per Special Page. Lower = cleaner pages, higher = more monetization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <NumberField
                label="Max ad units per page"
                description="Total ad slots allowed on a single page (platform + user combined)"
                value={policy.maxAdUnitsPerPage}
                min={1} max={20}
                onChange={v => setPolicy({ ...policy, maxAdUnitsPerPage: v })}
              />
              <NumberField
                label="Min content between ads (px)"
                description="Minimum vertical separation between adjacent ad placements"
                value={policy.minContentBetweenAdsPx}
                min={0} max={1000} step={50}
                onChange={v => setPolicy({ ...policy, minContentBetweenAdsPx: v })}
              />
              <NumberField
                label="Max platform ads per page"
                description="Maximum platform-controlled ad slots per page"
                value={policy.maxPlatformAdsPerPage}
                min={0} max={10}
                onChange={v => setPolicy({ ...policy, maxPlatformAdsPerPage: v })}
              />
              <NumberField
                label="Max user ads per page"
                description="Maximum user-integration ad slots per page"
                value={policy.maxUserAdsPerPage}
                min={0} max={10}
                onChange={v => setPolicy({ ...policy, maxUserAdsPerPage: v })}
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
              {error && <span className="text-sm text-destructive">{error}</span>}
              {savedFlash && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-evergreen font-medium"
                >
                  ✓ Saved
                </motion.span>
              )}
              <Button
                onClick={save}
                disabled={saving}
                className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving…' : 'Save caps'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  )
}

function ConfettiLayerForPolicy(policy: Policy, error: string | null) {
  if (policy.globalKillSwitch) {
    return (
      <Alert variant="destructive" className="border-cranberry/40 bg-cranberry/10">
        <ShieldAlert className="h-4 w-4 text-cranberry anim-pulse-glow" />
        <AlertTitle className="text-cranberry">⚠ Global kill switch is ACTIVE</AlertTitle>
        <AlertDescription>No ads are rendering on any Special Page right now.</AlertDescription>
      </Alert>
    )
  }
  return null
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
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function NumberField({
  label, description, value, min, max, step = 1, onChange,
}: {
  label: string
  description: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v) && v >= min && v <= max) onChange(v)
        }}
        className="mt-1 font-mono text-base font-bold"
      />
      <p className="text-[10px] text-muted-foreground mt-1">{description}</p>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">Range: {min}–{max}</p>
    </div>
  )
}
