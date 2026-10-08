'use client'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animated/motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { Sparkles as SparklesComponent } from '@/components/animated/sparkles'
import { TiltCard } from '@/components/animated/tilt-card'
import { safeFetch } from '@/lib/safe-fetch'
import { toast } from '@/hooks/use-toast'
import { useConfetti } from '@/components/animated/confetti'
import {
  Wand2, ChevronLeft, ArrowRight, Sparkles, Crown,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import type { View, CurrentUser } from '@/app/page'

/* ──────────────────────────────────────────────────────────────────────────
   EarnovaStudio (per spec §71) — "creative toolkit" hub.

   Per the spec, users can create:
     greeting cards · social cards · birthday wishes · christmas wishes ·
     quotes · posters · announcements · quizzes · polls · countdowns ·
     invitations · event pages

   For MVP: each tile creates a new Special Page via POST /api/pages with
   the right pageType + a sensible title, then routes the user straight to
   the builder so they can drop content blocks in.
   Future: pre-populate from a template + auto-apply a matching theme.
   ────────────────────────────────────────────────────────────────────────── */

type Accent = 'evergreen' | 'gold' | 'berry' | 'cranberry' | 'sage'

const ACCENTS: Record<Accent, {
  bg: string
  text: string
  bar: string
  wash: string
  orb: string
  ring: string
  gradientIcon: string
  cardGradient: string
  shadow: string
}> = {
  evergreen: {
    bg: 'bg-evergreen/10', text: 'text-evergreen',
    bar: 'bg-gradient-to-r from-evergreen to-evergreen-light',
    wash: 'bg-gradient-to-br from-evergreen/8 via-evergreen/3 to-transparent',
    orb: 'bg-evergreen/15', ring: 'border-evergreen/30',
    gradientIcon: 'bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive',
    cardGradient: 'from-evergreen-dark via-evergreen to-evergreen-light',
    shadow: 'shadow-festive',
  },
  gold: {
    bg: 'bg-gold/15', text: 'text-gold-dark',
    bar: 'bg-gradient-to-r from-gold-light via-gold to-gold-dark',
    wash: 'bg-gradient-to-br from-gold/12 via-gold/4 to-transparent',
    orb: 'bg-gold/20', ring: 'border-gold/30',
    gradientIcon: 'bg-gradient-to-br from-gold to-gold-dark text-cream shadow-gold',
    cardGradient: 'from-gold-dark via-gold to-gold-light',
    shadow: 'shadow-gold',
  },
  berry: {
    bg: 'bg-berry/10', text: 'text-berry',
    bar: 'bg-gradient-to-r from-berry to-berry/70',
    wash: 'bg-gradient-to-br from-berry/10 via-berry/3 to-transparent',
    orb: 'bg-berry/20', ring: 'border-berry/30',
    gradientIcon: 'bg-gradient-to-br from-berry to-berry/70 text-cream shadow-festive',
    cardGradient: 'from-berry via-berry/85 to-berry/60',
    shadow: 'shadow-festive',
  },
  cranberry: {
    bg: 'bg-cranberry/10', text: 'text-cranberry',
    bar: 'bg-gradient-to-r from-cranberry to-berry',
    wash: 'bg-gradient-to-br from-cranberry/10 via-cranberry/3 to-transparent',
    orb: 'bg-cranberry/20', ring: 'border-cranberry/30',
    gradientIcon: 'bg-gradient-to-br from-cranberry to-berry text-cream shadow-festive',
    cardGradient: 'from-cranberry via-cranberry/85 to-berry/80',
    shadow: 'shadow-festive',
  },
  sage: {
    bg: 'bg-sage/15', text: 'text-sage',
    bar: 'bg-gradient-to-r from-sage to-evergreen-light',
    wash: 'bg-gradient-to-br from-sage/12 via-sage/4 to-transparent',
    orb: 'bg-sage/25', ring: 'border-sage/30',
    gradientIcon: 'bg-gradient-to-br from-sage to-evergreen text-cream shadow-festive',
    cardGradient: 'from-evergreen via-sage to-evergreen-light',
    shadow: 'shadow-festive',
  },
}

type StudioTile = {
  key: string
  icon: string              // emoji
  title: string
  description: string
  pageType: string          // PageType enum
  accent: Accent
  suggestedTitle: string
}

const STUDIO_TILES: StudioTile[] = [
  { key: 'greeting',     icon: '🎴', title: 'Greeting Card',  description: 'Create a personalized greeting card for any occasion.',         pageType: 'CELEBRATION', accent: 'evergreen',  suggestedTitle: 'Greeting Card' },
  { key: 'social',       icon: '🎉', title: 'Social Card',    description: 'Share a beautiful social media card with your audience.',     pageType: 'CREATOR',     accent: 'gold',       suggestedTitle: 'Social Card' },
  { key: 'birthday',     icon: '🎂', title: 'Birthday Wish',  description: 'Send a heartfelt birthday greeting to someone special.',      pageType: 'CELEBRATION', accent: 'berry',      suggestedTitle: 'Birthday Wish' },
  { key: 'christmas',    icon: '🎄', title: 'Christmas Wish', description: 'Spread holiday cheer with a festive Christmas page.',         pageType: 'CELEBRATION', accent: 'evergreen',  suggestedTitle: 'Christmas Wish' },
  { key: 'quote',        icon: '💬', title: 'Quote',          description: 'Share an inspiring quote with a beautiful backdrop.',         pageType: 'PERSONAL',    accent: 'gold',       suggestedTitle: 'Quote of the Day' },
  { key: 'poster',       icon: '📰', title: 'Poster',          description: 'Create a visual poster to announce or showcase something.',   pageType: 'BUSINESS',    accent: 'berry',      suggestedTitle: 'Poster' },
  { key: 'announcement', icon: '📢', title: 'Announcement',   description: 'Make a clear, attention-grabbing announcement.',              pageType: 'BUSINESS',    accent: 'cranberry',  suggestedTitle: 'Announcement' },
  { key: 'quiz',         icon: '🧠', title: 'Quiz',            description: 'Create an interactive quiz to engage your audience.',        pageType: 'CREATOR',     accent: 'sage',       suggestedTitle: 'Quiz' },
  { key: 'poll',         icon: '📊', title: 'Poll',            description: 'Ask your audience a question and gather opinions.',          pageType: 'CREATOR',     accent: 'gold',       suggestedTitle: 'Poll' },
  { key: 'countdown',    icon: '⏰', title: 'Countdown',      description: 'Count down to an event, launch, or special moment.',         pageType: 'EVENT',       accent: 'cranberry',  suggestedTitle: 'Countdown' },
  { key: 'invitation',   icon: '💌', title: 'Invitation',     description: 'Invite people to an event with a beautiful card.',           pageType: 'EVENT',       accent: 'berry',      suggestedTitle: 'You\'re Invited' },
  { key: 'event',        icon: '📅', title: 'Event Page',     description: 'Create an event page with details, schedule, and links.',    pageType: 'EVENT',       accent: 'evergreen',  suggestedTitle: 'Event Page' },
]

export default function EarnovaStudioView({
  user, navigate,
}: {
  user: CurrentUser
  navigate: (v: View) => void
}) {
  const [creatingKey, setCreatingKey] = useState<string | null>(null)
  const { fire, ConfettiLayer } = useConfetti()

  const createFromTile = useCallback(async (tile: StudioTile) => {
    if (creatingKey) return
    setCreatingKey(tile.key)
    const res = await safeFetch<{ page: { id: string } }>('/api/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: tile.suggestedTitle,
        pageType: tile.pageType,
      }),
    })
    setCreatingKey(null)
    if (res.error) {
      toast({
        title: 'Could not create page',
        description: res.error,
        variant: 'destructive',
      })
      return
    }
    if (res.data?.page?.id) {
      // Small celebration on creation
      fire({ x: 0.5, y: 0.3, count: 60, spread: 70 })
      navigate({ name: 'builder', pageId: res.data.page.id })
    }
  }, [creatingKey, fire, navigate])

  return (
    <div className="relative min-h-screen">
      {/* Ambient layer — matches dashboard / analytics / grow views */}
      <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" aria-hidden />
      <FloatingOrbs count={3} colors={['evergreen', 'gold', 'berry']} className="opacity-25" />
      {ConfettiLayer}

      <div className="relative z-10 view-fade container mx-auto px-4 py-6 max-w-6xl">
        {/* Back button */}
        <FadeIn>
          <div className="flex items-center gap-3 mb-4">
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
                Pick a format and we&apos;ll spin up a fresh page for you to edit.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {STUDIO_TILES.length} templates
                </Badge>
                <Badge variant="outline" className="bg-gold/5 text-gold-dark border-gold/30">
                  <Crown className="h-3 w-3 mr-1" />
                  Free for creators
                </Badge>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Studio tiles grid */}
        <StaggerContainer className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4" stagger={0.05}>
          {STUDIO_TILES.map(tile => (
            <StaggerItem key={tile.key} y={20}>
              <StudioCard
                tile={tile}
                creating={creatingKey === tile.key}
                onClick={() => createFromTile(tile)}
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
                <Wand2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-sm font-semibold mb-0.5">
                  More formats coming soon
                </p>
                <p className="text-xs text-muted-foreground">
                  Templates with pre-filled content blocks and matching themes
                  are on the way. For now, each tile spins up a fresh page
                  pre-labeled with your chosen format.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate({ name: 'dashboard' })}
                className="border-evergreen/30 text-evergreen hover:bg-evergreen/5 btn-glow overflow-hidden flex-shrink-0"
              >
                Start from scratch <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </div>
  )
}

/* ── StudioCard ─────────────────────────────────────────────────────────── */

function StudioCard({
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
        {/* Card gradient wash */}
        <div className={`absolute inset-0 bg-gradient-to-br ${a.cardGradient} opacity-90`} aria-hidden />
        {/* Hover overlay — intensifies on hover */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/5 opacity-80 transition-opacity group-hover:opacity-95"
        />
        {/* Floating orb for depth */}
        <div
          aria-hidden
          className={`absolute -top-6 -right-6 h-24 w-24 rounded-full ${a.orb} blur-2xl transition-transform group-hover:scale-125`}
        />
        {/* Top accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${a.bar}`} aria-hidden />

        {/* Content */}
        <div className="relative z-[1] p-4 sm:p-5 min-h-[200px] sm:min-h-[220px] flex flex-col justify-between">
          <div>
            {/* Icon in glass circle */}
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

          {/* Create button */}
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
                  <span className="h-3 w-3 border-2 border-cream/40 border-t-cream rounded-full animate-spin" />
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
