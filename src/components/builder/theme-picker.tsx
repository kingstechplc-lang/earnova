'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog'
import { GradientDialogHeader } from '@/components/animated/gradient-dialog-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useConfetti } from '@/components/animated/confetti'
import { safeFetch } from '@/lib/safe-fetch'
import { toast } from '@/hooks/use-toast'
import {
  Palette, Check, Sparkles, Crown, X, Loader2, RotateCcw,
} from 'lucide-react'

/* ──────────────────────────────────────────────────────────────────────────
   ThemePicker — beautiful animated theme selector dialog.

   Props:
     pageId          — the SpecialPage id to PATCH /api/pages/[id]/theme
     currentThemeId  — the currently applied theme id (or null for default)
     onApplied       — callback after a theme is applied/removed
                       (themeId === null means "removed / default")

   Visual treatment:
     • Glass-strong dialog wrapper with festive gradient header
     • Grid of theme cards (2 cols mobile → 3 cols md → 4 cols lg)
     • Each card: previewGradient as the background, theme emoji in a
       glass circle, name + description, category badge, premium badge.
     • Currently-applied theme gets a gold check + animated glow border.
     • Spring scale-in staggered reveal on cards.
     • Hover: lift + shadow-elevated + gradient intensifies (scale 1.04).
     • Confetti (60 particles) on apply.
   ────────────────────────────────────────────────────────────────────────── */

type Theme = {
  id: string
  slug: string
  name: string
  description: string | null
  category: string
  icon: string                 // emoji
  cssVars: Record<string, string>
  previewGradient: string      // raw CSS gradient string
  isPremium: boolean
}

type ThemesResponse = { themes: Theme[] }

const CATEGORY_LABEL: Record<string, string> = {
  MINIMAL: 'Minimal',
  CREATOR: 'Creator',
  BUSINESS: 'Business',
  PORTFOLIO: 'Portfolio',
  MUSIC: 'Music',
  GAMING: 'Gaming',
  PHOTOGRAPHY: 'Photography',
  CELEBRATION: 'Celebration',
  CHRISTMAS: 'Christmas',
  PROFESSIONAL: 'Professional',
}

export function ThemePicker({
  pageId,
  currentThemeId,
  onApplied,
  open,
  onOpenChange,
}: {
  pageId: string
  currentThemeId: string | null
  onApplied: (themeId: string | null) => void
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(currentThemeId)
  const { fire, ConfettiLayer } = useConfetti()

  // Fetch themes when the dialog opens (lazy load).
  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      const res = await safeFetch<ThemesResponse>('/api/themes')
      if (cancelled) return
      if (res.error) {
        setError(res.error)
      } else if (res.data) {
        setThemes(res.data.themes || [])
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [open])

  // Keep the local selected indicator in sync when the prop changes
  // (e.g. parent re-fetches the page after apply).
  useEffect(() => {
    setSelectedId(currentThemeId)
  }, [currentThemeId])

  const applyTheme = useCallback(async (theme: Theme) => {
    if (applyingId) return
    setApplyingId(theme.id)
    const res = await safeFetch<{ page: { themeId: string | null } }>(
      `/api/pages/${pageId}/theme`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: theme.id }),
      },
    )
    setApplyingId(null)
    if (res.error) {
      toast({
        title: 'Could not apply theme',
        description: res.error,
        variant: 'destructive',
      })
      return
    }
    setSelectedId(theme.id)
    onApplied(theme.id)
    // Celebrate 🎉
    fire({ x: 0.5, y: 0.35, count: 60, spread: 70 })
    toast({
      title: `${theme.icon} ${theme.name} applied`,
      description: 'Your page now uses this theme. Preview to see it in action.',
    })
  }, [applyingId, pageId, onApplied, fire])

  const removeTheme = useCallback(async () => {
    if (removing) return
    setRemoving(true)
    const res = await safeFetch<{ page: { themeId: string | null } }>(
      `/api/pages/${pageId}/theme`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: null }),
      },
    )
    setRemoving(false)
    if (res.error) {
      toast({
        title: 'Could not remove theme',
        description: res.error,
        variant: 'destructive',
      })
      return
    }
    setSelectedId(null)
    onApplied(null)
    toast({
      title: 'Theme removed',
      description: 'Your page is back to the default Earnova theme.',
    })
  }, [removing, pageId, onApplied])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 max-w-3xl gap-0 overflow-hidden glass-strong max-h-[92vh]"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Theme picker</DialogTitle>
        {ConfettiLayer}
        <GradientDialogHeader
          variant="festive"
          icon={Palette}
          title="Choose a theme"
          description="Themes instantly restyle your page with new colors, gradients, and personality."
          onClose={() => onOpenChange(false)}
        />

        <div className="relative overflow-y-auto" style={{ maxHeight: 'calc(92vh - 220px)' }}>
          {/* Soft ambient wash behind the grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 mesh-bg opacity-25"
          />
          <div className="relative p-4 sm:p-6">
            {loading ? (
              <ThemeGridSkeleton />
            ) : error ? (
              <div className="py-10 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cranberry/10 mb-3">
                  <X className="h-5 w-5 text-cranberry" />
                </div>
                <p className="font-medium mb-1">Couldn&apos;t load themes</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-cranberry/30 text-cranberry hover:bg-cranberry/5"
                >
                  Close
                </Button>
              </div>
            ) : themes.length === 0 ? (
              <div className="py-12 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-evergreen/10 mb-3">
                  <Palette className="h-5 w-5 text-evergreen" />
                </div>
                <p className="font-medium mb-1">No themes available yet</p>
                <p className="text-sm text-muted-foreground">
                  The platform hasn&apos;t published any themes. Check back soon.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                <AnimatePresence>
                  {themes.map((theme, idx) => {
                    const isApplied = selectedId === theme.id
                    return (
                      <motion.div
                        key={theme.id}
                        layout
                        initial={{ opacity: 0, scale: 0.85, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{
                          type: 'spring',
                          stiffness: 260,
                          damping: 18,
                          delay: idx * 0.04,
                        }}
                        whileHover={{ y: -4, scale: 1.03 }}
                        className="relative"
                      >
                        <ThemeCard
                          theme={theme}
                          isApplied={isApplied}
                          applying={applyingId === theme.id}
                          onApply={() => applyTheme(theme)}
                        />
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Footer — remove theme button (only if a theme is currently applied) */}
        <div className="relative flex items-center justify-between gap-3 border-t border-border/50 bg-card/60 backdrop-blur-sm px-4 sm:px-6 py-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <Sparkles className="h-3.5 w-3.5 text-gold flex-shrink-0" />
            <span className="truncate">
              {selectedId
                ? 'A theme is active — your page reflects its colors.'
                : 'Default Earnova theme is active.'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeTheme}
            disabled={!selectedId || removing}
            className="text-muted-foreground hover:text-cranberry hover:bg-cranberry/5 flex-shrink-0"
          >
            {removing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            )}
            <span className="hidden sm:inline">Reset to default</span>
            <span className="sm:hidden">Reset</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── ThemeCard ──────────────────────────────────────────────────────────── */

function ThemeCard({
  theme,
  isApplied,
  applying,
  onApply,
}: {
  theme: Theme
  isApplied: boolean
  applying: boolean
  onApply: () => void
}) {
  return (
    <button
      type="button"
      onClick={onApply}
      className="group relative w-full text-left rounded-2xl overflow-hidden border border-border/40 shadow-festive focus:outline-none focus-visible:ring-2 focus-visible:ring-evergreen/50 transition-all"
      aria-label={`Apply ${theme.name} theme`}
    >
      {/* Preview gradient fills the entire card */}
      <div
        className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
        style={{ backgroundImage: theme.previewGradient }}
        aria-hidden
      />
      {/* Subtle dark gradient overlay for legibility */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10"
      />
      {/* Animated glow border for the currently-applied theme */}
      <AnimatePresence>
        {isApplied && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow:
                '0 0 0 2px var(--gold), 0 0 24px 4px rgba(212, 164, 55, 0.55), 0 0 60px 12px rgba(212, 164, 55, 0.25)',
            }}
          />
        )}
      </AnimatePresence>
      {/* Premium badge (top-right) */}
      {theme.isPremium && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-gold/95 text-evergreen-dark border-gold-light shadow-gold text-[10px] uppercase tracking-wider font-bold">
            <Crown className="h-2.5 w-2.5 mr-0.5" /> Pro
          </Badge>
        </div>
      )}
      {/* Applied check (top-left) */}
      <AnimatePresence>
        {isApplied && (
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 14 }}
            className="absolute top-2 left-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold text-evergreen-dark shadow-gold ring-2 ring-cream/40"
            aria-label="Currently applied"
          >
            <Check className="h-4 w-4" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card content */}
      <div className="relative z-[1] p-3 sm:p-4 min-h-[150px] sm:min-h-[170px] flex flex-col justify-end">
        <div className="flex items-start gap-2 mb-2">
          {/* Icon in a glass circle */}
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md ring-2 ring-white/30 text-lg flex-shrink-0 shadow-gold">
            <span aria-hidden>{theme.icon || '🎨'}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif text-sm sm:text-base font-bold text-cream truncate drop-shadow-sm">
              {theme.name}
            </h3>
            <p className="text-[10px] sm:text-xs text-cream/80 uppercase tracking-wide font-medium">
              {CATEGORY_LABEL[theme.category] || theme.category}
            </p>
          </div>
        </div>
        {theme.description && (
          <p className="text-[11px] sm:text-xs text-cream/85 leading-snug line-clamp-2 mb-2 drop-shadow-sm">
            {theme.description}
          </p>
        )}
        <div
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
            isApplied
              ? 'bg-gold text-evergreen-dark shadow-gold'
              : 'bg-cream/20 text-cream backdrop-blur-md group-hover:bg-cream/30 group-hover:shadow-gold'
          }`}
        >
          {applying ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Applying…
            </>
          ) : isApplied ? (
            <>
              <Check className="h-3 w-3" strokeWidth={3} /> Applied
            </>
          ) : (
            <>Apply theme</>
          )}
        </div>
      </div>
    </button>
  )
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */

function ThemeGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl shimmer-bg min-h-[150px] sm:min-h-[170px] border border-border/40"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  )
}

export default ThemePicker
