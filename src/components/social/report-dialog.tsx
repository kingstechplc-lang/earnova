'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog, DialogContent, DialogFooter,
} from '@/components/ui/dialog'
import { GradientDialogHeader } from '@/components/animated/gradient-dialog-header'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { safeFetch } from '@/lib/safe-fetch'
import { toast } from '@/hooks/use-toast'
import {
  Flag, AlertTriangle, Ban, Bug, UserX, Copy, ShieldAlert, Scale, Skull,
  Swords, Megaphone, HelpCircle, CheckCircle2, Loader2, ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * ReportDialog — a reusable modal for filing a Report against any entity.
 *
 * Use it from profiles, pages, posts, comments:
 *   <ReportDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     entityType="USER"
 *     entityId={profile.id}
 *     entityName="Kingsley's profile"
 *   />
 *
 * Behavior:
 *   - Shows 12 report reason options as radio-button cards with icons + descriptions
 *   - Optional description textarea (≤ 1000 chars) for additional context
 *   - Submit → POST /api/reports → success state with thank-you message
 *   - If the user has already reported this entity, the API returns
 *     `alreadyReported: true` and we show the success state with a different copy
 *   - If the visitor is not logged in, the dialog prompts them to log in first
 */
export type ReportEntity = 'USER' | 'PAGE' | 'POST' | 'COMMENT' | 'LINK' | 'AD'

type ReasonConfig = {
  value: string
  label: string
  description: string
  icon: LucideIcon
  accent: 'evergreen' | 'gold' | 'berry' | 'cranberry'
}

const REASONS: ReasonConfig[] = [
  { value: 'SPAM',                label: 'Spam',                description: 'Repetitive, unsolicited, or low-effort promotional content.', icon: Megaphone,      accent: 'gold' },
  { value: 'SCAM',                 label: 'Scam or fraud',      description: 'Attempts to deceive users for money, credentials, or assets.', icon: AlertTriangle, accent: 'cranberry' },
  { value: 'MALWARE',              label: 'Malware or harmful code', description: 'Links or files that install malware, spyware, or viruses.', icon: Bug,             accent: 'cranberry' },
  { value: 'HARASSMENT',           label: 'Harassment or bullying', description: 'Targeted attacks, threats, or intimidation toward a person.', icon: UserX,         accent: 'berry' },
  { value: 'IMPERSONATION',        label: 'Impersonation',      description: 'Pretending to be someone else (a person, brand, or creator).', icon: ShieldAlert, accent: 'berry' },
  { value: 'COPYRIGHT',            label: 'Copyright violation', description: 'Uses copyrighted material without permission.', icon: Scale,         accent: 'gold' },
  { value: 'ADULT_CONTENT',        label: 'Adult content',      description: 'Sexually explicit material not appropriate for general audiences.', icon: Ban,       accent: 'berry' },
  { value: 'ILLEGAL_ACTIVITY',     label: 'Illegal activity',   description: 'Promotes or facilitates illegal acts.', icon: Skull,            accent: 'cranberry' },
  { value: 'HATEFUL_CONTENT',      label: 'Hate speech',        description: 'Attacks people based on protected characteristics.', icon: ShieldAlert, accent: 'cranberry' },
  { value: 'VIOLENCE',             label: 'Violence or harm',   description: 'Threats, incitement, or graphic depictions of violence.', icon: Swords,        accent: 'cranberry' },
  { value: 'MISLEADING_CONTENT',   label: 'Misleading content', description: 'False claims, deceptive titles, or manipulated media.', icon: AlertTriangle, accent: 'gold' },
  { value: 'OTHER',                label: 'Something else',    description: 'Doesn\'t fit any of the above — explain in the description.', icon: HelpCircle,   accent: 'evergreen' },
]

const ACCENT_CLASSES: Record<ReasonConfig['accent'], { ring: string; bg: string; text: string; border: string }> = {
  evergreen: { ring: 'ring-evergreen/60', bg: 'bg-evergreen/8', text: 'text-evergreen', border: 'border-evergreen/50' },
  gold:      { ring: 'ring-gold/60',      bg: 'bg-gold/12',     text: 'text-gold-dark', border: 'border-gold/50' },
  berry:     { ring: 'ring-berry/60',     bg: 'bg-berry/10',    text: 'text-berry', border: 'border-berry/50' },
  cranberry: { ring: 'ring-cranberry/60',  bg: 'bg-cranberry/10', text: 'text-cranberry', border: 'border-cranberry/50' },
}

const MAX_DESCRIPTION = 1000

export function ReportDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  onLoginRedirect,
  currentUser,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  entityType: ReportEntity
  entityId: string
  entityName: string
  /** If visitor is logged-out, this callback navigates them to login. */
  onLoginRedirect?: () => void
  /** Optional: when the parent already knows the current user (profile/post view),
   *  it can pass it in. If null, the dialog prompts login. */
  currentUser?: { id: string } | null
}) {
  const [reason, setReason] = useState<string>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [alreadyReported, setAlreadyReported] = useState(false)
  const [error, setError] = useState('')

  // Reset internal state whenever the dialog is (re)opened or the target
  // entity changes. Using the React "adjust state during render" pattern
  // (per the React docs) avoids the set-state-in-effect lint rule and is
  // the canonical way to mirror a prop into local state.
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [lastOpen, setLastOpen] = useState(open)
  const [lastEntityKey, setLastEntityKey] = useState(`${entityType}:${entityId}`)
  const entityKey = `${entityType}:${entityId}`
  if (open !== lastOpen || entityKey !== lastEntityKey) {
    setLastOpen(open)
    setLastEntityKey(entityKey)
    if (open) {
      // Reset to a fresh form whenever the dialog opens or the target changes.
      setReason('')
      setDescription('')
      setSubmitting(false)
      setDone(false)
      setAlreadyReported(false)
      setError('')
    }
  }

  async function submit() {
    if (!reason) {
      setError('Please pick a reason for your report.')
      return
    }
    // If we know the current user is null, prompt login instead of trying to
    // POST (the API would 401 anyway, but a smoother UX is to send the user
    // to the login view directly).
    if (currentUser === null) {
      onLoginRedirect?.()
      return
    }

    setSubmitting(true)
    setError('')
    const res = await safeFetch<{ report?: any; alreadyReported?: boolean; error?: string }>(
      '/api/reports',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          reason,
          description: description.trim() || undefined,
        }),
      }
    )
    setSubmitting(false)

    if (res.error) {
      setError(res.error)
      return
    }
    if (res.data?.alreadyReported) {
      setAlreadyReported(true)
    }
    setDone(true)
    toast({
      title: 'Report submitted',
      description: 'Thank you for helping keep Earnova safe.',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <GradientDialogHeader
          variant="cranberry"
          icon={Flag}
          title="Report this content"
          description={entityName ? `You're reporting: ${entityName}` : 'Help us review content that violates our policies.'}
        />

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 space-y-4">
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="py-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 220, delay: 0.1 }}
                  className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-evergreen/12 text-evergreen mb-3 shadow-festive"
                >
                  <CheckCircle2 className="h-7 w-7" />
                </motion.div>
                <h3 className="font-serif text-lg font-bold mb-1">Report submitted</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {alreadyReported
                    ? 'You had already reported this. Our trust & safety team will review it alongside your previous report.'
                    : 'Thank you for helping keep Earnova safe. Our trust & safety team will review it shortly.'}
                </p>
              </motion.div>
            ) : currentUser === null ? (
              <motion.div
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 220 }}
                  className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold-dark mb-3"
                >
                  <ShieldCheck className="h-7 w-7" />
                </motion.div>
                <h3 className="font-serif text-lg font-bold mb-1">Log in to report</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                  You need to be logged in to file a report. This helps us prevent abuse and follow up with you if we need more details.
                </p>
                <Button
                  onClick={() => onLoginRedirect?.()}
                  className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
                >
                  Log in to continue
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Reason selection */}
                <div>
                  <Label className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Reason <span className="text-cranberry">*</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {REASONS.map(r => {
                      const isSelected = reason === r.value
                      const a = ACCENT_CLASSES[r.accent]
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => { setReason(r.value); setError('') }}
                          className={`text-left rounded-lg border p-2.5 transition-all hover:-translate-y-0.5 ${
                            isSelected
                              ? `${a.bg} ${a.border} ${a.text} ring-2 ${a.ring} shadow-sm`
                              : 'bg-card/60 border-border/60 hover:border-border hover:bg-card'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${a.bg} ${a.text} flex-shrink-0`}>
                              <r.icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-tight">{r.label}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{r.description}</p>
                            </div>
                            <span
                              className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-full border-2 transition-all ${
                                isSelected
                                  ? `${a.border.replace('border-', 'bg-')} ${a.text.replace('text-', 'border-')}`
                                  : 'border-muted-foreground/40'
                              }`}
                              aria-hidden
                            />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Optional description */}
                <div>
                  <Label htmlFor="report-description" className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                    Additional details <span className="text-muted-foreground/60">(optional)</span>
                  </Label>
                  <Textarea
                    id="report-description"
                    value={description}
                    onChange={e => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
                    placeholder="Provide any additional context that will help our team review this report…"
                    className="min-h-[100px] resize-y"
                  />
                  <div className="flex justify-end mt-1">
                    <span className={`text-[10px] tabular-nums ${description.length > MAX_DESCRIPTION - 50 ? 'text-cranberry' : 'text-muted-foreground/60'}`}>
                      {description.length}/{MAX_DESCRIPTION}
                    </span>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="border-cranberry/40 bg-cranberry/5">
                    <AlertTriangle className="h-4 w-4 text-cranberry" />
                    <AlertDescription className="text-cranberry">{error}</AlertDescription>
                  </Alert>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="p-4 pt-3 border-t border-border/60 flex-shrink-0">
          {!done && currentUser !== null && (
            <>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={submit}
                disabled={submitting || !reason}
                className="bg-cranberry text-cream hover:bg-cranberry/90 btn-glow overflow-hidden"
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Flag className="h-4 w-4 mr-1" />}
                {submitting ? 'Submitting…' : 'Submit report'}
              </Button>
            </>
          )}
          {done && (
            <Button size="sm" onClick={() => onOpenChange(false)} className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
