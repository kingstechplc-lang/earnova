'use client'
//
// PropertiesPanel — right sidebar (top half).
//
// Two modes:
//   1. Element selected → show type-specific editing controls.
//   2. Nothing selected → show canvas-level settings (preset, background, size).
//
// All edits dispatch back to the parent via `onUpdateElement` /
// `onUpdateCanvas`. The parent decides whether each edit commits to history.
//
import { useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  BACKGROUND_GRADIENTS, CANVAS_PRESETS, FONT_FAMILIES, SHAPES,
  type CanvasElement, type CanvasData, type ShapeType,
} from './canvas-types'
import { EmojiGrid } from './emoji-picker'
import {
  Trash2, BringToFront, SendToBack, ArrowUp, ArrowDown,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Square, Circle, Triangle, Minus,
} from 'lucide-react'

export type LayerAction = 'forward' | 'backward' | 'front' | 'back'

type Props = {
  selected: CanvasElement | null
  canvas: CanvasData['canvas']
  onUpdateElement: (id: string, patch: Partial<CanvasElement>) => void
  onUpdateCanvas: (patch: Partial<CanvasData['canvas']>) => void
  onLayerAction: (id: string, action: LayerAction) => void
  onDelete: (id: string) => void
}

/* ──────────────────────────────────────────────────────────────────────────
   Small reusable field components
   ────────────────────────────────────────────────────────────────────────── */
function FieldRow({
  label, children, className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

function NumberInput({
  value, onChange, min, max, step = 1, suffix,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        onChange={e => {
          const v = parseFloat(e.target.value)
          if (Number.isNaN(v)) return
          onChange(v)
        }}
        min={min}
        max={max}
        step={step}
        className="h-8 pr-6 text-xs"
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  )
}

function ColorField({
  value, onChange, allowTransparent = false,
}: {
  value: string | undefined
  onChange: (v: string) => void
  allowTransparent?: boolean
}) {
  const isTransparent = !value || value === 'transparent'
  // Use a safe fallback for the color input (must be a hex)
  const safeHex = isTransparent ? '#ffffff' : (value?.startsWith('#') ? value : '#ffffff')

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-8 w-8 flex-shrink-0">
        <input
          type="color"
          value={safeHex}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer rounded-md border border-input opacity-100"
          aria-label="Pick color"
        />
        {isTransparent && (
          <div className="pointer-events-none absolute inset-0 rounded-md border border-input bg-[linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%),linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%)] bg-[length:8px_8px] bg-[0_0,4px_4px]" />
        )}
      </div>
      <Input
        type="text"
        value={isTransparent ? 'transparent' : value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="#000000"
        className="h-8 flex-1 text-xs font-mono"
      />
      {allowTransparent && !isTransparent && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[10px]"
          onClick={() => onChange('transparent')}
          title="Make transparent"
        >
          ∅
        </Button>
      )}
    </div>
  )
}

function SliderRow({
  label, value, min, max, step = 1, suffix, onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </Label>
        <span className="text-[11px] font-mono text-foreground">
          {Math.round(value * 100) / 100}{suffix || ''}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={arr => onChange(arr[0] ?? value)}
        className="h-3"
      />
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Section heading
   ────────────────────────────────────────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="h-3 w-1 rounded-full bg-gradient-to-b from-evergreen to-gold" />
      <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground">
        {children}
      </h4>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Main panel
   ────────────────────────────────────────────────────────────────────────── */
export function PropertiesPanel({
  selected, canvas, onUpdateElement, onUpdateCanvas, onLayerAction, onDelete,
}: Props) {
  const update = useCallback(
    (patch: Partial<CanvasElement>) => {
      if (selected) onUpdateElement(selected.id, patch)
    },
    [selected, onUpdateElement],
  )

  /* ── Canvas properties (no element selected) ───────────────────────── */
  if (!selected) {
    return (
      <div className="space-y-5">
        <SectionTitle>Canvas</SectionTitle>

        <FieldRow label="Size preset">
          <Select
            value={CANVAS_PRESETS.find(p => p.width === canvas.width && p.height === canvas.height)?.id || 'custom'}
            onValueChange={id => {
              const preset = CANVAS_PRESETS.find(p => p.id === id)
              if (preset) {
                onUpdateCanvas({ width: preset.width, height: preset.height })
              }
            }}
          >
            <SelectTrigger className="h-8 w-full text-xs">
              <SelectValue placeholder="Pick preset" />
            </SelectTrigger>
            <SelectContent>
              {CANVAS_PRESETS.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  <span className="mr-1">{p.icon}</span> {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <div className="grid grid-cols-2 gap-2">
          <FieldRow label="Width">
            <NumberInput
              value={canvas.width}
              onChange={v => onUpdateCanvas({ width: Math.max(50, v) })}
              min={50}
              max={4000}
              suffix="px"
            />
          </FieldRow>
          <FieldRow label="Height">
            <NumberInput
              value={canvas.height}
              onChange={v => onUpdateCanvas({ height: Math.max(50, v) })}
              min={50}
              max={4000}
              suffix="px"
            />
          </FieldRow>
        </div>

        <FieldRow label="Background">
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(BACKGROUND_GRADIENTS).map(([key, css]) => {
              const isActive = canvas.background === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onUpdateCanvas({
                    background: key,
                    backgroundType: css.startsWith('#') ? 'solid' : 'gradient',
                  })}
                  className={cn(
                    'h-10 rounded-md border transition-all',
                    isActive
                      ? 'border-evergreen ring-2 ring-evergreen/40'
                      : 'border-border hover:scale-105 hover:border-evergreen/50',
                  )}
                  style={{ background: css, backgroundSize: 'cover' }}
                  aria-label={`Set background ${key}`}
                  title={key}
                />
              )
            })}
          </div>
        </FieldRow>

        <p className="rounded-md bg-muted/50 p-2 text-[10px] leading-snug text-muted-foreground">
          Click any element on the canvas to edit its properties here.
        </p>
      </div>
    )
  }

  /* ── Element common props ─────────────────────────────────────────── */
  const el = selected

  return (
    <div className="space-y-5">
      {/* Header + delete */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-evergreen/10 text-evergreen">
            <ElementIcon type={el.type} emoji={el.emoji} shape={el.shape} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide">{el.type}</p>
            <p className="text-[10px] text-muted-foreground">{el.id.slice(0, 12)}…</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(el.id)}
          title="Delete element"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Position + size */}
      <div>
        <SectionTitle>Transform</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <FieldRow label="X">
            <NumberInput value={el.x} onChange={v => update({ x: v })} suffix="px" />
          </FieldRow>
          <FieldRow label="Y">
            <NumberInput value={el.y} onChange={v => update({ y: v })} suffix="px" />
          </FieldRow>
          <FieldRow label="Width">
            <NumberInput
              value={el.width}
              onChange={v => update({ width: Math.max(4, v) })}
              min={4}
              suffix="px"
            />
          </FieldRow>
          <FieldRow label="Height">
            <NumberInput
              value={el.height}
              onChange={v => update({ height: Math.max(4, v) })}
              min={4}
              suffix="px"
            />
          </FieldRow>
        </div>
      </div>

      <SliderRow
        label="Rotation"
        value={el.rotation}
        min={0}
        max={360}
        step={1}
        suffix="°"
        onChange={v => update({ rotation: v })}
      />

      <SliderRow
        label="Opacity"
        value={Math.round(el.opacity * 100)}
        min={0}
        max={100}
        step={1}
        suffix="%"
        onChange={v => update({ opacity: v / 100 })}
      />

      {/* Layer order */}
      <div>
        <SectionTitle>Layer</SectionTitle>
        <div className="grid grid-cols-4 gap-1">
          <Button size="sm" variant="outline" className="h-8 flex-col gap-0.5 px-1 text-[9px]" onClick={() => onLayerAction(el.id, 'front')} title="Bring to front">
            <BringToFront className="h-3.5 w-3.5" /> Front
          </Button>
          <Button size="sm" variant="outline" className="h-8 flex-col gap-0.5 px-1 text-[9px]" onClick={() => onLayerAction(el.id, 'forward')} title="Bring forward">
            <ArrowUp className="h-3.5 w-3.5" /> Fwd
          </Button>
          <Button size="sm" variant="outline" className="h-8 flex-col gap-0.5 px-1 text-[9px]" onClick={() => onLayerAction(el.id, 'backward')} title="Send backward">
            <ArrowDown className="h-3.5 w-3.5" /> Back
          </Button>
          <Button size="sm" variant="outline" className="h-8 flex-col gap-0.5 px-1 text-[9px]" onClick={() => onLayerAction(el.id, 'back')} title="Send to back">
            <SendToBack className="h-3.5 w-3.5" /> Back
          </Button>
        </div>
      </div>

      {/* Type-specific */}
      {el.type === 'TEXT' && <TextProps el={el} update={update} />}
      {el.type === 'SHAPE' && <ShapeProps el={el} update={update} />}
      {el.type === 'STICKER' && <StickerProps el={el} update={update} />}
      {el.type === 'IMAGE' && <ImageProps el={el} update={update} />}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Type-specific property sections
   ────────────────────────────────────────────────────────────────────────── */
function TextProps({
  el, update,
}: {
  el: CanvasElement
  update: (patch: Partial<CanvasElement>) => void
}) {
  return (
    <>
      <div>
        <SectionTitle>Text</SectionTitle>
        <Textarea
          value={el.text || ''}
          onChange={e => update({ text: e.target.value })}
          rows={3}
          className="text-sm"
          placeholder="Type your text…"
        />
      </div>

      <FieldRow label="Font family">
        <Select
          value={el.fontFamily || FONT_FAMILIES[0].value}
          onValueChange={v => update({ fontFamily: v })}
        >
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map(f => (
              <SelectItem key={f.value} value={f.value} className="text-xs">
                <span style={{ fontFamily: f.value }}>{f.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>

      <div className="grid grid-cols-2 gap-2">
        <FieldRow label="Font size">
          <NumberInput
            value={el.fontSize || 32}
            onChange={v => update({ fontSize: Math.max(4, v) })}
            min={4}
            max={400}
            suffix="px"
          />
        </FieldRow>
        <FieldRow label="Padding">
          <NumberInput
            value={el.padding || 0}
            onChange={v => update({ padding: Math.max(0, v) })}
            min={0}
            max={100}
            suffix="px"
          />
        </FieldRow>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FieldRow label="Line height">
          <NumberInput
            value={el.lineHeight || 1.4}
            onChange={v => update({ lineHeight: Math.max(0.5, v) })}
            min={0.5}
            max={3}
            step={0.1}
          />
        </FieldRow>
        <FieldRow label="Letter spacing">
          <NumberInput
            value={el.letterSpacing || 0}
            onChange={v => update({ letterSpacing: v })}
            step={0.5}
            suffix="px"
          />
        </FieldRow>
      </div>

      {/* Style toggles */}
      <div className="grid grid-cols-2 gap-2">
        <FieldRow label="Style">
          <div className="flex gap-1">
            <StyleToggle
              active={(el.fontWeight || 'normal') === 'bold'}
              onClick={() => update({ fontWeight: el.fontWeight === 'bold' ? 'normal' : 'bold' })}
              title="Bold"
            >
              <Bold className="h-3.5 w-3.5" />
            </StyleToggle>
            <StyleToggle
              active={(el.fontStyle || 'normal') === 'italic'}
              onClick={() => update({ fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic' })}
              title="Italic"
            >
              <Italic className="h-3.5 w-3.5" />
            </StyleToggle>
            <StyleToggle
              active={el.textDecoration === 'underline'}
              onClick={() => update({ textDecoration: el.textDecoration === 'underline' ? 'none' : 'underline' })}
              title="Underline"
            >
              <Underline className="h-3.5 w-3.5" />
            </StyleToggle>
          </div>
        </FieldRow>

        <FieldRow label="Align">
          <div className="flex gap-1">
            <StyleToggle
              active={(el.textAlign || 'center') === 'left'}
              onClick={() => update({ textAlign: 'left' })}
              title="Left"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </StyleToggle>
            <StyleToggle
              active={(el.textAlign || 'center') === 'center'}
              onClick={() => update({ textAlign: 'center' })}
              title="Center"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </StyleToggle>
            <StyleToggle
              active={(el.textAlign || 'center') === 'right'}
              onClick={() => update({ textAlign: 'right' })}
              title="Right"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </StyleToggle>
          </div>
        </FieldRow>
      </div>

      <FieldRow label="Text color">
        <ColorField value={el.color} onChange={v => update({ color: v })} />
      </FieldRow>

      <FieldRow label="Background">
        <ColorField
          value={el.backgroundColor}
          onChange={v => update({ backgroundColor: v })}
          allowTransparent
        />
      </FieldRow>

      <FieldRow label="Border radius">
        <NumberInput
          value={el.borderRadius || 0}
          onChange={v => update({ borderRadius: Math.max(0, v) })}
          min={0}
          max={200}
          suffix="px"
        />
      </FieldRow>

      <FieldRow label="Text shadow">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={el.textShadow ? 'default' : 'outline'}
            className="h-8 flex-1 text-xs"
            onClick={() => update({ textShadow: el.textShadow ? '' : '0 2px 8px rgba(0,0,0,0.3)' })}
          >
            {el.textShadow ? 'On' : 'Off'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-xs"
            onClick={() => update({ textShadow: '0 2px 8px rgba(0,0,0,0.3)' })}
            title="Soft shadow"
          >
            Soft
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 text-xs"
            onClick={() => update({ textShadow: '0 0 20px rgba(255,255,255,0.6)' })}
            title="Glow shadow"
          >
            Glow
          </Button>
        </div>
      </FieldRow>
    </>
  )
}

function ShapeProps({
  el, update,
}: {
  el: CanvasElement
  update: (patch: Partial<CanvasElement>) => void
}) {
  const shapeIcons: Record<ShapeType, React.ReactNode> = {
    rect: <Square className="h-3.5 w-3.5" />,
    circle: <Circle className="h-3.5 w-3.5" />,
    triangle: <Triangle className="h-3.5 w-3.5" />,
    line: <Minus className="h-3.5 w-3.5" />,
  }

  return (
    <>
      <div>
        <SectionTitle>Shape</SectionTitle>
        <div className="grid grid-cols-4 gap-1">
          {SHAPES.map(s => (
            <Button
              key={s.type}
              size="sm"
              variant={el.shape === s.type ? 'default' : 'outline'}
              className="h-9 flex-col gap-0.5 px-1 text-[9px]"
              onClick={() => update({ shape: s.type })}
              title={s.label}
            >
              {shapeIcons[s.type]}
              <span>{s.label}</span>
            </Button>
          ))}
        </div>
      </div>

      <FieldRow label="Fill">
        <ColorField
          value={el.fill}
          onChange={v => update({ fill: v })}
          allowTransparent
        />
      </FieldRow>

      <div className="grid grid-cols-2 gap-2">
        <FieldRow label="Border color">
          <ColorField
            value={el.borderColor}
            onChange={v => update({ borderColor: v })}
            allowTransparent
          />
        </FieldRow>
        <FieldRow label="Border width">
          <NumberInput
            value={el.borderWidth || 0}
            onChange={v => update({ borderWidth: Math.max(0, v) })}
            min={0}
            max={50}
            suffix="px"
          />
        </FieldRow>
      </div>

      {el.shape === 'rect' && (
        <FieldRow label="Border radius">
          <NumberInput
            value={el.borderRadius || 0}
            onChange={v => update({ borderRadius: Math.max(0, v) })}
            min={0}
            max={200}
            suffix="px"
          />
        </FieldRow>
      )}
    </>
  )
}

function StickerProps({
  el, update,
}: {
  el: CanvasElement
  update: (patch: Partial<CanvasElement>) => void
}) {
  return (
    <>
      <div>
        <SectionTitle>Sticker emoji</SectionTitle>
        <div className="rounded-md border border-border p-2">
          <EmojiGrid onPick={emoji => update({ emoji })} />
        </div>
      </div>
      <SliderRow
        label="Emoji size"
        value={el.fontSize || 72}
        min={20}
        max={400}
        step={2}
        suffix="px"
        onChange={v => update({ fontSize: v })}
      />
    </>
  )
}

function ImageProps({
  el, update,
}: {
  el: CanvasElement
  update: (patch: Partial<CanvasElement>) => void
}) {
  return (
    <>
      <FieldRow label="Image URL">
        <Textarea
          value={el.src || ''}
          onChange={e => update({ src: e.target.value })}
          rows={2}
          className="text-xs"
          placeholder="https://…"
        />
      </FieldRow>
      <FieldRow label="Object fit">
        <Select
          value={el.objectFit || 'cover'}
          onValueChange={v => update({ objectFit: v as 'cover' | 'contain' | 'fill' })}
        >
          <SelectTrigger className="h-8 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover" className="text-xs">Cover</SelectItem>
            <SelectItem value="contain" className="text-xs">Contain</SelectItem>
            <SelectItem value="fill" className="text-xs">Fill</SelectItem>
          </SelectContent>
        </Select>
      </FieldRow>
      <FieldRow label="Border radius">
        <NumberInput
          value={el.borderRadius || 0}
          onChange={v => update({ borderRadius: Math.max(0, v) })}
          min={0}
          max={200}
          suffix="px"
        />
      </FieldRow>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Style toggle button
   ────────────────────────────────────────────────────────────────────────── */
function StyleToggle({
  active, onClick, title, children,
}: {
  active: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        'flex h-8 flex-1 items-center justify-center rounded-md border text-xs transition-colors',
        active
          ? 'border-evergreen bg-evergreen/10 text-evergreen'
          : 'border-border bg-background text-muted-foreground hover:bg-evergreen/5',
      )}
    >
      {children}
    </button>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   ElementIcon — small icon for the panel header (mirrors LayersPanel)
   ────────────────────────────────────────────────────────────────────────── */
export function ElementIcon({
  type, emoji, shape,
}: {
  type: CanvasElement['type']
  emoji?: string
  shape?: ShapeType
}) {
  if (type === 'STICKER' && emoji) {
    return <span className="text-sm">{emoji}</span>
  }
  if (type === 'TEXT') return <span className="font-serif text-xs font-bold">T</span>
  if (type === 'IMAGE') return <span className="text-xs">🖼️</span>
  if (type === 'SHAPE') {
    if (shape === 'circle') return <Circle className="h-3.5 w-3.5" />
    if (shape === 'triangle') return <Triangle className="h-3.5 w-3.5" />
    if (shape === 'line') return <Minus className="h-3.5 w-3.5" />
    return <Square className="h-3.5 w-3.5" />
  }
  return null
}
