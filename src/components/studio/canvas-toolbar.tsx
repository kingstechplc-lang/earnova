'use client'
//
// CanvasToolbar — left sidebar.
//
// Sections (top to bottom):
//   1. Add elements  — Text, Shape dropdown, Sticker popover, Image dialog
//   2. Templates     — gallery of CANVAS_TEMPLATES (load replaces canvas)
//   3. Canvas        — preset selector + background gradient picker
//   4. Export        — PNG (html-to-image) + JSON download
//   5. History/Zoom  — undo, redo, zoom-in, zoom-out, fit, 100%
//
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  BACKGROUND_GRADIENTS, CANVAS_PRESETS, CANVAS_TEMPLATES, SHAPES,
  type ShapeType,
} from './canvas-types'
import { EmojiPicker } from './emoji-picker'
import {
  Type, Square, Circle, Triangle, Minus, Smile, Image as ImageIcon,
  Download, FileJson, Undo2, Redo2, ZoomIn, ZoomOut, Maximize,
  LayoutTemplate, Plus, Sparkles,
} from 'lucide-react'

type Props = {
  onAddText: () => void
  onAddShape: (shape: ShapeType) => void
  onAddSticker: (emoji: string) => void
  onAddImage: (src: string) => void
  onLoadTemplate: (templateId: string) => void
  onSetPreset: (presetId: string) => void
  onSetBackground: (key: string) => void
  onExportPng: () => void
  onExportJson: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
  onZoomFit: () => void
  activePresetId: string | null
  activeBackground: string
  unsavedChanges: boolean
}

const shapeIcons: Record<ShapeType, React.ReactNode> = {
  rect: <Square className="h-3.5 w-3.5" />,
  circle: <Circle className="h-3.5 w-3.5" />,
  triangle: <Triangle className="h-3.5 w-3.5" />,
  line: <Minus className="h-3.5 w-3.5" />,
}

export function CanvasToolbar(props: Props) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState('')

  const handleAddImage = () => {
    if (!imageSrc.trim()) return
    props.onAddImage(imageSrc.trim())
    setImageSrc('')
    setImageDialogOpen(false)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Brand / title strip */}
      <div className="border-b border-evergreen/15 bg-gradient-to-br from-evergreen/5 to-gold/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-serif text-sm font-bold leading-tight">Studio</p>
            <p className="text-[10px] text-muted-foreground">
              {props.unsavedChanges ? 'Unsaved changes' : 'All changes saved'}
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 p-3">
          {/* Add elements */}
          <ToolbarSection title="Add element" icon={<Plus className="h-3 w-3" />}>
            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start border-evergreen/30 text-evergreen hover:bg-evergreen/5"
              onClick={props.onAddText}
            >
              <Type className="h-3.5 w-3.5" /> Text
            </Button>

            <div className="grid grid-cols-4 gap-1">
              {SHAPES.map(s => (
                <Button
                  key={s.type}
                  size="sm"
                  variant="outline"
                  className="h-9 flex-col gap-0.5 px-1 text-[9px] border-evergreen/30 text-evergreen hover:bg-evergreen/5"
                  onClick={() => props.onAddShape(s.type)}
                  title={`Add ${s.label}`}
                >
                  {shapeIcons[s.type]}
                  <span>{s.label}</span>
                </Button>
              ))}
            </div>

            <EmojiPicker onPick={props.onAddSticker} triggerLabel="Sticker" />

            <Button
              size="sm"
              variant="outline"
              className="w-full justify-start border-evergreen/30 text-evergreen hover:bg-evergreen/5"
              onClick={() => setImageDialogOpen(true)}
            >
              <ImageIcon className="h-3.5 w-3.5" /> Image (URL)
            </Button>
          </ToolbarSection>

          {/* Templates */}
          <ToolbarSection title="Templates" icon={<LayoutTemplate className="h-3 w-3" />}>
            <div className="grid grid-cols-2 gap-1.5">
              {CANVAS_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => props.onLoadTemplate(tpl.id)}
                  className="group relative overflow-hidden rounded-md border border-border p-2 text-left transition-all hover:-translate-y-0.5 hover:border-evergreen/40 hover:shadow-sm"
                  title={tpl.description}
                >
                  <div
                    className="absolute inset-0 opacity-90"
                    style={{
                      background: BACKGROUND_GRADIENTS[tpl.background] || BACKGROUND_GRADIENTS['evergreen-gold'],
                    }}
                    aria-hidden
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" aria-hidden />
                  <div className="relative">
                    <div className="text-base">{tpl.icon}</div>
                    <p className="mt-1 text-[10px] font-semibold text-white drop-shadow-sm line-clamp-1">
                      {tpl.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ToolbarSection>

          {/* Canvas settings */}
          <ToolbarSection title="Canvas" icon={<Sparkles className="h-3 w-3" />}>
            <Field label="Size preset">
              <Select
                value={props.activePresetId || 'custom'}
                onValueChange={props.onSetPreset}
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANVAS_PRESETS.map(p => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      <span className="mr-1">{p.icon}</span> {p.name}
                      <span className="ml-1 text-muted-foreground">
                        {p.width}×{p.height}
                      </span>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-xs">
                    Custom size
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Background">
              <div className="grid grid-cols-4 gap-1.5">
                {Object.entries(BACKGROUND_GRADIENTS).map(([key, css]) => {
                  const isActive = props.activeBackground === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => props.onSetBackground(key)}
                      className={cn(
                        'h-7 rounded-md border transition-all',
                        isActive
                          ? 'border-evergreen ring-2 ring-evergreen/40'
                          : 'border-border hover:scale-110',
                      )}
                      style={{ background: css }}
                      aria-label={key}
                      title={key}
                    />
                  )
                })}
              </div>
            </Field>
          </ToolbarSection>

          {/* Export */}
          <ToolbarSection title="Export" icon={<Download className="h-3 w-3" />}>
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-evergreen to-evergreen-dark text-cream hover:shadow-festive"
              onClick={props.onExportPng}
            >
              <Download className="h-3.5 w-3.5" /> Download PNG
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-evergreen/30 text-evergreen hover:bg-evergreen/5"
              onClick={props.onExportJson}
            >
              <FileJson className="h-3.5 w-3.5" /> Download JSON
            </Button>
          </ToolbarSection>

          {/* History */}
          <ToolbarSection title="History & zoom" icon={<Undo2 className="h-3 w-3" />}>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-evergreen/30 text-evergreen hover:bg-evergreen/5 disabled:opacity-40"
                onClick={props.onUndo}
                disabled={!props.canUndo}
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-evergreen/30 text-evergreen hover:bg-evergreen/5 disabled:opacity-40"
                onClick={props.onRedo}
                disabled={!props.canRedo}
              >
                <Redo2 className="h-3.5 w-3.5" /> Redo
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-1">
              <Button size="sm" variant="outline" className="h-8 px-1" onClick={props.onZoomOut} title="Zoom out">
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <div className="col-span-2 flex h-8 items-center justify-center rounded-md border border-border bg-muted/30 px-1 text-[10px] font-mono">
                {Math.round(props.zoom * 100)}%
              </div>
              <Button size="sm" variant="outline" className="h-8 px-1" onClick={props.onZoomIn} title="Zoom in">
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <Button size="sm" variant="outline" className="h-8 border-evergreen/30 text-evergreen hover:bg-evergreen/5" onClick={props.onZoomReset} title="Reset to 100%">
                100%
              </Button>
              <Button size="sm" variant="outline" className="h-8 border-evergreen/30 text-evergreen hover:bg-evergreen/5" onClick={props.onZoomFit} title="Fit to viewport">
                <Maximize className="h-3.5 w-3.5" /> Fit
              </Button>
            </div>
          </ToolbarSection>
        </div>
      </ScrollArea>

      {/* Image URL dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Add image from URL</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Image URL
            </Label>
            <Input
              value={imageSrc}
              onChange={e => setImageSrc(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="text-sm"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddImage()
              }}
            />
            <p className="text-[10px] text-muted-foreground">
              Paste a direct image URL. Use a CDN-hosted image for the best result.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button
              size="sm"
              className="bg-gradient-to-r from-evergreen to-evergreen-dark text-cream"
              onClick={handleAddImage}
              disabled={!imageSrc.trim()}
            >
              Add image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Small layout helpers
   ────────────────────────────────────────────────────────────────────────── */
function ToolbarSection({
  title, icon, children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="h-3 w-1 rounded-full bg-gradient-to-b from-evergreen to-gold" />
        {icon && <span className="text-evergreen">{icon}</span>}
        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Field({
  label, children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}
