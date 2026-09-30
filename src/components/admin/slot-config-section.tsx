'use client'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { motion } from 'framer-motion'
import { safeFetch } from '@/lib/safe-fetch'
import { FadeIn } from '@/components/animated/motion'
import {
  PanelTop, PanelBottom, PanelRight, AlignCenter, BetweenHorizontalStart,
  BetweenHorizontalEnd, Zap, User, Save, LayoutGrid, AlertCircle,
} from 'lucide-react'
import type { SlotConfigRow, Visibility } from '@/lib/slot-config'

// ─── Constants ──────────────────────────────────────────────────────────────

const ALL_SLOTS: SlotConfigRow['slot'][] = [
  'HEADER',
  'AFTER_FIRST_BLOCK',
  'MID_CONTENT',
  'BEFORE_FOOTER',
  'FOOTER',
  'SIDEBAR',
]

const SLOT_ICONS: Record<SlotConfigRow['slot'], React.ReactNode> = {
  HEADER: <PanelTop className="h-4 w-4" />,
  AFTER_FIRST_BLOCK: <BetweenHorizontalStart className="h-4 w-4" />,
  MID_CONTENT: <AlignCenter className="h-4 w-4" />,
  BEFORE_FOOTER: <BetweenHorizontalEnd className="h-4 w-4" />,
  FOOTER: <PanelBottom className="h-4 w-4" />,
  SIDEBAR: <PanelRight className="h-4 w-4" />,
}

const SLOT_LABELS: Record<SlotConfigRow['slot'], string> = {
  HEADER: 'Header',
  AFTER_FIRST_BLOCK: 'After first block',
  MID_CONTENT: 'Mid content',
  BEFORE_FOOTER: 'Before footer',
  FOOTER: 'Footer',
  SIDEBAR: 'Sidebar',
}

const SLOT_DESCRIPTIONS: Record<SlotConfigRow['slot'], string> = {
  HEADER: 'Top of every page, above the hero.',
  AFTER_FIRST_BLOCK: 'After the first content block on the page.',
  MID_CONTENT: 'Middle of the page content.',
  BEFORE_FOOTER: 'Just above the site footer.',
  FOOTER: 'Bottom of every page.',
  SIDEBAR: 'Sticky sidebar (desktop only).',
}

const INTEGRATION_TYPES = [
  'SCRIPT',
  'DIRECT_LINK',
  'NATIVE',
  'BANNER',
  'IN_PAGE',
  'VIGNETTE',
  'PUSH',
  'MULTITAG',
] as const

const VISIBILITY_OPTIONS: Array<{ value: Visibility; label: string; description: string }> = [
  { value: 'ALWAYS', label: 'Always', description: 'Render the slot even without a live ad (placeholder)' },
  { value: 'ONLY_WHEN_AD_AVAILABLE', label: 'When ad available', description: 'Hide if no live ad — default' },
  { value: 'NEVER', label: 'Never', description: 'Slot disabled entirely' },
]

// The dropdown sentinel for the "Auto (round-robin)" option. Using a non-cuid
// string guarantees it can never collide with a real PlatformAdNetworkIntegration.id.
const AUTO_ASSIGN_SENTINEL = '__AUTO__'

// Lightweight shape of /api/admin/platform-integrations entries — we only
// need a few fields to render the assigned-integration dropdown.
type PlatformIntegrationLite = {
  id: string
  adNetwork: { id: string; code: string; displayName: string }
  integrationType: string
  zoneKey: string | null
  verificationState: string
}

// ─── Snapshot helper (drives the "dirty" flag) ──────────────────────────────
// We snapshot every editable field EXCEPT `enabled` because the enabled
// toggle is instantly PATCHed — it doesn't need a bulk-save to persist.
function snapshotOf(cfgs: SlotConfigRow[]): string {
  return JSON.stringify(
    cfgs.map(c => ({
      id: c.id,
      v: c.visibility,
      t: [...c.allowedIntegrationTypes].sort(),
      a: c.assignedIntegrationId,
      p: c.defaultPriority,
    })),
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SlotConfigSection() {
  const [configs, setConfigs] = useState<SlotConfigRow[]>([])
  const [integrations, setIntegrations] = useState<PlatformIntegrationLite[]>([])
  const [snapshot, setSnapshot] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedFlash, setSavedFlash] = useState(false)

  const dirty = useMemo(() => snapshotOf(configs) !== snapshot, [configs, snapshot])

  // ─── Load configs + verified platform integrations on mount ───────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [configsRes, integRes] = await Promise.all([
        safeFetch<{ configs?: SlotConfigRow[] }>('/api/admin/slot-config'),
        safeFetch<{ integrations?: PlatformIntegrationLite[] }>(
          '/api/admin/platform-integrations',
        ),
      ])
      if (cancelled) return
      if (configsRes.error) setError(configsRes.error)
      const loaded = configsRes.data?.configs ?? []
      setConfigs(loaded)
      setSnapshot(snapshotOf(loaded))
      // Only VERIFIED integrations are eligible for per-slot assignment.
      setIntegrations(
        (integRes.data?.integrations ?? []).filter(
          i => i.verificationState === 'VERIFIED',
        ),
      )
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function updateConfig(id: string, patch: Partial<SlotConfigRow>) {
    setConfigs(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))
  }

  function toggleIntegrationType(id: string, type: string) {
    setConfigs(prev =>
      prev.map(c => {
        if (c.id !== id) return c
        const has = c.allowedIntegrationTypes.includes(type)
        const next = has
          ? c.allowedIntegrationTypes.filter(t => t !== type)
          : [...c.allowedIntegrationTypes, type]
        return { ...c, allowedIntegrationTypes: next }
      }),
    )
  }

  // Instant PATCH for the enabled flag — gives immediate feedback without
  // requiring a Save click. Other fields are persisted via the bulk POST.
  async function toggleEnabled(id: string, value: boolean) {
    const prev = configs.find(c => c.id === id)
    updateConfig(id, { enabled: value })
    const res = await safeFetch(`/api/admin/slot-config/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: value }),
    })
    if (res.error) {
      setError(res.error)
      // Revert on failure so the switch reflects the persisted state.
      if (prev) updateConfig(id, { enabled: prev.enabled })
    } else {
      setError(null)
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    const payload = {
      configs: configs.map(c => ({
        id: c.id,
        enabled: c.enabled,
        allowedIntegrationTypes: c.allowedIntegrationTypes,
        // Only PLATFORM_NETWORK cards ever carry an assigned integration —
        // null it out for USER_INTEGRATION so the backend doesn't reject an
        // assignment that wouldn't make sense.
        assignedIntegrationId:
          c.source === 'PLATFORM_NETWORK' ? c.assignedIntegrationId : null,
        defaultPriority: c.defaultPriority,
        visibility: c.visibility,
      })),
    }
    const res = await safeFetch<{ configs?: SlotConfigRow[] }>(
      '/api/admin/slot-config',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    )
    setSaving(false)
    if (res.error) {
      setError(res.error)
    } else {
      const next = res.data?.configs ?? configs
      setConfigs(next)
      setSnapshot(snapshotOf(next))
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1500)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-40 rounded-xl shimmer-bg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header / explanation */}
      <FadeIn>
        <Card className="overflow-hidden border-evergreen/20">
          <div className="h-1.5 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-evergreen" />
              Slot configuration
            </CardTitle>
            <CardDescription className="space-y-1">
              <span className="block">
                Controls which ad slots appear on every Special Page, which ad
                types are allowed in each slot, and which specific platform
                integration serves each slot.
              </span>
              <span className="block text-xs text-muted-foreground/80">
                Disabled slots won&apos;t render at all. Slots with
                visibility=ONLY_WHEN_AD_AVAILABLE will hide automatically when
                no ad is available.
              </span>
            </CardDescription>
          </CardHeader>
        </Card>
      </FadeIn>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Couldn&apos;t save slot config</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {configs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <LayoutGrid className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
            <p className="font-medium">No slot configs loaded</p>
            <p className="text-sm">
              The backend should auto-seed 12 default rows on first read. Try
              reloading.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Cards grouped by slot — 2 per row (platform | user) */}
      {ALL_SLOTS.map((slot, slotIdx) => {
        const platform = configs.find(
          c => c.slot === slot && c.source === 'PLATFORM_NETWORK',
        )
        const user = configs.find(
          c => c.slot === slot && c.source === 'USER_INTEGRATION',
        )
        if (!platform && !user) return null
        return (
          <FadeIn key={slot} delay={slotIdx * 0.04}>
            <div className="grid gap-3 md:grid-cols-2">
              {platform && (
                <SlotCard
                  config={platform}
                  icon={SLOT_ICONS[slot]}
                  slotLabel={SLOT_LABELS[slot]}
                  slotDescription={SLOT_DESCRIPTIONS[slot]}
                  integrations={integrations}
                  onToggleEnabled={v => toggleEnabled(platform.id, v)}
                  onVisibilityChange={v =>
                    updateConfig(platform.id, { visibility: v })
                  }
                  onToggleIntegrationType={t =>
                    toggleIntegrationType(platform.id, t)
                  }
                  onAssignedIntegrationChange={v =>
                    updateConfig(platform.id, { assignedIntegrationId: v })
                  }
                  onPriorityChange={v =>
                    updateConfig(platform.id, { defaultPriority: v })
                  }
                />
              )}
              {user && (
                <SlotCard
                  config={user}
                  icon={SLOT_ICONS[slot]}
                  slotLabel={SLOT_LABELS[slot]}
                  slotDescription={SLOT_DESCRIPTIONS[slot]}
                  integrations={integrations}
                  onToggleEnabled={v => toggleEnabled(user.id, v)}
                  onVisibilityChange={v =>
                    updateConfig(user.id, { visibility: v })
                  }
                  onToggleIntegrationType={t =>
                    toggleIntegrationType(user.id, t)
                  }
                  onAssignedIntegrationChange={v =>
                    updateConfig(user.id, { assignedIntegrationId: v })
                  }
                  onPriorityChange={v =>
                    updateConfig(user.id, { defaultPriority: v })
                  }
                />
              )}
            </div>
          </FadeIn>
        )
      })}

      {/* Sticky save bar */}
      <FadeIn>
        <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-xl border border-border/60 bg-background/95 p-3 shadow-elevated backdrop-blur">
          {dirty && !saving && (
            <span className="text-xs text-muted-foreground">
              You have unsaved changes
            </span>
          )}
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
            disabled={saving || !dirty}
            className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving…' : 'Save slot config'}
          </Button>
        </div>
      </FadeIn>
    </div>
  )
}

// ─── Per-card UI ─────────────────────────────────────────────────────────────

function SlotCard({
  config,
  icon,
  slotLabel,
  slotDescription,
  integrations,
  onToggleEnabled,
  onVisibilityChange,
  onToggleIntegrationType,
  onAssignedIntegrationChange,
  onPriorityChange,
}: {
  config: SlotConfigRow
  icon: React.ReactNode
  slotLabel: string
  slotDescription: string
  integrations: PlatformIntegrationLite[]
  onToggleEnabled: (v: boolean) => void
  onVisibilityChange: (v: Visibility) => void
  onToggleIntegrationType: (t: string) => void
  onAssignedIntegrationChange: (v: string | null) => void
  onPriorityChange: (v: number) => void
}) {
  const isPlatform = config.source === 'PLATFORM_NETWORK'
  const accent = isPlatform
    ? 'from-evergreen to-evergreen-dark'
    : 'from-berry to-cranberry'
  const sourceBadge = isPlatform ? (
    <Badge
      variant="outline"
      className="bg-evergreen/10 text-evergreen border-evergreen/30"
    >
      <Zap className="h-3 w-3 mr-1" /> Platform
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="bg-berry/10 text-berry border-berry/30"
    >
      <User className="h-3 w-3 mr-1" /> User
    </Badge>
  )

  return (
    <Card className={`overflow-hidden ${!config.enabled ? 'opacity-60' : ''}`}>
      <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2 min-w-0">
            <span className="rounded-md bg-muted/40 p-1.5 text-foreground flex-shrink-0">
              {icon}
            </span>
            <span className="truncate">{slotLabel}</span>
          </CardTitle>
          {sourceBadge}
        </div>
        <CardDescription className="text-xs">{slotDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Enabled toggle — instantly PATCHed */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <Label className="text-sm font-medium">Enabled</Label>
            <span className="text-[10px] text-muted-foreground">
              {config.enabled
                ? 'Slot is active and eligible to render'
                : 'Slot is disabled — no ads will render here'}
            </span>
          </div>
          <Switch checked={config.enabled} onCheckedChange={onToggleEnabled} />
        </div>

        <div className="border-t border-border/40" />

        {/* Visibility select */}
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Visibility
          </Label>
          <Select
            value={config.visibility}
            onValueChange={v => onVisibilityChange(v as Visibility)}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISIBILITY_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>
                  <span className="font-medium">{o.label}</span>
                  <span className="text-xs text-muted-foreground ml-1.5">
                    — {o.description}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Allowed integration types — multi-select chips */}
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Allowed integration types
          </Label>
          <p className="text-[10px] text-muted-foreground mb-2">
            Empty = any type allowed. Click chips to toggle.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {INTEGRATION_TYPES.map(t => {
              const active = config.allowedIntegrationTypes.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onToggleIntegrationType(t)}
                  className={`text-[11px] font-mono font-bold px-2 py-1 rounded-md border transition-all ${
                    active
                      ? 'bg-evergreen/15 text-evergreen border-evergreen/40 ring-1 ring-evergreen/30'
                      : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>
        </div>

        {/* Assigned platform integration (only for PLATFORM_NETWORK cards) */}
        {isPlatform && (
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Assigned platform integration
            </Label>
            <p className="text-[10px] text-muted-foreground mb-2">
              Auto = round-robin among verified integrations that match the
              allowed types above.
            </p>
            {integrations.length === 0 ? (
              <div className="text-xs px-3 py-2 rounded-md bg-muted/40 text-muted-foreground italic">
                No verified integrations — auto (round-robin) will be used.
              </div>
            ) : (
              <Select
                value={config.assignedIntegrationId ?? AUTO_ASSIGN_SENTINEL}
                onValueChange={v =>
                  onAssignedIntegrationChange(
                    v === AUTO_ASSIGN_SENTINEL ? null : v,
                  )
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO_ASSIGN_SENTINEL}>
                    <span className="font-medium">Auto (round-robin)</span>
                  </SelectItem>
                  {integrations.map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      <span className="font-medium">
                        {i.adNetwork.displayName}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1.5">
                        · {i.integrationType} · {i.zoneKey ?? '—'}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        {/* Default priority */}
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Default priority
          </Label>
          <Input
            type="number"
            min={1}
            max={200}
            value={config.defaultPriority}
            onChange={e => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v) && v >= 1 && v <= 200) onPriorityChange(v)
            }}
            className="mt-1 font-mono text-base font-bold"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Lower = appears higher on page. Range: 1–200.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
