'use client'
//
// EarnovaStudioView — studio hub view.
//
// Two modes:
//   1. Hub mode: shows the user's existing projects + 12 creation tiles.
//   2. Editor mode: renders <StudioProjectEditor> with a selected (or new) project.
//
// All API calls go through safeFetch. Confetti fires on project create/delete.
// Mobile-first responsive — tiles stack to 2 columns on mobile.
//
import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FadeIn, StaggerContainer, StaggerItem,
} from '@/components/animated/motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { Sparkles as SparklesComponent } from '@/components/animated/sparkles'
import { TiltCard } from '@/components/animated/tilt-card'
import { useConfetti } from '@/components/animated/confetti'
import { safeFetch } from '@/lib/safe-fetch'
import { toast } from '@/hooks/use-toast'
import {
  StudioProjectEditor,
  type StudioProject,
} from '@/components/studio/studio-project-editor'
import {
  Wand2, ChevronLeft, ArrowRight, Sparkles, Crown, Pencil, Trash2,
  Plus, Loader2, Calendar, Globe,
} from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'
import type { StudioProjectType } from '@prisma/client'

/* ──────────────────────────────────────────────────────────────────────────
   Studio tile metadata (kept in sync with the editor's STUDIO_TILES).
   ────────────────────────────────────────────────────────────────────────── */
type Accent = 'evergreen' | 'gold' | 'berry' | 'cranberry' | 'sage'

const ACCENTS: Record<Accent, {
  ring: string
  bar: string
  orb: string
  cardGradient: string
  shadow: string
  text: string
}> = {
  evergreen: {
    ring: 'border-evergreen/30', bar: 'bg-gradient-to-r from-evergreen to-evergreen-light',
    orb: 'bg-evergreen/15', cardGradient: 'from-evergreen-dark via-evergreen to-evergreen-light',
    shadow: 'shadow-festive', text: 'text-evergreen',
  },
  gold: {
    ring: 'border-gold/30', bar: 'bg-gradient-to-r from-gold-light via-gold to-gold-dark',
    orb: 'bg-gold/20', cardGradient: 'from-gold-dark via-gold to-gold-light',
    shadow: 'shadow-gold', text: 'text-gold-dark',
  },
  berry: {
    ring: 'border-berry/30', bar: 'bg-gradient-to-r from-berry to-berry/70',
    orb: 'bg-berry/20', cardGradient: 'from-berry via-berry/85 to-berry/60',
    shadow: 'shadow-festive', text: 'text-berry',
  },
  cranberry: {
    ring: 'border-cranberry/30', bar: 'bg-gradient-to-r from-cranberry to-berry',
    orb: 'bg-cranberry/20', cardGradient: 'from-cranberry via-cranberry/85 to-berry/80',
    shadow: 'shadow-festive', text: 'text-cranberry',
  },
  sage: {
    ring: 'border-sage/30', bar: 'bg-gradient-to-r from-sage to-evergreen-light',
    orb: 'bg-sage/25', cardGradient: 'from-evergreen via-sage to-evergreen-light',
    shadow: 'shadow-festive', text: 'text-sage',
  },
}

type StudioTile = {
  type: StudioProjectType
  icon: string
  title: string
  description: string
  accent: Accent
}

const STUDIO_TILES: StudioTile[] = [
  { type: 'GREETING_CARD',  icon: '🎴', title: 'Greeting Card',  description: 'Create a personalized greeting card for any occasion.',         accent: 'evergreen' },
  { type: 'SOCIAL_CARD',    icon: '🎉', title: 'Social Card',    description: 'Share a beautiful social media card with your audience.',     accent: 'gold' },
  { type: 'BIRTHDAY_WISH',  icon: '🎂', title: 'Birthday Wish',  description: 'Send a heartfelt birthday greeting to someone special.',      accent: 'berry' },
  { type: 'CHRISTMAS_WISH', icon: '🎄', title: 'Christmas Wish', description: 'Spread holiday cheer with a festive Christmas card.',        accent: 'evergreen' },
  { type: 'QUOTE',          icon: '💬', title: 'Quote',          description: 'Share an inspiring quote with a beautiful backdrop.',        accent: 'gold' },
  { type: 'POSTER',         icon: '📰', title: 'Poster',          description: 'Create a visual poster to announce or showcase something.', accent: 'berry' },
  { type: 'ANNOUNCEMENT',   icon: '📢', title: 'Announcement',   description: 'Make a clear, attention-grabbing announcement.',              accent: 'cranberry' },
  { type: 'QUIZ',           icon: '🧠', title: 'Quiz',            description: 'Create an interactive quiz to engage your audience.',        accent: 'sage' },
  { type: 'POLL',           icon: '📊', title: 'Poll',            description: 'Ask your audience a question and gather opinions.',          accent: 'gold' },
  { type: 'COUNTDOWN',      icon: '⏰', title: 'Countdown',      description: 'Count down to an event, launch, or special moment.',        accent: 'cranberry' },
  { type: 'INVITATION',     icon: '💌', title: 'Invitation',     description: 'Invite people to an event with a beautiful card.',           accent: 'berry' },
  { type: 'EVENT_PAGE',     icon: '📅', title: 'Event Page',     description: 'Create an event page with details, schedule, and links.',    accent: 'evergreen' },
]

/* ──────────────────────────────────────────────────────────────────────────
   EarnovaStudioView
   ────────────────────────────────────────────────────────────────────────── */
export default function EarnovaStudioView({
  user, navigate,
}: {
  user: CurrentUser
  navigate: (v: View) => void
}) {
  const [projects, setProjects] = useState<StudioProject[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<StudioProject | null>(null)
  const [creatingTile, setCreatingTile] = useState<StudioProjectType | null>(null)
  const { fire, ConfettiLayer } = useConfetti()

  // Fetch existing projects on mount — setState happens inside the async
  // callback (after `await`), not synchronously in the effect body.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await safeFetch<{ projects: StudioProject[] }>('/api/studio/projects')
      if (cancelled) return
      setLoading(false)
      if (res.error) {
        toast({ title: 'Could not load projects', description: res.error, variant: 'destructive' })
        return
      }
      if (res.data?.projects) setProjects(res.data.projects)
    })()
    return () => { cancelled = true }
  }, [])

  // Create a new project from a tile → POST → switch to editor.
  const createFromTile = useCallback(async (tile: StudioTile) => {
    if (creatingTile) return
    setCreatingTile(tile.type)
    // Default data per type — keeps the editor + preview useful immediately.
    const data = defaultDataForType(tile.type)
    const res = await safeFetch<{ project: StudioProject }>('/api/studio/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: tile.type, title: tile.title, data }),
    })
    setCreatingTile(null)
    if (res.error) {
      toast({ title: 'Could not create project', description: res.error, variant: 'destructive' })
      return
    }
    if (res.data?.project) {
      fire({ x: 0.5, y: 0.3, count: 60, spread: 70 })
      setProjects(prev => [res.data!.project, ...prev])
      setEditing(res.data.project)
    }
  }, [creatingTile, fire])

  // Delete a project → optimistic removal.
  const deleteProject = useCallback(async (id: string) => {
    const prev = projects
    setProjects(p => p.filter(x => x.id !== id))
    const res = await safeFetch<{ ok: boolean }>(`/api/studio/projects/${id}`, { method: 'DELETE' })
    if (res.error) {
      setProjects(prev)
      toast({ title: 'Could not delete', description: res.error, variant: 'destructive' })
    } else {
      toast({ title: 'Deleted', description: 'Project removed.' })
    }
  }, [projects])

  // Editor saved callback — refresh list + stay in editor.
  const onSaved = useCallback((p: StudioProject) => {
    setProjects(prev => {
      const exists = prev.find(x => x.id === p.id)
      if (exists) return prev.map(x => (x.id === p.id ? p : x))
      return [p, ...prev]
    })
  }, [])

  // ── Editor mode ──────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" aria-hidden />
        <FloatingOrbs count={3} colors={['evergreen', 'gold', 'berry']} className="opacity-20" />
        {ConfettiLayer}
        <div className="relative z-10 view-fade container mx-auto px-4 py-6 max-w-6xl">
          <StudioProjectEditor
            initialProject={editing}
            onBack={() => setEditing(null)}
            onSaved={onSaved}
          />
        </div>
      </div>
    )
  }

  // ── Hub mode ─────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" aria-hidden />
      <FloatingOrbs count={3} colors={['evergreen', 'gold', 'berry']} className="opacity-25" />
      {ConfettiLayer}

      <div className="relative z-10 view-fade container mx-auto px-4 py-6 max-w-6xl">
        {/* Back button */}
        <FadeIn>
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ name: 'dashboard' })}
              className="hover:bg-evergreen/5 hover:text-evergreen"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Dashboard
            </Button>
          </div>
        </FadeIn>

        {/* Hero header */}
        <FadeIn delay={0.05}>
          <div className="relative mb-10 overflow-hidden rounded-2xl border border-evergreen/30 bg-gradient-to-br from-evergreen/10 via-background to-gold/5 p-6 md:p-10">
            <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-30" />
            <SparklesComponent count={8} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <motion.span
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive"
                >
                  <Wand2 className="h-5 w-5" />
                </motion.span>
                <span className="text-xs uppercase tracking-wider font-semibold text-evergreen">
                  Creative toolkit
                </span>
              </div>
              <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-tight mb-2">
                <span className="gradient-text-evergreen">Earnova Studio</span>
              </h1>
              <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
                Create beautiful content in minutes — greeting cards, social cards,
                birthday wishes, posters, quizzes, countdowns, and more.
                Every type has its own visual editor with a live preview.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30">
                  <Sparkles className="h-3 w-3 mr-1" /> {STUDIO_TILES.length} formats
                </Badge>
                <Badge variant="outline" className="bg-gold/5 text-gold-dark border-gold/30">
                  <Crown className="h-3 w-3 mr-1" /> AI-powered
                </Badge>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Your projects */}
        <FadeIn delay={0.1}>
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl md:text-2xl font-bold flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-evergreen/10 text-evergreen">
                  <Pencil className="h-3.5 w-3.5" />
                </span>
                Your projects
              </h2>
              {projects.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {projects.length} total
                </Badge>
              )}
            </div>

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-32 rounded-2xl shimmer-bg" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <Card className="border-dashed border-evergreen/20 bg-evergreen/5">
                <CardContent className="py-8 text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-evergreen/10 text-evergreen mb-3">
                    <Plus className="h-5 w-5" />
                  </div>
                  <p className="font-serif font-semibold mb-1">No projects yet</p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Pick a format below to create your first piece of content. The editor will open with a live preview.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <StaggerContainer className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" stagger={0.04}>
                {projects.map(p => {
                  const tile = STUDIO_TILES.find(t => t.type === p.type)
                  const a = tile ? ACCENTS[tile.accent] : ACCENTS.evergreen
                  return (
                    <StaggerItem key={p.id} y={16}>
                      <ProjectCard
                        project={p}
                        icon={tile?.icon || '📄'}
                        title={tile?.title || p.type}
                        accentRing={a.ring}
                        published={p.isPublished === true}
                        onEdit={() => setEditing(p)}
                        onDelete={() => void deleteProject(p.id)}
                      />
                    </StaggerItem>
                  )
                })}
              </StaggerContainer>
            )}
          </div>
        </FadeIn>

        {/* Create new — type tiles */}
        <FadeIn delay={0.15}>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-serif text-xl md:text-2xl font-bold flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gold/10 text-gold-dark">
                <Wand2 className="h-3.5 w-3.5" />
              </span>
              Create new
            </h2>
          </div>
        </FadeIn>

        <StaggerContainer className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4" stagger={0.04}>
          {STUDIO_TILES.map(tile => (
            <StaggerItem key={tile.type} y={20}>
              <StudioTile
                tile={tile}
                creating={creatingTile === tile.type}
                onClick={() => void createFromTile(tile)}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Footer hint */}
        <FadeIn delay={0.4}>
          <Card className="mt-10 border-evergreen/20 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
            <CardContent className="py-6 px-6 flex items-start gap-3 flex-wrap">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-evergreen/10 text-evergreen flex-shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-sm font-semibold mb-0.5">
                  AI generation is built in
                </p>
                <p className="text-xs text-muted-foreground">
                  Every project type supports AI generation — describe what you want, and the editor
                  fills with suggested content. The provider is currently a stub that returns
                  template content; real AI providers (OpenAI, Anthropic) can be plugged in via
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-foreground">src/lib/ai/index.ts</code>
                  without changing any UI code.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate({ name: 'dashboard' })}
                className="border-evergreen/30 text-evergreen hover:bg-evergreen/5 btn-glow overflow-hidden flex-shrink-0"
              >
                Back to dashboard <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   ProjectCard — for existing projects
   ────────────────────────────────────────────────────────────────────────── */
function ProjectCard({
  project, icon, title, accentRing, published, onEdit, onDelete,
}: {
  project: StudioProject
  icon: string
  title: string
  accentRing: string
  published: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const updated = project.updatedAt ? new Date(project.updatedAt) : null
  const updatedLabel = updated && !Number.isNaN(updated.getTime())
    ? updated.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : ''

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`group relative h-full rounded-2xl border ${accentRing} bg-card overflow-hidden shadow-festive transition-all`}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-evergreen via-gold to-berry" aria-hidden />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-evergreen/10 text-lg flex-shrink-0">
            <span aria-hidden>{icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-sm font-bold truncate">{project.title}</p>
            <p className="text-[11px] text-muted-foreground">{title}</p>
          </div>
          {project.aiGenerated && (
            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-gold/5 text-gold-dark border-gold/30 flex-shrink-0">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI
            </Badge>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {updatedLabel || '—'}
          </span>
          {published ? (
            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-evergreen/5 text-evergreen border-evergreen/30">
              <Globe className="h-2.5 w-2.5 mr-0.5" /> Live
            </Badge>
          ) : (
            <span className="text-[10px]">Draft</span>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            className="flex-1 h-8 text-xs border-evergreen/30 text-evergreen hover:bg-evergreen/5"
          >
            <Pencil className="h-3 w-3 mr-1" /> Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDelete}
            className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete project"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   StudioTile — beautiful creation tile
   ────────────────────────────────────────────────────────────────────────── */
function StudioTile({
  tile, creating, onClick,
}: {
  tile: StudioTile
  creating: boolean
  onClick: () => void
}) {
  const a = ACCENTS[tile.accent]
  return (
    <TiltCard intensity={6} glow className="h-full">
      <button
        type="button"
        onClick={onClick}
        disabled={creating}
        className={`group relative w-full h-full text-left overflow-hidden rounded-2xl border ${a.ring} ${a.shadow} focus:outline-none focus-visible:ring-2 focus-visible:ring-evergreen/50 transition-all hover:-translate-y-1 disabled:opacity-70 disabled:cursor-wait`}
        aria-label={`Create ${tile.title}`}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${a.cardGradient} opacity-90`} aria-hidden />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/5 opacity-80 transition-opacity group-hover:opacity-95"
        />
        <div
          aria-hidden
          className={`absolute -top-6 -right-6 h-24 w-24 rounded-full ${a.orb} blur-2xl transition-transform group-hover:scale-125`}
        />
        <div className={`absolute top-0 left-0 right-0 h-1 ${a.bar}`} aria-hidden />

        <div className="relative z-[1] p-4 sm:p-5 min-h-[200px] sm:min-h-[220px] flex flex-col justify-between">
          <div>
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.05 }}
              className="inline-flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md ring-2 ring-white/30 text-2xl sm:text-3xl mb-3 shadow-festive"
            >
              <span aria-hidden>{tile.icon}</span>
            </motion.div>
            <h3 className="font-serif text-base sm:text-lg font-bold text-cream drop-shadow-sm">
              {tile.title}
            </h3>
            <p className="text-[11px] sm:text-xs text-cream/85 mt-1 leading-snug line-clamp-3">
              {tile.description}
            </p>
          </div>

          <div className="mt-4">
            <div
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                creating
                  ? 'bg-cream/30 text-cream/80'
                  : 'bg-cream/20 text-cream backdrop-blur-md group-hover:bg-gold group-hover:text-evergreen-dark group-hover:shadow-gold'
              }`}
            >
              {creating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  Create <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </div>
          </div>
        </div>
      </button>
    </TiltCard>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Default data per type — duplicates the editor's defaults so the hub can
   POST a sensible starting data when the user clicks a creation tile.
   ────────────────────────────────────────────────────────────────────────── */
function defaultDataForType(type: StudioProjectType): Record<string, any> {
  switch (type) {
    case 'GREETING_CARD':
    case 'SOCIAL_CARD':
    case 'BIRTHDAY_WISH':
    case 'CHRISTMAS_WISH':
      return {
        recipient: '',
        message: 'Write your message here…',
        backgroundImage: 'gradient-warm',
        layout: 'centered',
        style: 'modern',
        fontSize: 'large',
        textColor: '#ffffff',
        accentColor: '#D4A437',
      }
    case 'QUOTE':
      return {
        text: 'The best way to predict the future is to create it.',
        author: 'Peter Drucker',
        style: 'minimal',
        backgroundImage: 'gradient-mountain',
        fontSize: 'xlarge',
        textColor: '#ffffff',
      }
    case 'POSTER':
    case 'ANNOUNCEMENT':
      return {
        title: 'Your Big Title',
        subtitle: 'A compelling subtitle',
        description: 'Add your description here. Tell people what to expect.',
        backgroundImage: 'gradient-vibrant',
        layout: 'centered',
        style: 'modern',
        accentColor: '#D4A437',
        textColor: '#ffffff',
      }
    case 'QUIZ':
      return {
        title: 'Knowledge Quiz',
        description: 'Test your knowledge!',
        questions: [{
          question: 'Sample question?',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctIndex: 0,
          explanation: 'Brief explanation.',
        }],
        style: 'interactive',
      }
    case 'POLL':
      return {
        question: 'What would you like to know?',
        options: [
          { text: 'Option A', votes: 0 },
          { text: 'Option B', votes: 0 },
          { text: 'Option C', votes: 0 },
        ],
        style: 'bar',
        allowMultiple: false,
      }
    case 'COUNTDOWN':
      return {
        targetDate: new Date(Date.now() + 7 * 86400000).toISOString(),
        title: 'Something Big Is Coming',
        subtitle: 'Stay tuned!',
        style: 'gradient',
        showDays: true,
        showHours: true,
        showMinutes: true,
        showSeconds: true,
      }
    case 'INVITATION':
    case 'EVENT_PAGE':
      return {
        title: "You're Invited!",
        subtitle: 'Join us for a special occasion',
        eventDate: new Date(Date.now() + 14 * 86400000).toISOString(),
        location: 'Location TBD',
        description: 'We would be delighted to have you.',
        backgroundImage: 'gradient-elegant',
        style: 'elegant',
        accentColor: '#D4A437',
        textColor: '#ffffff',
        rsvpEnabled: true,
      }
    default:
      return {}
  }
}
