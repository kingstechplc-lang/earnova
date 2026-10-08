'use client'
//
// LayersPanel — right sidebar (bottom half).
//
// Lists every element on the canvas in reverse zIndex order (the topmost
// layer appears first in the list). Each row shows:
//   drag-handle  icon  name  visibility-toggle  lock-toggle  delete
//
// Drag a row up/down to reorder the layer stack. Click selects. Toggles fire
// immediately. The parent owns all state.
//
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { CanvasElement } from './canvas-types'
import { ElementIcon } from './properties-panel'
import {
  Eye, EyeOff, Lock, Unlock, Trash2, Plus, GripVertical,
} from 'lucide-react'

type Props = {
  elements: CanvasElement[]
  selectedId: string | null
  onSelect: (id: string) => void
  onToggleVisible: (id: string) => void
  onToggleLock: (id: string) => void
  onDelete: (id: string) => void
  onReorder: (sourceId: string, targetId: string) => void
  onAddLayer: () => void
}

/* ──────────────────────────────────────────────────────────────────────────
   Derive a friendly name for each element.
   ────────────────────────────────────────────────────────────────────────── */
function elementName(el: CanvasElement): string {
  if (el.type === 'TEXT' && el.text) {
    const trimmed = el.text.trim().replace(/\s+/g, ' ')
    return trimmed.length > 22 ? trimmed.slice(0, 22) + '…' : trimmed
  }
  if (el.type === 'STICKER') return el.emoji ? `Sticker ${el.emoji}` : 'Sticker'
  if (el.type === 'IMAGE') return 'Image'
  if (el.type === 'SHAPE') {
    const map: Record<string, string> = {
      rect: 'Rectangle', circle: 'Circle', triangle: 'Triangle', line: 'Line',
    }
    return map[el.shape || 'rect'] || 'Shape'
  }
  return el.type
}

export function LayersPanel({
  elements, selectedId, onSelect, onToggleVisible, onToggleLock, onDelete,
  onReorder, onAddLayer,
}: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // Sort by zIndex DESC (topmost layer first).
  const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex)

  const handleDragStart = (id: string) => (e: React.DragEvent<HTMLDivElement>) => {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (id: string) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== draggingId) setOverId(id)
  }

  const handleDrop = (id: string) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const srcId = e.dataTransfer.getData('text/plain') || draggingId
    setDraggingId(null)
    setOverId(null)
    if (srcId && srcId !== id) onReorder(srcId, id)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setOverId(null)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3 w-1 rounded-full bg-gradient-to-b from-evergreen to-gold" />
          <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Layers
          </h4>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            {elements.length}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px] text-evergreen hover:bg-evergreen/5"
          onClick={onAddLayer}
          title="Add a text layer"
        >
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      {elements.length === 0 ? (
        <div className="rounded-md border border-dashed border-evergreen/20 bg-evergreen/5 px-3 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            No layers yet.
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Add text, shapes, stickers, or images from the left toolbar.
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="space-y-1">
            {sorted.map(el => {
              const isSelected = el.id === selectedId
              const isDragging = el.id === draggingId
              const isOver = el.id === overId
              return (
                <div
                  key={el.id}
                  draggable={!el.locked}
                  onDragStart={handleDragStart(el.id)}
                  onDragOver={handleDragOver(el.id)}
                  onDrop={handleDrop(el.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelect(el.id)}
                  className={cn(
                    'group flex items-center gap-1.5 rounded-md border px-1.5 py-1.5 text-xs transition-all cursor-pointer',
                    isSelected
                      ? 'border-evergreen bg-evergreen/10 ring-1 ring-evergreen/30'
                      : 'border-border bg-card hover:bg-evergreen/5 hover:border-evergreen/30',
                    isDragging && 'opacity-50',
                    isOver && 'border-t-2 border-t-evergreen',
                  )}
                  title={el.locked ? 'Unlock to drag-reorder' : 'Drag to reorder'}
                >
                  {/* Drag handle */}
                  <GripVertical
                    className={cn(
                      'h-3.5 w-3.5 flex-shrink-0',
                      el.locked
                        ? 'text-muted-foreground/30'
                        : 'cursor-grab text-muted-foreground hover:text-evergreen active:cursor-grabbing',
                    )}
                  />

                  {/* Icon */}
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-evergreen/10 text-evergreen">
                    <ElementIcon type={el.type} emoji={el.emoji} shape={el.shape} />
                  </span>

                  {/* Name */}
                  <span
                    className={cn(
                      'flex-1 truncate',
                      !el.visible && 'text-muted-foreground line-through opacity-60',
                    )}
                  >
                    {elementName(el)}
                  </span>

                  {/* Visibility toggle */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      onToggleVisible(el.id)
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-evergreen/10 hover:text-evergreen"
                    title={el.visible ? 'Hide layer' : 'Show layer'}
                    aria-label={el.visible ? 'Hide layer' : 'Show layer'}
                  >
                    {el.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </button>

                  {/* Lock toggle */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      onToggleLock(el.id)
                    }}
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-evergreen/10 hover:text-evergreen',
                      el.locked ? 'text-gold-dark' : 'text-muted-foreground',
                    )}
                    title={el.locked ? 'Unlock layer' : 'Lock layer'}
                    aria-label={el.locked ? 'Unlock layer' : 'Lock layer'}
                  >
                    {el.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      onDelete(el.id)
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    title="Delete layer"
                    aria-label="Delete layer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
