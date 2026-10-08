'use client'
//
// ProjectPreview — live visual preview for a Studio project.
//
// Each StudioProjectType has its own renderer that draws the actual visual
// output (gradient background, message overlay, countdown timer, quiz UI,
// poll bars, etc.). This is the source of truth for what a project *looks*
// like — used by both the editor (right pane) and the studio hub (project
// cards can render a small preview).
//
// The preview is fully interactive where it makes sense:
//   - Countdown ticks every second until the target date.
//   - Quiz lets you pick an option and reveal the correct answer.
//   - Poll lets you vote and animates the results bar.
//
// Pure — no API calls, no persistence. Just renders whatever `data` it gets.
//
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Clock, MapPin, Calendar, Check, X, Sparkles, Heart, Mail,
} from 'lucide-react'
import type { StudioProjectType } from '@prisma/client'

/* ──────────────────────────────────────────────────────────────────────────
   Gradient presets
   ──────────────────────────────────────────────────────────────────────────
   The AI provider returns backgroundImage keys like 'gradient-warm',
   'christmas-snow', etc. We map those to real CSS gradients here so the
   preview is beautiful out of the box. */
export const GRADIENT_PRESETS: Record<string, { label: string; css: string }> = {
  'gradient-warm':       { label: 'Warm Sunset',    css: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)' },
  'gradient-cool':       { label: 'Cool Evergreen', css: 'linear-gradient(135deg, #0F4C3A 0%, #1a8d6e 100%)' },
  'gradient-mountain':   { label: 'Mountain Mist',  css: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)' },
  'gradient-vibrant':    { label: 'Vibrant Purple', css: 'linear-gradient(135deg, #8e2de2 0%, #4a00e0 100%)' },
  'gradient-elegant':    { label: 'Elegant Night',  css: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' },
  'gradient-sunset':     { label: 'Soft Sunset',    css: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)' },
  'gradient-aurora':     { label: 'Aurora',         css: 'linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%)' },
  'gradient-royal':      { label: 'Royal Blue',     css: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)' },
  'gradient-gold':       { label: 'Earnova Gold',   css: 'linear-gradient(135deg, #D4A437 0%, #E8C547 100%)' },
  'gradient-berry':      { label: 'Berry',          css: 'linear-gradient(135deg, #8B2C5C 0%, #C0392B 100%)' },
  'gradient-cranberry':  { label: 'Cranberry',      css: 'linear-gradient(135deg, #C0392B 0%, #8B2C5C 100%)' },
  'gradient-sage':       { label: 'Sage Garden',    css: 'linear-gradient(135deg, #4a9cc4 0%, #5d8a66 100%)' },
  'christmas-snow':      { label: 'Christmas Snow', css: 'linear-gradient(135deg, #c41e3a 0%, #0F4C3A 100%)' },
  'birthday-balloons':   { label: 'Birthday Joy',   css: 'linear-gradient(135deg, #ff6b9d 0%, #c06c84 100%)' },
  'gradient-midnight':   { label: 'Midnight Sky',   css: 'linear-gradient(135deg, #232526 0%, #414345 100%)' },
}

/** Resolve a backgroundImage key (or fallback to first known preset). */
export function resolveGradient(key?: string): string {
  if (key && GRADIENT_PRESETS[key]) return GRADIENT_PRESETS[key].css
  // Unknown string treated as raw CSS gradient / color so users can paste their own.
  if (key && key.length > 0) return key
  return GRADIENT_PRESETS['gradient-cool'].css
}

/* ──────────────────────────────────────────────────────────────────────────
   ProjectPreview
   ────────────────────────────────────────────────────────────────────────── */
export type ProjectPreviewProps = {
  type: StudioProjectType
  data: Record<string, any>
  className?: string
  /** Compact = small thumbnail (used in project cards). Default = full. */
  compact?: boolean
}

export function ProjectPreview({
  type, data, className, compact = false,
}: ProjectPreviewProps) {
  switch (type) {
    case 'GREETING_CARD':
    case 'SOCIAL_CARD':
    case 'BIRTHDAY_WISH':
    case 'CHRISTMAS_WISH':
      return <GreetingCardPreview data={data} className={className} compact={compact} />
    case 'QUOTE':
      return <QuotePreview data={data} className={className} compact={compact} />
    case 'COUNTDOWN':
      return <CountdownPreview data={data} className={className} compact={compact} />
    case 'QUIZ':
      return <QuizPreview data={data} className={className} compact={compact} />
    case 'POLL':
      return <PollPreview data={data} className={className} compact={compact} />
    case 'POSTER':
    case 'ANNOUNCEMENT':
      return <PosterPreview data={data} className={className} compact={compact} />
    case 'INVITATION':
    case 'EVENT_PAGE':
      return <InvitationPreview data={data} className={className} compact={compact} />
    default:
      return (
        <div className={cn('flex items-center justify-center bg-muted/30 rounded-xl', className)}>
          <span className="text-xs text-muted-foreground">Unsupported type</span>
        </div>
      )
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   Shared typography helpers
   ────────────────────────────────────────────────────────────────────────── */
const FONT_SIZE_MAP: Record<string, string> = {
  small:  'text-sm md:text-base',
  medium: 'text-base md:text-lg',
  large:  'text-lg md:text-2xl',
  xlarge: 'text-xl md:text-3xl lg:text-4xl',
}

function fontSizeClass(size?: string): string {
  return FONT_SIZE_MAP[size || 'medium'] || FONT_SIZE_MAP.medium
}

/* ──────────────────────────────────────────────────────────────────────────
   GreetingCard preview
   ────────────────────────────────────────────────────────────────────────── */
function GreetingCardPreview({
  data, className, compact,
}: { data: Record<string, any>; className?: string; compact?: boolean }) {
  const recipient = (data.recipient as string) || ''
  const message = (data.message as string) || 'Your message will appear here…'
  const bg = resolveGradient(data.backgroundImage as string)
  const textColor = (data.textColor as string) || '#ffffff'
  const accentColor = (data.accentColor as string) || '#D4A437'
  const layout = (data.layout as string) || 'centered'
  const fs = fontSizeClass(data.fontSize as string)

  const isCentered = layout === 'centered' || layout === 'fullbleed'
  const isSplit = layout === 'split'
  const align = layout === 'left-align' ? 'text-left' : 'text-center'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl shadow-festive',
        compact ? 'aspect-[4/3]' : 'aspect-[4/5] sm:aspect-[3/2] min-h-[320px]',
        className,
      )}
      style={{ background: bg }}
    >
      {/* Decorative orbs for depth */}
      <div
        aria-hidden
        className="absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl opacity-40"
        style={{ background: accentColor }}
      />
      <div
        aria-hidden
        className="absolute -bottom-16 -left-12 h-48 w-48 rounded-full blur-3xl opacity-25"
        style={{ background: '#ffffff' }}
      />

      {isSplit ? (
        <div className="relative z-[1] grid h-full sm:grid-cols-2">
          <div className="hidden sm:block bg-black/20 backdrop-blur-[1px]" />
          <div className="flex flex-col justify-center p-6 sm:p-10">
            <ContentBody
              recipient={recipient} message={message} align="text-left"
              textColor={textColor} accentColor={accentColor} fs={fs}
              compact={compact}
            />
          </div>
        </div>
      ) : (
        <div className={cn(
          'relative z-[1] flex h-full flex-col justify-center',
          align === 'text-left' ? 'items-start text-left p-6 sm:p-10' : 'items-center text-center p-6 sm:p-10',
        )}>
          <ContentBody
            recipient={recipient} message={message} align={align}
            textColor={textColor} accentColor={accentColor} fs={fs}
            compact={compact}
          />
        </div>
      )}
    </div>
  )
}

function ContentBody({
  recipient, message, align, textColor, accentColor, fs, compact,
}: {
  recipient: string
  message: string
  align: string
  textColor: string
  accentColor: string
  fs: string
  compact?: boolean
}) {
  return (
    <div className={cn('max-w-prose', align === 'text-left' ? '' : 'mx-auto')}>
      {recipient && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={cn('font-serif font-semibold tracking-wide drop-shadow', compact ? 'text-sm' : 'text-base md:text-lg')}
          style={{ color: accentColor }}
        >
          Dear {recipient},
        </motion.p>
      )}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={cn('font-serif leading-relaxed drop-shadow-md whitespace-pre-wrap', fs, compact && 'line-clamp-4')}
        style={{ color: textColor }}
      >
        {message}
      </motion.p>
      {!compact && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className={cn('mt-4 h-1 rounded-full', align === 'text-left' ? 'w-20' : 'mx-auto w-24')}
          style={{ background: accentColor }}
        />
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Quote preview
   ────────────────────────────────────────────────────────────────────────── */
function QuotePreview({
  data, className, compact,
}: { data: Record<string, any>; className?: string; compact?: boolean }) {
  const text = (data.text as string) || 'Your inspiring quote will appear here…'
  const author = (data.author as string) || 'Unknown'
  const bg = resolveGradient(data.backgroundImage as string)
  const textColor = (data.textColor as string) || '#ffffff'
  const fs = fontSizeClass(data.fontSize as string)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl shadow-festive flex flex-col items-center justify-center p-6 sm:p-12 text-center',
        compact ? 'aspect-[4/3]' : 'aspect-[4/5] sm:aspect-square min-h-[320px]',
        className,
      )}
      style={{ background: bg }}
    >
      <div aria-hidden className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
      <div aria-hidden className="absolute -bottom-12 -right-8 h-40 w-40 rounded-full bg-black/15 blur-3xl" />

      <div className="relative z-[1] max-w-prose">
        <div className="text-6xl md:text-7xl font-serif leading-none mb-2 opacity-30" style={{ color: textColor }}>
          &ldquo;
        </div>
        <motion.blockquote
          key={text}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={cn('font-serif italic leading-snug drop-shadow-md', fs, compact && 'line-clamp-4')}
          style={{ color: textColor }}
        >
          {text}
        </motion.blockquote>
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="mx-auto mt-5 h-px w-16 bg-current opacity-50"
          style={{ color: textColor }}
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className={cn('mt-3 font-semibold tracking-wide uppercase', compact ? 'text-[10px]' : 'text-xs md:text-sm')}
          style={{ color: textColor }}
        >
          — {author}
        </motion.p>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Countdown preview — live ticking
   ────────────────────────────────────────────────────────────────────────── */
function useCountdown(targetDate?: string) {
  const [remaining, setRemaining] = useState(() => calcRemaining(targetDate))
  // "Adjust state during render" pattern: if targetDate changes, recompute
  // remaining immediately (without waiting for the next interval tick) by
  // calling setState during render — React will re-render synchronously.
  const [trackedTarget, setTrackedTarget] = useState(targetDate)
  if (trackedTarget !== targetDate) {
    setTrackedTarget(targetDate)
    setRemaining(calcRemaining(targetDate))
  }
  useEffect(() => {
    const t = setInterval(() => setRemaining(calcRemaining(targetDate)), 1000)
    return () => clearInterval(t)
  }, [targetDate])
  return remaining
}

function calcRemaining(targetDate?: string): { d: number; h: number; m: number; s: number; done: boolean } {
  if (!targetDate) return { d: 0, h: 0, m: 0, s: 0, done: false }
  const target = new Date(targetDate).getTime()
  if (Number.isNaN(target)) return { d: 0, h: 0, m: 0, s: 0, done: false }
  const diff = target - Date.now()
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true }
  const d = Math.floor(diff / (1000 * 60 * 60 * 24))
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const m = Math.floor((diff / (1000 * 60)) % 60)
  const s = Math.floor((diff / 1000) % 60)
  return { d, h, m, s, done: false }
}

function CountdownPreview({
  data, className, compact,
}: { data: Record<string, any>; className?: string; compact?: boolean }) {
  const target = data.targetDate as string
  const title = (data.title as string) || 'Countdown'
  const subtitle = (data.subtitle as string) || ''
  const r = useCountdown(target)
  const showDays = data.showDays !== false
  const showHours = data.showHours !== false
  const showMinutes = data.showMinutes !== false
  const showSeconds = data.showSeconds !== false

  const units: Array<{ label: string; value: number; show: boolean }> = [
    { label: 'Days', value: r.d, show: showDays },
    { label: 'Hours', value: r.h, show: showHours },
    { label: 'Minutes', value: r.m, show: showMinutes },
    { label: 'Seconds', value: r.s, show: showSeconds },
  ]
  const visible = units.filter(u => u.show)

  const styleKey = (data.style as string) || 'gradient'
  const bg = styleKey === 'minimal'
    ? 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)'
    : styleKey === 'dark'
      ? 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)'
      : styleKey === 'neon'
        ? 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)'
        : styleKey === 'festive'
          ? 'linear-gradient(135deg, #c41e3a 0%, #0F4C3A 100%)'
          : 'linear-gradient(135deg, #0F4C3A 0%, #D4A437 100%)'

  const isDark = styleKey !== 'minimal'
  const text = isDark ? '#FBF8F2' : '#1a1a1a'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl shadow-festive flex flex-col items-center justify-center p-6 sm:p-10 text-center',
        compact ? 'aspect-[4/3]' : 'aspect-[4/5] sm:aspect-[3/2] min-h-[320px]',
        className,
      )}
      style={{ background: bg, color: text }}
    >
      <div aria-hidden className="absolute -top-8 -right-8 h-32 w-32 rounded-full blur-3xl opacity-30" style={{ background: '#D4A437' }} />

      <div className="relative z-[1] w-full">
        <motion.h3
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('font-serif font-bold drop-shadow-sm', compact ? 'text-base' : 'text-2xl md:text-3xl')}
        >
          {title}
        </motion.h3>
        {subtitle && !compact && (
          <p className="mt-1 text-xs md:text-sm opacity-80">{subtitle}</p>
        )}

        {r.done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 bg-gold/20 text-gold-light font-semibold"
          >
            <Sparkles className="h-4 w-4" /> It&apos;s here!
          </motion.div>
        ) : (
          <div className={cn('mt-6 grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
            {visible.map((u, i) => (
              <motion.div
                key={u.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 180 }}
                className="rounded-xl bg-white/10 backdrop-blur-md ring-1 ring-white/20 px-3 py-3 md:px-4 md:py-4 min-w-[68px]"
              >
                <div className={cn('font-serif font-bold tabular-nums leading-none', compact ? 'text-xl' : 'text-3xl md:text-5xl')}>
                  {String(u.value).padStart(2, '0')}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider opacity-70">{u.label}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Quiz preview — interactive
   ────────────────────────────────────────────────────────────────────────── */
type QuizQuestion = {
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
}

function QuizPreview({
  data, className, compact,
}: { data: Record<string, any>; className?: string; compact?: boolean }) {
  const title = (data.title as string) || 'Quiz'
  const description = (data.description as string) || ''
  const questions: QuizQuestion[] = Array.isArray(data.questions) ? data.questions : []
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [revealed, setRevealed] = useState<Record<number, boolean>>({})

  if (compact) {
    return (
      <div className={cn('rounded-2xl p-5 bg-gradient-to-br from-evergreen/10 via-background to-gold/5 border border-evergreen/20', className)}>
        <div className="text-2xl mb-1">🧠</div>
        <p className="font-serif font-bold">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{questions.length} questions · interactive</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-2xl border border-evergreen/20 bg-card p-5 sm:p-6 space-y-5', className)}>
      <div className="border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🧠</span>
          <h3 className="font-serif text-lg font-bold">{title}</h3>
        </div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>

      {questions.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No questions yet. Add some in the editor.</p>
      )}

      {questions.map((q, qi) => {
        const sel = answers[qi]
        const isRevealed = revealed[qi]
        return (
          <div key={qi} className="rounded-xl bg-muted/30 p-4">
            <p className="font-medium text-sm mb-3">
              <span className="text-evergreen font-semibold">Q{qi + 1}.</span> {q.question}
            </p>
            <div className="grid gap-2">
              {q.options.map((opt, oi) => {
                const isSelected = sel === oi
                const isCorrect = q.correctIndex === oi
                const showState = isRevealed && (isCorrect || isSelected)
                return (
                  <button
                    key={oi}
                    type="button"
                    disabled={isRevealed}
                    onClick={() => setAnswers(prev => ({ ...prev, [qi]: oi }))}
                    className={cn(
                      'flex items-center justify-between text-left text-sm rounded-lg border px-3 py-2 transition-all',
                      isRevealed && isCorrect && 'border-evergreen bg-evergreen/10',
                      isRevealed && isSelected && !isCorrect && 'border-destructive bg-destructive/10',
                      !isRevealed && isSelected && 'border-evergreen bg-evergreen/5',
                      !isRevealed && !isSelected && 'border-border hover:border-evergreen/50 hover:bg-evergreen/5',
                      isRevealed && !isCorrect && !isSelected && 'border-border opacity-60',
                    )}
                  >
                    <span>{opt}</span>
                    {showState && (
                      isCorrect
                        ? <Check className="h-4 w-4 text-evergreen" />
                        : <X className="h-4 w-4 text-destructive" />
                    )}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex items-center justify-between">
              {!isRevealed ? (
                <button
                  type="button"
                  onClick={() => setRevealed(prev => ({ ...prev, [qi]: true }))}
                  disabled={sel === undefined}
                  className="text-xs font-semibold px-3 py-1.5 rounded-md bg-evergreen/10 text-evergreen hover:bg-evergreen/20 disabled:opacity-40"
                >
                  Reveal answer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRevealed(prev => ({ ...prev, [qi]: false }))
                    setAnswers(prev => { const n = { ...prev }; delete n[qi]; return n })
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-md bg-muted text-muted-foreground hover:bg-muted/60"
                >
                  Reset
                </button>
              )}
              {isRevealed && q.explanation && (
                <p className="text-xs italic text-muted-foreground max-w-[60%] text-right">
                  {q.explanation}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Poll preview — interactive with bar chart
   ────────────────────────────────────────────────────────────────────────── */
type PollOption = { text: string; votes: number }

function PollPreview({
  data, className, compact,
}: { data: Record<string, any>; className?: string; compact?: boolean }) {
  const question = (data.question as string) || 'Your poll question?'
  const baseOptions: PollOption[] = Array.isArray(data.options)
    ? data.options.map((o: any) => ({ text: String(o.text ?? ''), votes: Number(o.votes ?? 0) }))
    : []
  const allowMultiple = data.allowMultiple === true

  const [votes, setVotes] = useState<number[]>(() => baseOptions.map(o => o.votes))
  const [chosen, setChosen] = useState<Set<number>>(new Set())

  // Keep votes state in sync if the data changes (e.g. AI regenerate).
  // "Adjust state during render" pattern: derive a tracking key from the
  // option texts, reset votes + chosen if the key changes.
  const optionKey = JSON.stringify(baseOptions.map(o => o.text))
  const [trackedKey, setTrackedKey] = useState(optionKey)
  if (trackedKey !== optionKey) {
    setTrackedKey(optionKey)
    setVotes(baseOptions.map(o => o.votes))
    setChosen(new Set())
  }

  const total = votes.reduce((a, b) => a + b, 0)

  function toggle(idx: number) {
    setChosen(prev => {
      const next = new Set(prev)
      if (next.has(idx)) {
        next.delete(idx)
        setVotes(v => v.map((c, i) => (i === idx ? Math.max(0, c - 1) : c)))
      } else {
        if (!allowMultiple) {
          // Remove previous vote.
          next.forEach(i => {
            setVotes(v => v.map((c, j) => (j === i ? Math.max(0, c - 1) : c)))
          })
          next.clear()
        }
        next.add(idx)
        setVotes(v => v.map((c, i) => (i === idx ? c + 1 : c)))
      }
      return next
    })
  }

  if (compact) {
    return (
      <div className={cn('rounded-2xl p-5 bg-gradient-to-br from-gold/10 via-background to-berry/5 border border-gold/20', className)}>
        <div className="text-2xl mb-1">📊</div>
        <p className="font-serif font-bold line-clamp-2">{question}</p>
        <p className="text-xs text-muted-foreground mt-1">{baseOptions.length} options · {total} votes</p>
      </div>
    )
  }

  return (
    <div className={cn('rounded-2xl border border-gold/20 bg-card p-5 sm:p-6 space-y-4', className)}>
      <div className="border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">📊</span>
          <h3 className="font-serif text-lg font-bold">{question}</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {allowMultiple ? 'Pick all that apply' : 'Pick one'} · {total} vote{total === 1 ? '' : 's'}
        </p>
      </div>

      <div className="space-y-2">
        {baseOptions.map((opt, idx) => {
          const pct = total > 0 ? Math.round((votes[idx] / total) * 100) : 0
          const isChosen = chosen.has(idx)
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggle(idx)}
              className={cn(
                'relative w-full text-left rounded-lg border px-3 py-2.5 overflow-hidden transition-all',
                isChosen ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/50 hover:bg-gold/5',
              )}
            >
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold/30 to-gold/10 transition-all"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between text-sm">
                <span className="font-medium truncate">{opt.text}</span>
                <span className="ml-2 tabular-nums text-muted-foreground">{pct}%</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Poster preview
   ────────────────────────────────────────────────────────────────────────── */
function PosterPreview({
  data, className, compact,
}: { data: Record<string, any>; className?: string; compact?: boolean }) {
  const title = (data.title as string) || 'Your Title'
  const subtitle = (data.subtitle as string) || ''
  const description = (data.description as string) || ''
  const bg = resolveGradient(data.backgroundImage as string)
  const textColor = (data.textColor as string) || '#ffffff'
  const accentColor = (data.accentColor as string) || '#D4A437'
  const layout = (data.layout as string) || 'centered'

  const isTop = layout === 'top-heavy'
  const isBottom = layout === 'bottom-heavy'
  const justify = isTop ? 'justify-start' : isBottom ? 'justify-end' : 'justify-center'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl shadow-festive flex flex-col p-6 sm:p-10',
        compact ? 'aspect-[4/3]' : 'aspect-[3/4] sm:aspect-[4/5] min-h-[360px]',
        justify,
        className,
      )}
      style={{ background: bg, color: textColor }}
    >
      <div aria-hidden className="absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl opacity-40" style={{ background: accentColor }} />
      <div aria-hidden className="absolute -bottom-16 -left-12 h-48 w-48 rounded-full blur-3xl opacity-25 bg-white" />

      <div className="relative z-[1] max-w-prose">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: 60 }}
          transition={{ duration: 0.4 }}
          className="h-1 rounded-full mb-4"
          style={{ background: accentColor }}
        />
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={cn('font-serif font-bold leading-tight drop-shadow-md', compact ? 'text-lg' : 'text-3xl md:text-5xl')}
        >
          {title}
        </motion.h2>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className={cn('mt-2 font-semibold tracking-wide', compact ? 'text-xs' : 'text-sm md:text-lg')}
            style={{ color: accentColor }}
          >
            {subtitle}
          </motion.p>
        )}
        {description && !compact && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-4 text-sm md:text-base opacity-90 leading-relaxed line-clamp-6"
          >
            {description}
          </motion.p>
        )}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Invitation preview
   ────────────────────────────────────────────────────────────────────────── */
function InvitationPreview({
  data, className, compact,
}: { data: Record<string, any>; className?: string; compact?: boolean }) {
  const title = (data.title as string) || "You're Invited!"
  const subtitle = (data.subtitle as string) || ''
  const eventDate = (data.eventDate as string) || ''
  const location = (data.location as string) || ''
  const description = (data.description as string) || ''
  const bg = resolveGradient(data.backgroundImage as string)
  const textColor = (data.textColor as string) || '#ffffff'
  const accentColor = (data.accentColor as string) || '#D4A437'
  const rsvpEnabled = data.rsvpEnabled === true

  const dateObj = eventDate ? new Date(eventDate) : null
  const dateValid = dateObj && !Number.isNaN(dateObj.getTime())

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl shadow-festive flex flex-col items-center text-center p-6 sm:p-10',
        compact ? 'aspect-[4/3]' : 'aspect-[4/5] sm:aspect-[3/4] min-h-[360px]',
        className,
      )}
      style={{ background: bg, color: textColor }}
    >
      <div aria-hidden className="absolute -top-10 -left-10 h-32 w-32 rounded-full blur-3xl opacity-30" style={{ background: accentColor }} />
      <div aria-hidden className="absolute -bottom-12 -right-8 h-40 w-40 rounded-full blur-3xl opacity-25 bg-white" />

      <div className="relative z-[1] flex flex-col items-center w-full max-w-md">
        <Mail className={cn('mb-3 opacity-80', compact ? 'h-5 w-5' : 'h-7 w-7')} style={{ color: accentColor }} />
        <motion.p
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('uppercase tracking-[0.2em]', compact ? 'text-[10px]' : 'text-xs')}
          style={{ color: accentColor }}
        >
          {subtitle || 'You\'re cordially invited'}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className={cn('mt-2 font-serif font-bold leading-tight drop-shadow-md', compact ? 'text-xl' : 'text-3xl md:text-5xl')}
        >
          {title}
        </motion.h2>

        {!compact && (
          <>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-4 h-px w-24"
              style={{ background: accentColor }}
            />

            {dateValid && (
              <div className="mt-5 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-sm md:text-base">
                  <Calendar className="h-4 w-4" style={{ color: accentColor }} />
                  <span>
                    {dateObj!.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm md:text-base">
                  <Clock className="h-4 w-4" style={{ color: accentColor }} />
                  <span>
                    {dateObj!.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
                {location && (
                  <div className="flex items-center gap-2 text-sm md:text-base">
                    <MapPin className="h-4 w-4" style={{ color: accentColor }} />
                    <span>{location}</span>
                  </div>
                )}
              </div>
            )}

            {description && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-5 text-xs md:text-sm opacity-90 leading-relaxed line-clamp-4"
              >
                {description}
              </motion.p>
            )}

            {rsvpEnabled && (
              <AnimatePresence>
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-md"
                  style={{ background: accentColor, color: '#1a1a1a' }}
                >
                  <Heart className="h-4 w-4" /> RSVP
                </motion.button>
              </AnimatePresence>
            )}
          </>
        )}

        {compact && dateValid && (
          <p className="mt-3 text-xs opacity-80">
            {dateObj!.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            {location ? ` · ${location}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}

export default ProjectPreview
