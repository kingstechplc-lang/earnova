'use client'
//
// StudioProjectEditor — main studio editor component.
//
// Two modes:
//   1. Type picker (when no project is selected) — 12 beautiful tiles.
//   2. Split-pane editor — left = type-specific form, right = live preview.
//
// Features:
//   - AI generate section at top (prompt + context + Generate button).
//   - Real-time live preview that updates as the user types.
//   - Save + Save & Publish buttons.
//   - Confetti on publish.
//
// All API calls go through safeFetch. All animations use Framer Motion.
//
import { motion, AnimatePresence } from 'framer-motion'
import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  FadeIn, StaggerContainer, StaggerItem,
} from '@/components/animated/motion'
import { TiltCard } from '@/components/animated/tilt-card'
import { useConfetti } from '@/components/animated/confetti'
import { safeFetch } from '@/lib/safe-fetch'
import { toast } from '@/hooks/use-toast'
import {
  ProjectPreview, GRADIENT_PRESETS,
} from '@/components/studio/project-preview'
import { cn } from '@/lib/utils'
import {
  Wand2, Sparkles, Save, Globe, ChevronLeft, Plus, Trash2,
  ArrowUp, ArrowDown, Loader2, Palette, Type, Calendar, ListChecks,
  BarChart3, Mail, Send, X, Check,
} from 'lucide-react'
import type { StudioProjectType } from '@prisma/client'

/* ──────────────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────────────── */
export type StudioProject = {
  id: string
  type: StudioProjectType
  title: string
  data: Record<string, any>
  isPublished?: boolean
  aiGenerated?: boolean
  aiPrompt?: string | null
  pageId?: string | null
  createdAt?: string
  updatedAt?: string
}

type StudioTile = {
  type: StudioProjectType
  icon: string
  label: string
  description: string
  accent: 'evergreen' | 'gold' | 'berry' | 'cranberry' | 'sage'
}

const STUDIO_TILES: StudioTile[] = [
  { type: 'GREETING_CARD',  icon: '🎴', label: 'Greeting Card',  description: 'Personalized card for any occasion.',         accent: 'evergreen' },
  { type: 'SOCIAL_CARD',    icon: '🎉', label: 'Social Card',    description: 'Share a beautiful social post.',               accent: 'gold' },
  { type: 'BIRTHDAY_WISH',  icon: '🎂', label: 'Birthday Wish',  description: 'Heartfelt birthday greeting.',                accent: 'berry' },
  { type: 'CHRISTMAS_WISH', icon: '🎄', label: 'Christmas Wish', description: 'Festive holiday cheer.',                       accent: 'evergreen' },
  { type: 'QUOTE',          icon: '💬', label: 'Quote',          description: 'Inspiring quote on a beautiful backdrop.',     accent: 'gold' },
  { type: 'POSTER',         icon: '📰', label: 'Poster',          description: 'Visual poster to announce.',                  accent: 'berry' },
  { type: 'ANNOUNCEMENT',   icon: '📢', label: 'Announcement',   description: 'Clear, attention-grabbing notice.',            accent: 'cranberry' },
  { type: 'QUIZ',           icon: '🧠', label: 'Quiz',            description: 'Interactive quiz for engagement.',            accent: 'sage' },
  { type: 'POLL',           icon: '📊', label: 'Poll',            description: 'Ask + visualize audience opinions.',          accent: 'gold' },
  { type: 'COUNTDOWN',      icon: '⏰', label: 'Countdown',      description: 'Live ticking countdown to a moment.',         accent: 'cranberry' },
  { type: 'INVITATION',     icon: '💌', label: 'Invitation',     description: 'Elegant invite for an event.',                 accent: 'berry' },
  { type: 'EVENT_PAGE',     icon: '📅', label: 'Event Page',     description: 'Event details with RSVP.',                     accent: 'evergreen' },
]

const ACCENT_CLASSES: Record<StudioTile['accent'], { ring: string; bg: string; gradient: string; text: string }> = {
  evergreen: { ring: 'border-evergreen/30', bg: 'bg-evergreen/10', gradient: 'from-evergreen-dark via-evergreen to-evergreen-light', text: 'text-evergreen' },
  gold:      { ring: 'border-gold/30',      bg: 'bg-gold/10',      gradient: 'from-gold-dark via-gold to-gold-light',             text: 'text-gold-dark' },
  berry:     { ring: 'border-berry/30',     bg: 'bg-berry/10',     gradient: 'from-berry via-berry/85 to-berry/60',               text: 'text-berry' },
  cranberry: { ring: 'border-cranberry/30', bg: 'bg-cranberry/10', gradient: 'from-cranberry via-cranberry/85 to-berry/80',        text: 'text-cranberry' },
  sage:      { ring: 'border-sage/30',      bg: 'bg-sage/10',      gradient: 'from-evergreen via-sage to-evergreen-light',         text: 'text-sage' },
}

const FONT_SIZES = [
  { value: 'small',  label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large',  label: 'Large' },
  { value: 'xlarge', label: 'X-Large' },
]

const LAYOUTS = [
  { value: 'centered',   label: 'Centered' },
  { value: 'left-align', label: 'Left' },
  { value: 'split',      label: 'Split' },
  { value: 'fullbleed',  label: 'Full' },
]

const POSTER_LAYOUTS = [
  { value: 'centered',   label: 'Centered' },
  { value: 'top-heavy',  label: 'Top' },
  { value: 'bottom-heavy', label: 'Bottom' },
  { value: 'split',      label: 'Split' },
]

const STYLE_OPTIONS = [
  'classic', 'modern', 'festive', 'minimal', 'vibrant',
  'elegant', 'bold', 'dark', 'gradient', 'neon', 'retro',
]

/* ──────────────────────────────────────────────────────────────────────────
   Default data per type — used when creating a new project.
   ────────────────────────────────────────────────────────────────────────── */
function defaultDataFor(type: StudioProjectType): Record<string, any> {
  switch (type) {
    case 'GREETING_CARD':
    case 'SOCIAL_CARD':
    case 'BIRTHDAY_WISH':
    case 'CHRISTMAS_WISH':
      return {
        recipient: '', message: 'Write your message here…',
        backgroundImage: 'gradient-warm', layout: 'centered', style: 'modern',
        fontSize: 'large', textColor: '#ffffff', accentColor: '#D4A437',
      }
    case 'QUOTE':
      return {
        text: 'The best way to predict the future is to create it.',
        author: 'Peter Drucker', style: 'minimal',
        backgroundImage: 'gradient-mountain', fontSize: 'xlarge', textColor: '#ffffff',
      }
    case 'POSTER':
    case 'ANNOUNCEMENT':
      return {
        title: 'Your Big Title', subtitle: 'A compelling subtitle',
        description: 'Add your description here. Tell people what to expect.',
        backgroundImage: 'gradient-vibrant', layout: 'centered', style: 'modern',
        accentColor: '#D4A437', textColor: '#ffffff',
      }
    case 'QUIZ':
      return {
        title: 'Knowledge Quiz', description: 'Test your knowledge!',
        questions: [{
          question: 'Sample question?', options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex: 0, explanation: 'Brief explanation.',
        }],
        style: 'interactive',
      }
    case 'POLL':
      return {
        question: 'What would you like to know?',
        options: [{ text: 'Option A', votes: 0 }, { text: 'Option B', votes: 0 }, { text: 'Option C', votes: 0 }],
        style: 'bar', allowMultiple: false,
      }
    case 'COUNTDOWN':
      return {
        targetDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        title: 'Something Big Is Coming', subtitle: 'Stay tuned!',
        style: 'gradient', showDays: true, showHours: true, showMinutes: true, showSeconds: true,
      }
    case 'INVITATION':
    case 'EVENT_PAGE':
      return {
        title: "You're Invited!", subtitle: 'Join us for a special occasion',
        eventDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        location: 'Location TBD', description: 'We would be delighted to have you.',
        backgroundImage: 'gradient-elegant', style: 'elegant',
        accentColor: '#D4A437', textColor: '#ffffff', rsvpEnabled: true,
      }
    default:
      return {}
  }
}

function defaultTitleFor(type: StudioProjectType): string {
  const t = STUDIO_TILES.find(t => t.type === type)
  return t ? t.label : 'Untitled Project'
}

/* ──────────────────────────────────────────────────────────────────────────
   StudioProjectEditor
   ────────────────────────────────────────────────────────────────────────── */
export function StudioProjectEditor({
  initialProject, onBack, onSaved,
}: {
  initialProject: StudioProject | null
  onBack: () => void
  onSaved?: (p: StudioProject) => void
}) {
  const [project, setProject] = useState<StudioProject | null>(initialProject)
  const [creatingType, setCreatingType] = useState<StudioProjectType | null>(null)
  const [saving, setSaving] = useState<null | 'save' | 'publish'>(null)
  const { fire, ConfettiLayer } = useConfetti()

  // Update a top-level field on the project (title) or nested data key.
  const update = useCallback(<K extends keyof StudioProject>(key: K, value: StudioProject[K]) => {
    setProject(prev => prev ? { ...prev, [key]: value } : prev)
  }, [])
  const updateData = useCallback((key: string, value: any) => {
    setProject(prev => prev ? { ...prev, data: { ...prev.data, [key]: value } } : prev)
  }, [])

  // Create a new project of the given type.
  const createNew = useCallback(async (type: StudioProjectType) => {
    setCreatingType(type)
    const data = defaultDataFor(type)
    const res = await safeFetch<{ project: StudioProject }>('/api/studio/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title: defaultTitleFor(type), data }),
    })
    setCreatingType(null)
    if (res.error) {
      toast({ title: 'Could not create project', description: res.error, variant: 'destructive' })
      return
    }
    if (res.data?.project) {
      setProject(res.data.project)
      fire({ x: 0.5, y: 0.3, count: 60, spread: 70 })
    }
  }, [fire])

  // Save (publish or draft).
  const save = useCallback(async (publish: boolean) => {
    if (!project) return
    setSaving(publish ? 'publish' : 'save')
    const body: Record<string, any> = {
      title: project.title,
      data: project.data,
    }
    if (publish) body.isPublished = true
    if (project.aiGenerated) body.aiGenerated = true
    if (project.aiPrompt) body.aiPrompt = project.aiPrompt

    const res = await safeFetch<{ project: StudioProject }>(`/api/studio/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(null)
    if (res.error) {
      toast({ title: publish ? 'Could not publish' : 'Could not save', description: res.error, variant: 'destructive' })
      return
    }
    if (res.data?.project) {
      setProject(res.data.project)
      onSaved?.(res.data.project)
      if (publish) {
        fire({ x: 0.5, y: 0.4, count: 150, spread: 80 })
        toast({ title: 'Published!', description: 'Your project is now live.' })
      } else {
        toast({ title: 'Saved', description: 'Draft saved successfully.' })
      }
    }
  }, [project, fire, onSaved])

  // ── Type picker mode ─────────────────────────────────────────────────
  if (!project) {
    return (
      <div className="relative">
        {ConfettiLayer}
        <FadeIn>
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 hover:bg-evergreen/5 hover:text-evergreen">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold gradient-text-evergreen">
              Pick a creation type
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Each type has its own visual editor + live preview.
            </p>
          </div>
        </FadeIn>

        <StaggerContainer className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4" stagger={0.04}>
          {STUDIO_TILES.map(tile => {
            const a = ACCENT_CLASSES[tile.accent]
            const busy = creatingType === tile.type
            return (
              <StaggerItem key={tile.type} y={18}>
                <TiltCard intensity={6} glow className="h-full">
                  <button
                    type="button"
                    disabled={creatingType !== null}
                    onClick={() => createNew(tile.type)}
                    className={cn(
                      'group relative w-full h-full text-left overflow-hidden rounded-2xl border bg-card',
                      a.ring, 'shadow-festive transition-all hover:-translate-y-1',
                      'disabled:opacity-70 disabled:cursor-wait',
                    )}
                  >
                    <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', a.gradient)} aria-hidden />
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/5" />
                    <div aria-hidden className={cn('absolute -top-6 -right-6 h-24 w-24 rounded-full blur-2xl opacity-50 transition-transform group-hover:scale-125', a.bg)} />
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-evergreen via-gold to-berry" aria-hidden />
                    <div className="relative z-[1] p-5 min-h-[200px] flex flex-col justify-between">
                      <div>
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md ring-2 ring-white/30 text-2xl mb-3">
                          <span aria-hidden>{tile.icon}</span>
                        </div>
                        <h3 className="font-serif text-base font-bold text-cream">{tile.label}</h3>
                        <p className="text-[11px] text-cream/85 mt-1 leading-snug line-clamp-2">{tile.description}</p>
                      </div>
                      <div className="mt-4">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold',
                          busy ? 'bg-cream/30 text-cream/80' : 'bg-cream/20 text-cream backdrop-blur-md group-hover:bg-gold group-hover:text-evergreen-dark',
                        )}>
                          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          {busy ? 'Creating…' : 'Start'}
                        </span>
                      </div>
                    </div>
                  </button>
                </TiltCard>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      </div>
    )
  }

  // ── Editor mode ──────────────────────────────────────────────────────
  return (
    <div className="relative">
      {ConfettiLayer}
      <EditorHeader
        project={project}
        onBack={() => { setProject(null); onBack() }}
        onTitle={v => update('title', v)}
      />
      <AIGenerate
        project={project}
        onData={(d, suggestedTitle, prompt) => {
          setProject(prev => prev ? {
            ...prev,
            data: { ...prev.data, ...d },
            title: suggestedTitle || prev.title,
            aiGenerated: true,
            aiPrompt: prompt,
          } : prev)
          fire({ x: 0.5, y: 0.3, count: 40, spread: 60 })
          toast({ title: 'AI generated', description: 'Filled the form with suggestions.' })
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left pane: edit form */}
        <div className="order-2 lg:order-1">
          <Card className="border-evergreen/20 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-evergreen via-gold to-berry" aria-hidden />
            <CardContent className="pt-5 pb-6 space-y-5">
              <TypeSpecificForm project={project} updateData={updateData} />
            </CardContent>
          </Card>
        </div>

        {/* Right pane: live preview */}
        <div className="order-1 lg:order-2">
          <div className="sticky top-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30">
                <Sparkles className="h-3 w-3 mr-1" /> Live preview
              </Badge>
              {project.isPublished && (
                <Badge variant="outline" className="bg-gold/5 text-gold-dark border-gold/30">
                  <Globe className="h-3 w-3 mr-1" /> Published
                </Badge>
              )}
            </div>
            <ProjectPreview type={project.type} data={project.data} />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Updates in real-time as you edit.
            </p>
          </div>
        </div>
      </div>

      {/* Save / Publish */}
      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => save(false)}
          disabled={saving !== null}
          className="border-evergreen/30 text-evergreen hover:bg-evergreen/5"
        >
          {saving === 'save' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save draft
        </Button>
        <Button
          onClick={() => save(true)}
          disabled={saving !== null}
          className="bg-gradient-to-r from-evergreen to-evergreen-dark text-cream hover:shadow-festive"
        >
          {saving === 'publish' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Globe className="h-4 w-4 mr-1" />}
          Save &amp; Publish
        </Button>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Editor header — title + back button + type badge
   ────────────────────────────────────────────────────────────────────────── */
function EditorHeader({
  project, onBack, onTitle,
}: {
  project: StudioProject
  onBack: () => void
  onTitle: (v: string) => void
}) {
  const tile = STUDIO_TILES.find(t => t.type === project.type)
  return (
    <FadeIn>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack} className="hover:bg-evergreen/5 hover:text-evergreen">
          <ChevronLeft className="h-4 w-4" /> All projects
        </Button>
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-evergreen to-evergreen-dark text-cream text-lg shadow-festive">
          <span aria-hidden>{tile?.icon}</span>
        </div>
        <Input
          value={project.title}
          onChange={e => onTitle(e.target.value)}
          className="flex-1 min-w-[200px] h-9 font-serif text-lg font-bold"
        />
        <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30">
          {tile?.label}
        </Badge>
        {project.aiGenerated && (
          <Badge variant="outline" className="bg-gold/5 text-gold-dark border-gold/30">
            <Sparkles className="h-3 w-3 mr-1" /> AI
          </Badge>
        )}
      </div>
    </FadeIn>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   AI Generate section
   ────────────────────────────────────────────────────────────────────────── */
function AIGenerate({
  project, onData,
}: {
  project: StudioProject
  onData: (data: Record<string, any>, suggestedTitle: string, prompt: string) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [recipient, setRecipient] = useState('')
  const [occasion, setOccasion] = useState('')
  const [tone, setTone] = useState('')
  const [loading, setLoading] = useState(false)
  const [showContext, setShowContext] = useState(false)

  const generate = useCallback(async () => {
    if (prompt.trim().length < 2) {
      toast({ title: 'Add a prompt first', description: 'Tell the AI what to generate.', variant: 'destructive' })
      return
    }
    setLoading(true)
    const context: Record<string, string> = {}
    if (recipient.trim()) context.recipient = recipient.trim()
    if (occasion.trim()) context.occasion = occasion.trim()
    if (tone.trim()) context.tone = tone.trim()

    const res = await safeFetch<{ data: Record<string, any>; suggestedTitle: string; provider: string; isStub: boolean }>(
      '/api/studio/ai/generate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: project.type, prompt: prompt.trim(), context }),
      },
    )
    setLoading(false)
    if (res.error) {
      toast({ title: 'AI generation failed', description: res.error, variant: 'destructive' })
      return
    }
    if (res.data?.data) {
      onData(res.data.data, res.data.suggestedTitle || '', prompt.trim())
    }
  }, [prompt, recipient, occasion, tone, project.type, onData])

  return (
    <FadeIn delay={0.05}>
      <Card className="mb-6 border-gold/30 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" aria-hidden />
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-wrap items-start gap-3 mb-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold-dark text-cream shadow-gold flex-shrink-0">
              <Wand2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-sm font-bold flex items-center gap-2">
                AI Generate
                <Badge variant="outline" className="text-[10px] py-0 h-4 bg-gold/5 text-gold-dark border-gold/30">
                  stub
                </Badge>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Describe what you want — AI fills the form instantly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowContext(s => !s)}
              className="text-xs text-evergreen hover:underline"
            >
              {showContext ? 'Hide' : 'Add'} context
            </button>
          </div>

          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. A heartfelt birthday wish for my mom, mentioning her kindness…"
            className="min-h-[80px] resize-y bg-background"
          />

          <AnimatePresence>
            {showContext && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid gap-3 mt-3 sm:grid-cols-3">
                  <ContextInput label="Recipient" value={recipient} onChange={setRecipient} placeholder="Mom, Alex…" />
                  <ContextInput label="Occasion"  value={occasion}  onChange={setOccasion}  placeholder="Birthday…" />
                  <ContextInput label="Tone"      value={tone}      onChange={setTone}      placeholder="Heartfelt…" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-3 flex justify-end">
            <Button
              onClick={generate}
              disabled={loading}
              className="bg-gradient-to-r from-gold to-gold-dark text-cream hover:shadow-gold"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Generating…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-1" /> Generate with AI</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  )
}

function ContextInput({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 text-sm"
      />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Type-specific form router
   ────────────────────────────────────────────────────────────────────────── */
function TypeSpecificForm({
  project, updateData,
}: {
  project: StudioProject
  updateData: (key: string, value: any) => void
}) {
  const data = project.data || {}
  switch (project.type) {
    case 'GREETING_CARD':
    case 'SOCIAL_CARD':
    case 'BIRTHDAY_WISH':
    case 'CHRISTMAS_WISH':
      return <GreetingForm data={data} update={updateData} />
    case 'QUOTE':
      return <QuoteForm data={data} update={updateData} />
    case 'POSTER':
    case 'ANNOUNCEMENT':
      return <PosterForm data={data} update={updateData} />
    case 'QUIZ':
      return <QuizForm data={data} update={updateData} />
    case 'POLL':
      return <PollForm data={data} update={updateData} />
    case 'COUNTDOWN':
      return <CountdownForm data={data} update={updateData} />
    case 'INVITATION':
    case 'EVENT_PAGE':
      return <InvitationForm data={data} update={updateData} />
    default:
      return <p className="text-sm text-muted-foreground">No form available for this type.</p>
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   Shared form primitives
   ────────────────────────────────────────────────────────────────────────── */
function Field({
  label, icon: Icon, children, hint,
}: {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  )
}

function ColorPicker({
  value, onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const presets = ['#ffffff', '#000000', '#FBF8F2', '#D4A437', '#0F4C3A', '#8B2C5C', '#C0392B', '#4a9cc4']
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 w-8 rounded border border-border cursor-pointer"
        aria-label="Pick color"
      />
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 w-24 text-xs font-mono"
      />
      <div className="flex gap-1.5">
        {presets.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
              value.toLowerCase() === c.toLowerCase() ? 'border-evergreen' : 'border-border',
            )}
            style={{ background: c }}
            aria-label={`Use ${c}`}
          />
        ))}
      </div>
    </div>
  )
}

function GradientPicker({
  value, onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const keys = Object.keys(GRADIENT_PRESETS)
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
      {keys.map(k => {
        const g = GRADIENT_PRESETS[k]
        const isActive = value === k
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            title={g.label}
            className={cn(
              'aspect-square rounded-lg border-2 transition-all hover:scale-105',
              isActive ? 'border-evergreen ring-2 ring-evergreen/30' : 'border-border',
            )}
            style={{ background: g.css }}
            aria-label={g.label}
          />
        )
      })}
    </div>
  )
}

function ChoicePicker({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
            value === o.value
              ? 'border-evergreen bg-evergreen/10 text-evergreen'
              : 'border-border text-muted-foreground hover:border-evergreen/50 hover:bg-evergreen/5',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ToggleRow({
  label, checked, onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Greeting form
   ────────────────────────────────────────────────────────────────────────── */
function GreetingForm({
  data, update,
}: {
  data: Record<string, any>
  update: (k: string, v: any) => void
}) {
  return (
    <>
      <Field label="Recipient" icon={Type}>
        <Input
          value={data.recipient || ''}
          onChange={e => update('recipient', e.target.value)}
          placeholder="e.g. Mom, Alex, Friend…"
        />
      </Field>
      <Field label="Message" icon={Send}>
        <Textarea
          value={data.message || ''}
          onChange={e => update('message', e.target.value)}
          className="min-h-[100px] resize-y"
          placeholder="Write your heartfelt message…"
        />
      </Field>
      <Field label="Background" icon={Palette}>
        <GradientPicker value={data.backgroundImage || ''} onChange={v => update('backgroundImage', v)} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Layout">
          <ChoicePicker value={data.layout || 'centered'} onChange={v => update('layout', v)} options={LAYOUTS} />
        </Field>
        <Field label="Font size">
          <ChoicePicker value={data.fontSize || 'medium'} onChange={v => update('fontSize', v)} options={FONT_SIZES} />
        </Field>
      </div>
      <Field label="Text color">
        <ColorPicker value={data.textColor || '#ffffff'} onChange={v => update('textColor', v)} />
      </Field>
      <Field label="Accent color">
        <ColorPicker value={data.accentColor || '#D4A437'} onChange={v => update('accentColor', v)} />
      </Field>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Quote form
   ────────────────────────────────────────────────────────────────────────── */
function QuoteForm({
  data, update,
}: {
  data: Record<string, any>
  update: (k: string, v: any) => void
}) {
  return (
    <>
      <Field label="Quote text" icon={Type}>
        <Textarea
          value={data.text || ''}
          onChange={e => update('text', e.target.value)}
          className="min-h-[100px] resize-y"
          placeholder="Write your inspiring quote…"
        />
      </Field>
      <Field label="Author">
        <Input
          value={data.author || ''}
          onChange={e => update('author', e.target.value)}
          placeholder="Who said it?"
        />
      </Field>
      <Field label="Background" icon={Palette}>
        <GradientPicker value={data.backgroundImage || ''} onChange={v => update('backgroundImage', v)} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Style">
          <ChoicePicker
            value={data.style || 'minimal'}
            onChange={v => update('style', v)}
            options={STYLE_OPTIONS.slice(0, 6).map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
          />
        </Field>
        <Field label="Font size">
          <ChoicePicker value={data.fontSize || 'large'} onChange={v => update('fontSize', v)} options={FONT_SIZES} />
        </Field>
      </div>
      <Field label="Text color">
        <ColorPicker value={data.textColor || '#ffffff'} onChange={v => update('textColor', v)} />
      </Field>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Countdown form
   ────────────────────────────────────────────────────────────────────────── */
function CountdownForm({
  data, update,
}: {
  data: Record<string, any>
  update: (k: string, v: any) => void
}) {
  const dt = data.targetDate ? new Date(data.targetDate) : new Date(Date.now() + 7 * 86400000)
  const localValue = useMemo(() => {
    const tzOffset = dt.getTimezoneOffset() * 60000
    return new Date(dt.getTime() - tzOffset).toISOString().slice(0, 16)
  }, [data.targetDate])

  return (
    <>
      <Field label="Title">
        <Input value={data.title || ''} onChange={e => update('title', e.target.value)} />
      </Field>
      <Field label="Subtitle">
        <Input value={data.subtitle || ''} onChange={e => update('subtitle', e.target.value)} />
      </Field>
      <Field label="Target date & time" icon={Calendar}>
        <Input
          type="datetime-local"
          value={localValue}
          onChange={e => {
            const d = new Date(e.target.value)
            update('targetDate', d.toISOString())
          }}
        />
      </Field>
      <Field label="Style">
        <ChoicePicker
          value={data.style || 'gradient'}
          onChange={v => update('style', v)}
          options={[
            { value: 'gradient', label: 'Gradient' },
            { value: 'minimal', label: 'Minimal' },
            { value: 'dark', label: 'Dark' },
            { value: 'neon', label: 'Neon' },
            { value: 'festive', label: 'Festive' },
          ]}
        />
      </Field>
      <Field label="Show units">
        <div className="rounded-lg border border-border/60 px-3">
          <ToggleRow label="Days" checked={data.showDays !== false} onChange={v => update('showDays', v)} />
          <ToggleRow label="Hours" checked={data.showHours !== false} onChange={v => update('showHours', v)} />
          <ToggleRow label="Minutes" checked={data.showMinutes !== false} onChange={v => update('showMinutes', v)} />
          <ToggleRow label="Seconds" checked={data.showSeconds !== false} onChange={v => update('showSeconds', v)} />
        </div>
      </Field>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Quiz form
   ────────────────────────────────────────────────────────────────────────── */
function QuizForm({
  data, update,
}: {
  data: Record<string, any>
  update: (k: string, v: any) => void
}) {
  const questions: Array<{
    question: string
    options: string[]
    correctIndex: number
    explanation?: string
  }> = Array.isArray(data.questions) ? data.questions : []

  const setQuestions = (qs: typeof questions) => update('questions', qs)

  function updateQ(i: number, patch: Partial<typeof questions[number]>) {
    const next = questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q))
    setQuestions(next)
  }
  function removeQ(i: number) {
    setQuestions(questions.filter((_, idx) => idx !== i))
  }
  function moveQ(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= questions.length) return
    const next = [...questions]
    const tmp = next[i]; next[i] = next[j]; next[j] = tmp
    setQuestions(next)
  }
  function addQ() {
    setQuestions([...questions, {
      question: 'New question?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctIndex: 0,
      explanation: '',
    }])
  }
  function updateOpt(qi: number, oi: number, v: string) {
    const opts = [...questions[qi].options]
    opts[oi] = v
    updateQ(qi, { options: opts })
  }

  return (
    <>
      <Field label="Quiz title" icon={ListChecks}>
        <Input value={data.title || ''} onChange={e => update('title', e.target.value)} />
      </Field>
      <Field label="Description">
        <Textarea
          value={data.description || ''}
          onChange={e => update('description', e.target.value)}
          className="min-h-[60px] resize-y"
        />
      </Field>

      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={qi} className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-evergreen">Question {qi + 1}</span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveQ(qi, -1)} disabled={qi === 0}
                  className="rounded p-1 hover:bg-evergreen/10 disabled:opacity-30">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => moveQ(qi, 1)} disabled={qi === questions.length - 1}
                  className="rounded p-1 hover:bg-evergreen/10 disabled:opacity-30">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => removeQ(qi)}
                  className="rounded p-1 hover:bg-destructive/10 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <Textarea
              value={q.question}
              onChange={e => updateQ(qi, { question: e.target.value })}
              className="min-h-[48px] resize-y text-sm mb-2"
            />
            <p className="text-[11px] text-muted-foreground mb-1">Options (tap to mark correct):</p>
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQ(qi, { correctIndex: oi })}
                    className={cn(
                      'flex-shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all',
                      q.correctIndex === oi
                        ? 'border-evergreen bg-evergreen text-cream'
                        : 'border-border text-muted-foreground hover:border-evergreen/50',
                    )}
                    title="Mark as correct"
                  >
                    {q.correctIndex === oi ? <Check className="h-3 w-3" /> : <span className="text-[10px]">{String.fromCharCode(65 + oi)}</span>}
                  </button>
                  <Input
                    value={opt}
                    onChange={e => updateOpt(qi, oi, e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
            <Input
              value={q.explanation || ''}
              onChange={e => updateQ(qi, { explanation: e.target.value })}
              placeholder="Explanation (optional)"
              className="h-8 text-xs mt-2 italic"
            />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addQ} className="w-full border-dashed">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add question
        </Button>
      </div>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Poll form
   ────────────────────────────────────────────────────────────────────────── */
function PollForm({
  data, update,
}: {
  data: Record<string, any>
  update: (k: string, v: any) => void
}) {
  const options: Array<{ text: string; votes: number }> = Array.isArray(data.options)
    ? data.options.map((o: any) => ({ text: String(o.text ?? ''), votes: Number(o.votes ?? 0) }))
    : []

  const setOptions = (o: typeof options) => update('options', o)

  function updateOpt(i: number, v: string) {
    setOptions(options.map((o, idx) => (idx === i ? { ...o, text: v } : o)))
  }
  function removeOpt(i: number) {
    setOptions(options.filter((_, idx) => idx !== i))
  }
  function addOpt() {
    setOptions([...options, { text: `Option ${String.fromCharCode(65 + options.length)}`, votes: 0 }])
  }

  return (
    <>
      <Field label="Question" icon={BarChart3}>
        <Textarea
          value={data.question || ''}
          onChange={e => update('question', e.target.value)}
          className="min-h-[60px] resize-y"
        />
      </Field>
      <Field label="Options">
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground w-5">{String.fromCharCode(65 + i)}</span>
              <Input
                value={o.text}
                onChange={e => updateOpt(i, e.target.value)}
                className="h-8 text-sm"
              />
              <button
                type="button"
                onClick={() => removeOpt(i)}
                className="rounded p-1.5 hover:bg-destructive/10 text-destructive"
                disabled={options.length <= 2}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addOpt} disabled={options.length >= 8} className="w-full border-dashed">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add option
          </Button>
        </div>
      </Field>
      <div className="rounded-lg border border-border/60 px-3 py-2">
        <ToggleRow
          label="Allow multiple answers"
          checked={data.allowMultiple === true}
          onChange={v => update('allowMultiple', v)}
        />
      </div>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Poster form
   ────────────────────────────────────────────────────────────────────────── */
function PosterForm({
  data, update,
}: {
  data: Record<string, any>
  update: (k: string, v: any) => void
}) {
  return (
    <>
      <Field label="Title" icon={Type}>
        <Input value={data.title || ''} onChange={e => update('title', e.target.value)} />
      </Field>
      <Field label="Subtitle">
        <Input value={data.subtitle || ''} onChange={e => update('subtitle', e.target.value)} />
      </Field>
      <Field label="Description">
        <Textarea
          value={data.description || ''}
          onChange={e => update('description', e.target.value)}
          className="min-h-[80px] resize-y"
        />
      </Field>
      <Field label="Background" icon={Palette}>
        <GradientPicker value={data.backgroundImage || ''} onChange={v => update('backgroundImage', v)} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Layout">
          <ChoicePicker value={data.layout || 'centered'} onChange={v => update('layout', v)} options={POSTER_LAYOUTS} />
        </Field>
        <Field label="Style">
          <ChoicePicker
            value={data.style || 'modern'}
            onChange={v => update('style', v)}
            options={STYLE_OPTIONS.slice(0, 6).map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
          />
        </Field>
      </div>
      <Field label="Accent color">
        <ColorPicker value={data.accentColor || '#D4A437'} onChange={v => update('accentColor', v)} />
      </Field>
      <Field label="Text color">
        <ColorPicker value={data.textColor || '#ffffff'} onChange={v => update('textColor', v)} />
      </Field>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Invitation form
   ────────────────────────────────────────────────────────────────────────── */
function InvitationForm({
  data, update,
}: {
  data: Record<string, any>
  update: (k: string, v: any) => void
}) {
  const dt = data.eventDate ? new Date(data.eventDate) : new Date(Date.now() + 14 * 86400000)
  const localValue = useMemo(() => {
    const tzOffset = dt.getTimezoneOffset() * 60000
    return new Date(dt.getTime() - tzOffset).toISOString().slice(0, 16)
  }, [data.eventDate])

  return (
    <>
      <Field label="Title" icon={Mail}>
        <Input value={data.title || ''} onChange={e => update('title', e.target.value)} />
      </Field>
      <Field label="Subtitle">
        <Input value={data.subtitle || ''} onChange={e => update('subtitle', e.target.value)} />
      </Field>
      <Field label="Event date & time" icon={Calendar}>
        <Input
          type="datetime-local"
          value={localValue}
          onChange={e => update('eventDate', new Date(e.target.value).toISOString())}
        />
      </Field>
      <Field label="Location">
        <Input
          value={data.location || ''}
          onChange={e => update('location', e.target.value)}
          placeholder="123 Main St, City"
        />
      </Field>
      <Field label="Description">
        <Textarea
          value={data.description || ''}
          onChange={e => update('description', e.target.value)}
          className="min-h-[80px] resize-y"
        />
      </Field>
      <Field label="Background" icon={Palette}>
        <GradientPicker value={data.backgroundImage || ''} onChange={v => update('backgroundImage', v)} />
      </Field>
      <Field label="Style">
        <ChoicePicker
          value={data.style || 'elegant'}
          onChange={v => update('style', v)}
          options={STYLE_OPTIONS.slice(0, 6).map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
        />
      </Field>
      <Field label="Accent color">
        <ColorPicker value={data.accentColor || '#D4A437'} onChange={v => update('accentColor', v)} />
      </Field>
      <Field label="Text color">
        <ColorPicker value={data.textColor || '#ffffff'} onChange={v => update('textColor', v)} />
      </Field>
      <div className="rounded-lg border border-border/60 px-3 py-2">
        <ToggleRow
          label="Enable RSVP button"
          checked={data.rsvpEnabled === true}
          onChange={v => update('rsvpEnabled', v)}
        />
      </div>
    </>
  )
}

export default StudioProjectEditor
