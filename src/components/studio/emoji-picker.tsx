'use client'
//
// EmojiPicker — a popup grid of the 48 STICKER_EMOJIS.
//
// Renders inside a Popover (from canvas-toolbar / properties-panel) or as a
// standalone absolute-positioned panel. Click an emoji → onPick(emoji).
//
import { useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { STICKER_EMOJIS } from './canvas-types'
import { Smile } from 'lucide-react'

/* Categorise the 48 emojis for nicer UX (8 per row × 6 rows). */
const ROWS: string[][] = Array.from({ length: 6 }, (_, i) =>
  STICKER_EMOJIS.slice(i * 8, i * 8 + 8),
)

type Props = {
  onPick: (emoji: string) => void
  className?: string
  triggerClassName?: string
  triggerLabel?: string
  children?: React.ReactNode
}

/**
 * EmojiPicker — Popover-triggered grid of STICKER_EMOJIS.
 *
 * Pass an `onPick(emoji)` callback. When an emoji is clicked, the popover
 * closes and the callback fires.
 */
export function EmojiPicker({
  onPick,
  className,
  triggerClassName,
  triggerLabel = 'Sticker',
  children,
}: Props) {
  const [open, setOpen] = useState(false)

  const handlePick = (emoji: string) => {
    onPick(emoji)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children ?? (
          <button
            type="button"
            className={cn(
              'inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-evergreen/30 bg-evergreen/5 px-3 py-2 text-xs font-medium text-evergreen transition-colors hover:bg-evergreen/10',
              triggerClassName,
            )}
          >
            <Smile className="h-3.5 w-3.5" /> {triggerLabel}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[280px] p-3"
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pick a sticker
          </p>
          <span className="text-[10px] text-muted-foreground">
            {STICKER_EMOJIS.length} emojis
          </span>
        </div>
        <div className="space-y-1">
          {ROWS.map((row, i) => (
            <div key={i} className="grid grid-cols-8 gap-1">
              {row.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handlePick(emoji)}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-xl transition-colors hover:bg-evergreen/10 hover:ring-2 hover:ring-evergreen/30"
                  aria-label={`Add ${emoji} sticker`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   EmojiGrid — bare grid (no popover wrapper) for use in properties-panel.
   ────────────────────────────────────────────────────────────────────────── */
export function EmojiGrid({
  onPick,
  className,
}: {
  onPick: (emoji: string) => void
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      {ROWS.map((row, i) => (
        <div key={i} className="grid grid-cols-8 gap-1">
          {row.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => onPick(emoji)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-lg transition-colors hover:bg-evergreen/10 hover:ring-2 hover:ring-evergreen/30"
              aria-label={`Use ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
