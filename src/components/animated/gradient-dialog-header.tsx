'use client'
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type GradientVariant = 'evergreen' | 'gold' | 'berry' | 'festive' | 'cranberry' | 'ocean'

const VARIANTS: Record<GradientVariant, { bg: string; text: string; ring: string; sparkle: string }> = {
  evergreen: {
    bg: 'bg-gradient-to-br from-evergreen-dark via-evergreen to-evergreen-light',
    text: 'text-cream',
    ring: 'ring-evergreen/30',
    sparkle: 'text-gold',
  },
  gold: {
    bg: 'bg-gradient-to-br from-gold-dark via-gold to-gold-light',
    text: 'text-cream',
    ring: 'ring-gold/30',
    sparkle: 'text-evergreen',
  },
  berry: {
    bg: 'bg-gradient-to-br from-berry via-berry/80 to-berry/60',
    text: 'text-cream',
    ring: 'ring-berry/30',
    sparkle: 'text-gold',
  },
  festive: {
    bg: 'bg-gradient-to-br from-evergreen-dark via-evergreen via-gold to-berry',
    text: 'text-cream',
    ring: 'ring-gold/30',
    sparkle: 'text-cream',
  },
  cranberry: {
    bg: 'bg-gradient-to-br from-cranberry via-cranberry/80 to-berry',
    text: 'text-cream',
    ring: 'ring-cranberry/30',
    sparkle: 'text-gold',
  },
  ocean: {
    bg: 'bg-gradient-to-br from-chart-4 via-chart-4/80 to-evergreen-light',
    text: 'text-cream',
    ring: 'ring-chart-4/30',
    sparkle: 'text-gold',
  },
}

/**
 * GradientDialogHeader — a beautiful gradient header for Dialog popups.
 *
 * Variants:
 *   - evergreen: deep evergreen gradient
 *   - gold: warm gold gradient
 *   - berry: rich plum gradient
 *   - festive: evergreen→gold→berry (Christmas-y)
 *   - cranberry: red gradient (for warnings)
 *   - ocean: blue-teal gradient (for info)
 *
 * Usage:
 *   <DialogContent className="p-0 max-w-lg">
 *     <GradientDialogHeader
 *       variant="evergreen"
 *       icon={Plus}
 *       title="Create a new page"
 *       description="Each page gets its own URL"
 *     />
 *     <div className="p-6">
 *       ...body...
 *     </div>
 *     <DialogFooter className="p-6 pt-0">
 *       ...buttons...
 *     </DialogFooter>
 *   </DialogContent>
 */
export function GradientDialogHeader({
  variant = 'evergreen',
  icon: Icon,
  title,
  description,
  onClose,
}: {
  variant?: GradientVariant
  icon?: LucideIcon
  title: string
  description?: string
  onClose?: () => void
}) {
  const v = VARIANTS[variant]
  return (
    <div className={`relative overflow-hidden rounded-t-lg ${v.bg} ${v.text} flex-shrink-0`}>
      {/* Decorative pattern overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 1px, transparent 2px),
                            radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 1px, transparent 2px)`,
          backgroundSize: '24px 24px',
        }}
      />
      {/* Animated floating orbs */}
      <motion.div
        animate={{ x: [0, 20, 0], y: [0, -10, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-2 right-12 h-20 w-20 rounded-full bg-white/20 blur-2xl"
      />
      <motion.div
        animate={{ x: [0, -15, 0], y: [0, 10, 0], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-2 left-8 h-16 w-16 rounded-full bg-white/10 blur-2xl"
      />

      <DialogHeader className="relative p-6 pb-4 pr-12 space-y-2">
        <DialogTitle className={`font-serif text-xl sm:text-2xl font-bold flex items-center gap-3 ${v.text} flex-wrap`}>
          {Icon && (
            <motion.span
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm ring-2 ring-white/30 flex-shrink-0"
            >
              <Icon className="h-5 w-5" />
            </motion.span>
          )}
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="break-words min-w-0 flex-1"
          >
            {title}
          </motion.span>
          <Sparkles className={`h-4 w-4 ml-auto ${v.sparkle} anim-sparkle-pulse flex-shrink-0`} />
        </DialogTitle>
        {description && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <DialogDescription className={`${v.text} opacity-80`}>
              {description}
            </DialogDescription>
          </motion.div>
        )}
      </DialogHeader>

      {/* Close button styled to match gradient */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 bg-white/15 hover:bg-white/30 backdrop-blur-sm ring-2 ring-white/20 transition-all hover:scale-110 group"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-cream group-hover:rotate-90 transition-transform" />
        </button>
      )}

      {/* Bottom border accent — gold line for festive feel */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
    </div>
  )
}
