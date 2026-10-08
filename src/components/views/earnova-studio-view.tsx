'use client'
//
// EarnovaStudioView — studio hub view (Canva-like).
//
// Two modes:
//   1. Hub mode: hero header + "Your projects" grid + "Create new" section
//      (blank canvas picker + template gallery + 12 format tiles).
//   2. Editor mode: full-screen <CanvasEditor> (3-panel layout).
//
// All API calls go through safeFetch. Confetti fires on create / publish.
// Mobile-first responsive — tiles stack to 2 columns on mobile.
//
import { motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import {
  FadeIn, StaggerContainer, StaggerItem,
} from '@/components/animated/motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { Sparkles as SparklesComponent } from '@/components/animated/sparkles'
import { TiltCard } from '@/components/animated/tilt-card'
import { useConfetti } from '@/components/animated/confetti'
import { safeFetch } from '@/lib/safe-fetch'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  CanvasEditor,
  type StudioProject,
} from '@/components/studio/canvas-editor'
import {
  CANVAS_PRESETS, CANVAS_TEMPLATES, BACKGROUND_GRADIENTS,
  createDefaultCanvas, createTextElement,
  type CanvasData,
} from '@/components/studio/canvas-types'
import {
  Wand2, ChevronLeft, ArrowRight, Sparkles, Crown, Pencil, Trash2,
  Plus, Loader2, Calendar, Globe, LayoutTemplate, FileImage, X,
} from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'
import type { StudioProjectType } from '@prisma/client'

/* ──────────────────────────────────────────────────────────────────────────
   Tile metadata — kept here for the studio hub.
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

type StudioTileMeta = {
  type: StudioProjectType
  icon: string
  title: string
  description: string
  accent: Accent
  presetId: string
  background: string
}

const STUDIO_TILES: StudioTileMeta[] = [
  { type: 'GREETING_CARD',  icon: '🎴', title: 'Greeting Card',  description: 'Create a personalized greeting card for any occasion.',         accent: 'evergreen', presetId: 'square',    background: 'evergreen-gold' },
  { type: 'SOCIAL_CARD',    icon: '🎉', title: 'Social Card',    description: 'Share a beautiful social media card with your audience.',     accent: 'gold',      presetId: 'square',    background: 'warm-sunset' },
  { type: 'BIRTHDAY_WISH',  icon: '🎂', title: 'Birthday Wish',  description: 'Send a heartfelt birthday greeting to someone special.',      accent: 'berry',     presetId: 'square',    background: 'pink-bloom' },
  { type: 'CHRISTMAS_WISH', icon: '🎄', title: 'Christmas Wish', description: 'Spread holiday cheer with a festive Christmas card.',        accent: 'evergreen', presetId: 'square',    background: 'christmas-warm' },
  { type: 'QUOTE',          icon: '💬', title: 'Quote',          description: 'Share an inspiring quote with a beautiful backdrop.',        accent: 'gold',      presetId: 'square',    background: 'dark-elegant' },
  { type: 'POSTER',         icon: '📰', title: 'Poster',          description: 'Create a visual poster to announce or showcase something.', accent: 'berry',     presetId: 'landscape', background: 'royal-blue' },
  { type: 'ANNOUNCEMENT',   icon: '📢', title: 'Announcement',   description: 'Make a clear, attention-grabbing announcement.',              accent: 'cranberry', presetId: 'landscape', background: 'berry-sunset' },
  { type: 'QUIZ',           icon: '🧠', title: 'Quiz',            description: 'Create an interactive quiz to engage your audience.',        accent: 'sage',      presetId: 'square',    background: 'fresh-mint' },
  { type: 'POLL',           icon: '📊', title: 'Poll',            description: 'Ask your audience a question and gather opinions.',          accent: 'gold',      presetId: 'square',    background: 'ocean-deep' },
  { type: 'COUNTDOWN',      icon: '⏰', title: 'Countdown',      description: 'Count down to an event, launch, or special moment.',        accent: 'cranberry', presetId: 'square',    background: 'purple-haze' },
  { type: 'INVITATION',     icon: '💌', title: 'Invitation',     description: 'Invite people to an event with a beautiful card.',           accent: 'berry',     presetId: 'square',    background: 'royal-blue' },
  { type: 'EVENT_PAGE',     icon: '📅', title: 'Event Page',     description: 'Create an event page with details, schedule, and links.',    accent: 'evergreen', presetId: 'landscape', background: 'forest-mist' },
]

/* ──────────────────────────────────────────────────────────────────────────
   Build a starter canvas for a given tile type
   ────────────────────────────────────────────────────────────────────────── */
function canvasForTile(tile: StudioTileMeta): CanvasData {
  const preset = CANVAS_PRESETS.find(p => p.id === tile.presetId) || CANVAS_PRESETS[0]
  const canvas = createDefaultCanvas(preset)
  canvas.canvas.background = tile.background
  canvas.canvas.backgroundType = BACKGROUND_GRADIENTS[tile.background]?.startsWith('#') ? 'solid' : 'gradient'

  // Seed with one title text element so the canvas isn't empty.
  const txt = createTextElement(tile.title, 0, 0)
  txt.x = (preset.width - txt.width) / 2
  txt.y = (preset.height - txt.height) / 2
  txt.fontSize = 48
  txt.color = '#ffffff'
  txt.textShadow = '0 2px 12px rgba(0,0,0,0.4)'
  canvas.elements = [txt]
  return canvas
}

function canvasFromTemplate(templateId: string): CanvasData | null {
  const tpl = CANVAS_TEMPLATES.find(t => t.id === templateId)
  if (!tpl) return null
  const preset = CANVAS_PRESETS.find(p => p.id === tpl.presetId) || CANVAS_PRESETS[0]
  return {
    canvas: {
      width: preset.width,
      height: preset.height,
      background: tpl.background,
      backgroundType: tpl.background.startsWith('solid') ? 'solid' : 'gradient',
    },
    // Deep-clone elements with fresh IDs so template instances don't share IDs.
    elements: tpl.elements.map((el, i) => ({
      ...el,
      id: 'el-' + Date.now().toString(36) + '-' + i + '-' + Math.random().toString(36).slice(2, 6),
      zIndex: i + 1,
    })),
  }
}

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
  const [creating, setCreating] = useState<string | null>(null)
  const [blankOpen, setBlankOpen] = useState(false)
  const { fire, ConfettiLayer } = useConfetti()

  /* ── Fetch existing projects on mount ────────────────────────────────── */
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

  /* ── Create a new canvas project from a tile / template / blank ──────── */
  const createProject = useCallback(async (
    key: string,
    type: StudioProjectType,
    title: string,
    canvas: CanvasData,
  ) => {
    if (creating) return
    setCreating(key)
    const res = await safeFetch<{ project: StudioProject }>('/api/studio/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title, data: { canvas } }),
    })
    setCreating(null)
    if (res.error) {
      toast({ title: 'Could not create project', description: res.error, variant: 'destructive' })
      return
    }
    if (res.data?.project) {
      fire({ x: 0.5, y: 0.3, count: 60, spread: 70 })
      setProjects(prev => [res.data!.project, ...prev])
      setEditing(res.data.project)
    }
  }, [creating, fire])

  const createFromTile = useCallback((tile: StudioTileMeta) => {
    void createProject(
      `tile-${tile.type}`,
      tile.type,
      tile.title,
      canvasForTile(tile),
    )
  }, [createProject])

  const createFromTemplate = useCallback((templateId: string) => {
    const tpl = CANVAS_TEMPLATES.find(t => t.id === templateId)
    if (!tpl) return
    const canvas = canvasFromTemplate(templateId)
    if (!canvas) return
    void createProject(
      `tpl-${templateId}`,
      'SOCIAL_CARD',
      tpl.name,
      canvas,
    )
  }, [createProject])

  const createBlank = useCallback((presetId: string, title: string) => {
    const preset = CANVAS_PRESETS.find(p => p.id === presetId) || CANVAS_PRESETS[0]
    const canvas = createDefaultCanvas(preset)
    void createProject(
      `blank-${presetId}`,
      'POSTER',
      title.trim() || `Untitled ${preset.name}`,
      canvas,
    )
    setBlankOpen(false)
  }, [createProject])

  /* ── Delete a project (optimistic) ───────────────────────────────────── */
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

  /* ── Save callback from editor ──────────────────────────────────────── */
  const onSaved = useCallback((p: StudioProject) => {
    setProjects(prev => {
      const exists = prev.find(x => x.id === p.id)
      if (exists) return prev.map(x => (x.id === p.id ? p : x))
      return [p, ...prev]
    })
    setEditing(p)
  }, [])

  /* ──────────────────────────────────────────────────────────────────────
     Editor mode — full-screen canvas
     ────────────────────────────────────────────────────────────────────── */
  if (editing) {
    // Editor mode: fills the remaining viewport height after the mobile top bar
    // (h-14 = 3.5rem on mobile). On desktop, there's no top bar, so we use
    // h-screen + a negative margin to account for the sidebar not adding height.
    //
    // overflow-hidden prevents the Footer (rendered after <main> in page.tsx)
    // from being visible while the canvas editor is open.
    return (
      <div className="relative h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden bg-background md:-mt-0">
        {ConfettiLayer}
        <CanvasEditor
          project={editing}
          onBack={() => setEditing(null)}
          onSaved={onSaved}
        />
      </div>
    )
  }

  /* ──────────────────────────────────────────────────────────────────────
     Hub mode
     ────────────────────────────────────────────────────────────────────── */
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
                  Creative canvas
                </span>
              </div>
              <h1 className="font-serif text-3xl md:text-5xl font-bold tracking-tight mb-2">
                <span className="gradient-text-evergreen">Earnova Studio</span>
              </h1>
              <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
                Design beautiful content on a Canva-like canvas — drag, drop,
                layer, and export to PNG. Pick a template, start from scratch,
                or choose a format below.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-evergreen to-evergreen-dark text-cream hover:shadow-festive"
                  onClick={() => setBlankOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" /> Blank canvas
                </Button>
                <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30">
                  <Sparkles className="h-3 w-3 mr-1" /> {CANVAS_TEMPLATES.length} templates
                </Badge>
                <Badge variant="outline" className="bg-gold/5 text-gold-dark border-gold/30">
                  <Crown className="h-3 w-3 mr-1" /> {STUDIO_TILES.length} formats
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
                    Pick a template or a blank canvas above to design your first piece.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <StaggerContainer className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" stagger={0.04}>
                {projects.map(p => (
                  <StaggerItem key={p.id} y={16}>
                    <ProjectCard
                      project={p}
                      onEdit={() => setEditing(p)}
                      onDelete={() => void deleteProject(p.id)}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </div>
        </FadeIn>

        {/* Template gallery */}
        <FadeIn delay={0.15}>
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl md:text-2xl font-bold flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gold/10 text-gold-dark">
                  <LayoutTemplate className="h-3.5 w-3.5" />
                </span>
                Templates
              </h2>
              <span className="text-xs text-muted-foreground">
                Click to start from a pre-designed layout
              </span>
            </div>
            <StaggerContainer className="grid gap-4 grid-cols-2 md:grid-cols-3" stagger={0.04}>
              {CANVAS_TEMPLATES.map(tpl => {
                const busy = creating === `tpl-${tpl.id}`
                return (
                  <StaggerItem key={tpl.id} y={20}>
                    <button
                      type="button"
                      disabled={creating !== null}
                      onClick={() => createFromTemplate(tpl.id)}
                      className="group relative w-full overflow-hidden rounded-2xl border border-evergreen/30 shadow-festive transition-all hover:-translate-y-1 disabled:cursor-wait disabled:opacity-70"
                    >
                      {/* Background gradient preview */}
                      <div
                        className="relative aspect-square w-full overflow-hidden"
                        style={{
                          background: BACKGROUND_GRADIENTS[tpl.background] || BACKGROUND_GRADIENTS['evergreen-gold'],
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" aria-hidden />
                        <div className="absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-2xl backdrop-blur-md ring-2 ring-white/30">
                          {tpl.icon}
                        </div>
                        <div className="absolute inset-x-3 bottom-3 text-left">
                          <p className="font-serif text-sm font-bold text-white drop-shadow-sm">
                            {tpl.name}
                          </p>
                          <p className="text-[10px] text-cream/80 line-clamp-1">
                            {tpl.description}
                          </p>
                        </div>
                        {busy && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Loader2 className="h-6 w-6 animate-spin text-cream" />
                          </div>
                        )}
                      </div>
                    </button>
                  </StaggerItem>
                )
              })}
            </StaggerContainer>
          </div>
        </FadeIn>

        {/* Format tiles */}
        <FadeIn delay={0.2}>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-serif text-xl md:text-2xl font-bold flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-berry/10 text-berry">
                <FileImage className="h-3.5 w-3.5" />
              </span>
              Formats
            </h2>
            <span className="text-xs text-muted-foreground">
              Quick start with a pre-sized canvas
            </span>
          </div>
        </FadeIn>

        <StaggerContainer className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4" stagger={0.04}>
          {STUDIO_TILES.map(tile => {
            const busy = creating === `tile-${tile.type}`
            return (
              <StaggerItem key={tile.type} y={20}>
                <StudioTile
                  tile={tile}
                  creating={busy}
                  onClick={() => createFromTile(tile)}
                />
              </StaggerItem>
            )
          })}
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
                  Powerful canvas editor
                </p>
                <p className="text-xs text-muted-foreground">
                  Drag, resize, rotate, layer, undo/redo, snap-to-grid, and export
                  your design as a high-resolution PNG. Auto-saves your draft while
                  you create — hit <strong>Publish</strong> to take it live.
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

      {/* Blank canvas picker dialog */}
      <BlankCanvasDialog
        open={blankOpen}
        onOpenChange={setBlankOpen}
        creating={creating?.startsWith('blank-') ?? false}
        onCreate={createBlank}
      />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   ProjectCard — for existing projects
   ────────────────────────────────────────────────────────────────────────── */
function ProjectCard({
  project, onEdit, onDelete,
}: {
  project: StudioProject
  onEdit: () => void
  onDelete: () => void
}) {
  const canvas: CanvasData | undefined = project.data?.canvas
  const updated = project.updatedAt ? new Date(project.updatedAt) : null
  const updatedLabel = updated && !Number.isNaN(updated.getTime())
    ? updated.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : ''

  // Look up the original tile for the icon/title (fallback to canvas preset).
  const tile = useMemo(() => STUDIO_TILES.find(t => t.type === project.type), [project.type])
  const icon = tile?.icon || '🎨'
  const titleLabel = tile?.title || project.type

  // Mini canvas preview background.
  const bgKey = canvas?.canvas.background || 'evergreen-gold'
  const bgCss = BACKGROUND_GRADIENTS[bgKey] || BACKGROUND_GRADIENTS['evergreen-gold']
  const elementCount = canvas?.elements.length ?? 0

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="group relative h-full overflow-hidden rounded-2xl border border-evergreen/30 bg-card shadow-festive transition-all"
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-evergreen via-gold to-berry" aria-hidden />

      {/* Mini preview */}
      <div
        className="relative aspect-[16/9] w-full overflow-hidden"
        style={{ background: bgCss, backgroundSize: 'cover' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" aria-hidden />
        <div className="absolute left-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/20 text-base backdrop-blur-sm">
          {icon}
        </div>
        <div className="absolute right-2 top-2 flex gap-1">
          {project.aiGenerated && (
            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-gold/20 text-cream border-gold/40 backdrop-blur-sm">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI
            </Badge>
          )}
        </div>
        <div className="absolute bottom-2 left-2 right-2">
          <p className="font-serif text-xs font-bold text-white drop-shadow-sm truncate">
            {project.title}
          </p>
          <p className="text-[10px] text-cream/80">
            {elementCount} {elementCount === 1 ? 'element' : 'elements'}
          </p>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {updatedLabel || '—'}
          </span>
          {project.isPublished ? (
            <Badge variant="outline" className="text-[10px] py-0 h-4 bg-evergreen/5 text-evergreen border-evergreen/30">
              <Globe className="h-2.5 w-2.5 mr-0.5" /> Live
            </Badge>
          ) : (
            <span className="text-[10px]">{titleLabel}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
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
  tile: StudioTileMeta
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
        className={cn(
          'group relative w-full h-full text-left overflow-hidden rounded-2xl border',
          a.ring, a.shadow, 'focus:outline-none focus-visible:ring-2 focus-visible:ring-evergreen/50 transition-all hover:-translate-y-1 disabled:opacity-70 disabled:cursor-wait',
        )}
        aria-label={`Create ${tile.title}`}
      >
        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', a.cardGradient)} aria-hidden />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/5 opacity-80 transition-opacity group-hover:opacity-95"
        />
        <div
          aria-hidden
          className={cn('absolute -top-6 -right-6 h-24 w-24 rounded-full blur-2xl transition-transform group-hover:scale-125', a.orb)}
        />
        <div className={cn('absolute top-0 left-0 right-0 h-1', a.bar)} aria-hidden />

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
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                creating
                  ? 'bg-cream/30 text-cream/80'
                  : 'bg-cream/20 text-cream backdrop-blur-md group-hover:bg-gold group-hover:text-evergreen-dark group-hover:shadow-gold',
              )}
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
   BlankCanvasDialog — pick a preset + name → create empty project
   ────────────────────────────────────────────────────────────────────────── */
function BlankCanvasDialog({
  open, onOpenChange, creating, onCreate,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  creating: boolean
  onCreate: (presetId: string, title: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* key forces BlankCanvasForm to remount (and reset its local state)
          each time the dialog is re-opened. */}
      <DialogContent className="sm:max-w-lg" key={open ? 'open' : 'closed'}>
        <DialogHeader>
          <DialogTitle className="font-serif text-lg">New blank canvas</DialogTitle>
        </DialogHeader>
        {open && (
          <BlankCanvasForm creating={creating} onCreate={onCreate} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function BlankCanvasForm({
  creating, onCreate,
}: {
  creating: boolean
  onCreate: (presetId: string, title: string) => void
}) {
  const [selectedPreset, setSelectedPreset] = useState<string>(CANVAS_PRESETS[0].id)
  const [title, setTitle] = useState('')

  return (
    <>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Title
          </label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Untitled canvas"
            className="text-sm"
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Size preset
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CANVAS_PRESETS.map(p => {
              const isSelected = selectedPreset === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPreset(p.id)}
                  className={cn(
                    'group relative flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all',
                    isSelected
                      ? 'border-evergreen bg-evergreen/5 ring-2 ring-evergreen/30'
                      : 'border-border hover:border-evergreen/40 hover:bg-evergreen/5',
                  )}
                >
                  <span className="text-2xl">{p.icon}</span>
                  <span className="mt-1 text-[11px] font-semibold">{p.name.split(' (')[0]}</span>
                  <span className="text-[9px] text-muted-foreground">
                    {p.width}×{p.height}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <DialogFooter className="gap-2">
        <DialogClose asChild>
          <Button variant="outline" size="sm">
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
        </DialogClose>
        <Button
          size="sm"
          disabled={creating}
          onClick={() => onCreate(selectedPreset, title)}
          className="bg-gradient-to-r from-evergreen to-evergreen-dark text-cream hover:shadow-festive"
        >
          {creating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
          Create canvas
        </Button>
      </DialogFooter>
    </>
  )
}
