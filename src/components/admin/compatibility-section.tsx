'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import { GradientDialogHeader } from '@/components/animated/gradient-dialog-header'
import { FadeIn } from '@/components/animated/motion'
import { motion } from 'framer-motion'
import { safeFetch } from '@/lib/safe-fetch'
import { Plus, Layers, Grid3x3, Trash2, Edit3 } from 'lucide-react'

type AdNetworkLite = { id: string; code: string; displayName: string }
type Rule = {
  id: string
  networkA: AdNetworkLite
  networkB: AdNetworkLite
  verdict: 'ALLOWED' | 'ALLOWED_WITH_LIMITS' | 'FORBIDDEN'
  maxSimultaneousUnits: number | null
  minVerticalSeparationPx: number | null
  requiredContentClassBetween: string | null
  notes: string | null
}

const VERDICT_COLORS: Record<string, string> = {
  ALLOWED: 'bg-evergreen/15 text-evergreen border-evergreen/30',
  ALLOWED_WITH_LIMITS: 'bg-gold/15 text-gold-dark border-gold/30',
  FORBIDDEN: 'bg-cranberry/15 text-cranberry border-cranberry/30',
}

export function CompatibilitySection() {
  const [rules, setRules] = useState<Rule[]>([])
  const [networks, setNetworks] = useState<AdNetworkLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Rule | null>(null)
  const [creating, setCreating] = useState(false)

  const load = async () => {
    setLoading(true)
    const [rulesRes, networksRes] = await Promise.all([
      safeFetch<{ rules?: Rule[] }>('/api/admin/compatibility'),
      safeFetch<{ networks?: any[] }>('/api/admin/networks'),
    ])
    if (rulesRes.error) setError(rulesRes.error)
    setRules(rulesRes.data?.rules || [])
    setNetworks((networksRes.data?.networks || []).map((n: any) => ({ id: n.id, code: n.code, displayName: n.displayName })))
    setLoading(false)
  }
  useEffect(() => {
    const id = window.setTimeout(() => { load() }, 0)
    return () => window.clearTimeout(id)
  }, [])

  async function deleteRule(id: string) {
    if (!confirm('Delete this compatibility rule?')) return
    const res = await safeFetch(`/api/admin/compatibility/${id}`, { method: 'DELETE' })
    if (res.error) {
      alert(res.error)
      return
    }
    load()
  }

  if (loading) return <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-32 rounded-xl shimmer-bg" />)}</div>

  return (
    <div className="space-y-4">
      <FadeIn>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h3 className="font-serif text-xl font-bold flex items-center gap-2">
              <Grid3x3 className="h-5 w-5 text-evergreen" />
              Compatibility matrix
            </h3>
            <p className="text-sm text-muted-foreground">Rules that govern which ad networks can render together on the same page.</p>
          </div>
          <Button onClick={() => setCreating(true)} className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden">
            <Plus className="h-4 w-4 mr-1" /> New rule
          </Button>
        </div>
      </FadeIn>

      {/* Matrix visualization */}
      {networks.length > 1 && (
        <Card className="overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-evergreen" />
              Visual matrix
            </CardTitle>
            <CardDescription>Cell color shows verdict between row network and column network.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left p-2 text-muted-foreground font-medium sticky left-0 bg-card">↓ / →</th>
                  {networks.map(n => (
                    <th key={n.id} className="p-2 text-center font-mono font-bold text-[10px]" title={n.displayName}>
                      {n.code.slice(0, 4)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {networks.map(rowN => (
                  <tr key={rowN.id}>
                    <td className="p-2 font-mono font-bold text-[10px] sticky left-0 bg-card" title={rowN.displayName}>
                      {rowN.code.slice(0, 8)}
                    </td>
                    {networks.map(colN => {
                      if (rowN.id === colN.id) {
                        return <td key={colN.id} className="p-1 text-center"><span className="text-muted-foreground/30">—</span></td>
                      }
                      const rule = rules.find(r =>
                        (r.networkA.id === rowN.id && r.networkB.id === colN.id) ||
                        (r.networkA.id === colN.id && r.networkB.id === rowN.id)
                      )
                      const verdict = rule?.verdict || 'ALLOWED'
                      const cls = VERDICT_COLORS[verdict]
                      return (
                        <td key={colN.id} className="p-1 text-center">
                          <span className={`inline-block h-7 w-7 rounded text-[9px] font-bold leading-7 border ${cls}`} title={`${rowN.displayName} × ${colN.displayName}: ${verdict}`}>
                            {verdict === 'ALLOWED' ? 'A' : verdict === 'ALLOWED_WITH_LIMITS' ? 'L' : 'F'}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Rules list */}
      <div className="grid gap-2">
        {rules.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Grid3x3 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-medium">No compatibility rules yet</p>
              <p className="text-sm">Without rules, all network pairs are ALLOWED by default.</p>
            </CardContent>
          </Card>
        ) : (
          rules.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card className="overflow-hidden hover:shadow-elevated transition-all">
                <CardContent className="py-3 flex items-center gap-3 flex-wrap">
                  <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30 font-mono">
                    {r.networkA.code}
                  </Badge>
                  <span className="text-muted-foreground">×</span>
                  <Badge variant="outline" className="bg-berry/5 text-berry border-berry/30 font-mono">
                    {r.networkB.code}
                  </Badge>
                  <span className={`ml-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${VERDICT_COLORS[r.verdict]}`}>
                    {r.verdict.replace('_', ' ')}
                  </span>
                  <div className="flex-1 min-w-0 text-xs text-muted-foreground">
                    {r.maxSimultaneousUnits !== null && <span className="mr-3">Max: <strong className="text-foreground">{r.maxSimultaneousUnits}</strong> units</span>}
                    {r.minVerticalSeparationPx !== null && <span className="mr-3">Min sep: <strong className="text-foreground">{r.minVerticalSeparationPx}px</strong></span>}
                    {r.notes && <span className="italic">"{r.notes}"</span>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(r)} className="h-7 px-2">
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteRule(r.id)} className="h-7 px-2 text-muted-foreground hover:text-cranberry">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {(creating || editing) && (
        <RuleDialog
          rule={editing}
          networks={networks}
          existingPairs={rules.map(r => `${r.networkA.id}|${r.networkB.id}`)}
          onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { setCreating(false); setEditing(null); load() }}
        />
      )}
    </div>
  )
}

function RuleDialog({
  rule, networks, existingPairs, onClose, onSaved,
}: {
  rule: Rule | null
  networks: AdNetworkLite[]
  existingPairs: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [networkAId, setNetworkAId] = useState(rule?.networkA.id || '')
  const [networkBId, setNetworkBId] = useState(rule?.networkB.id || '')
  const [verdict, setVerdict] = useState<Rule['verdict']>(rule?.verdict || 'ALLOWED_WITH_LIMITS')
  const [maxSimultaneousUnits, setMaxSimultaneousUnits] = useState(rule?.maxSimultaneousUnits?.toString() || '')
  const [minVerticalSeparationPx, setMinVerticalSeparationPx] = useState(rule?.minVerticalSeparationPx?.toString() || '')
  const [notes, setNotes] = useState(rule?.notes || '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError('')
    if (!rule && (!networkAId || !networkBId)) {
      setError('Both networks must be selected.')
      return
    }
    if (!rule && networkAId === networkBId) {
      setError('Cannot create a rule between a network and itself.')
      return
    }
    // Check for existing pair (in either direction) when creating new
    if (!rule) {
      const pairKey1 = `${networkAId}|${networkBId}`
      const pairKey2 = `${networkBId}|${networkAId}`
      if (existingPairs.includes(pairKey1) || existingPairs.includes(pairKey2)) {
        setError('A rule already exists between these two networks. Edit it instead.')
        return
      }
    }
    setLoading(true)
    const payload: any = {
      verdict,
      maxSimultaneousUnits: maxSimultaneousUnits ? parseInt(maxSimultaneousUnits, 10) : null,
      minVerticalSeparationPx: minVerticalSeparationPx ? parseInt(minVerticalSeparationPx, 10) : null,
      notes: notes.trim() || null,
    }
    if (!rule) {
      payload.networkAId = networkAId
      payload.networkBId = networkBId
    }
    const url = rule ? `/api/admin/compatibility/${rule.id}` : '/api/admin/compatibility'
    const method = rule ? 'PATCH' : 'POST'
    const res = await safeFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onSaved()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden" showCloseButton={false}>
        <GradientDialogHeader
          variant={rule ? 'gold' : 'evergreen'}
          icon={rule ? Edit3 : Plus}
          title={rule ? 'Edit compatibility rule' : 'New compatibility rule'}
          description={rule ? 'Update the verdict and limits for this network pair.' : 'Define whether two ad networks may render on the same Special Page.'}
          onClose={onClose}
        />
        <div className="p-6 space-y-4">
          {!rule && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Network A</Label>
                <Select value={networkAId} onValueChange={setNetworkAId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>
                    {networks.map(n => <SelectItem key={n.id} value={n.id}>{n.displayName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Network B</Label>
                <Select value={networkBId} onValueChange={setNetworkBId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Choose" /></SelectTrigger>
                  <SelectContent>
                    {networks.filter(n => n.id !== networkAId).map(n => <SelectItem key={n.id} value={n.id}>{n.displayName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {rule && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
              <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30 font-mono">{rule.networkA.code}</Badge>
              <span className="text-muted-foreground">×</span>
              <Badge variant="outline" className="bg-berry/5 text-berry border-berry/30 font-mono">{rule.networkB.code}</Badge>
            </div>
          )}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Verdict</Label>
            <div className="mt-2 flex gap-1.5">
              {(['ALLOWED', 'ALLOWED_WITH_LIMITS', 'FORBIDDEN'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVerdict(v)}
                  className={`flex-1 text-xs font-bold px-3 py-2 rounded-lg border transition-all ${
                    verdict === v ? VERDICT_COLORS[v] + ' ring-2 ring-offset-2 ring-current' : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
                  }`}
                >
                  {v.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          {verdict !== 'FORBIDDEN' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Max simultaneous units</Label>
                <Input
                  type="number"
                  value={maxSimultaneousUnits}
                  onChange={e => setMaxSimultaneousUnits(e.target.value)}
                  placeholder="e.g. 2"
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Min vertical separation (px)</Label>
                <Input
                  type="number"
                  value={minVerticalSeparationPx}
                  onChange={e => setMinVerticalSeparationPx(e.target.value)}
                  placeholder="e.g. 200"
                  className="mt-1 font-mono"
                />
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Notes (optional)</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Adsterra permits co-display with AdSense"
              className="mt-1"
            />
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
              {loading ? 'Saving…' : rule ? 'Save changes' : 'Create rule'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
