'use client'
//
// CanvasEditor — the heart of the Earnova Studio.
//
// Three-panel layout (desktop):
//   ┌────────────┬───────────────────────┬─────────────────┐
//   │ Toolbar    │   Canvas (scrollable, │  Properties     │
//   │ (add, tpl, │   zoomable) with      │  Panel          │
//   │  export)   │   draggable elements  ├─────────────────┤
//   │            │                       │  Layers Panel   │
//   └────────────┴───────────────────────┴─────────────────┘
//
// Mobile: panels collapse into a Tabbed bottom-sheet UI.
//
// All element interactions (drag / resize / rotate) are mouse + touch
// capable. Undo/redo backed by a 50-entry history stack. PNG export via
// the `html-to-image` library.
//
import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { safeFetch } from '@/lib/safe-fetch'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  CANVAS_PRESETS, CANVAS_TEMPLATES, BACKGROUND_GRADIENTS,
  SHAPE_CLIP_PATHS,
  createDefaultCanvas, createTextElement, createShapeElement,
  createStickerElement, createImageElement,
  buildImageFilter,
  type CanvasData, type CanvasElement, type ShapeType,
} from './canvas-types'
import { CanvasToolbar } from './canvas-toolbar'
import { PropertiesPanel, type LayerAction } from './properties-panel'
import { LayersPanel } from './layers-panel'
import { EmojiPicker } from './emoji-picker'
import type { StudioProjectType } from '@prisma/client'
import {
  toPng,
} from 'html-to-image'
import {
  ChevronLeft, Save, Loader2, Globe, Sparkles, Grid3x3,
  Plus, Type as TypeIcon, Square, Smile, Image as ImageIcon,
  PanelLeft, PanelRight,
  Copy, ClipboardPaste, Trash2, FlipHorizontal2, FlipVertical2,
  BringToFront, SendToBack, ArrowUp, ArrowDown,
  AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyEnd,
  Keyboard, X,
} from 'lucide-react'

/* ──────────────────────────────────────────────────────────────────────────
   StudioProject — shape persisted by the API.
   The `data` field carries `{ canvas: CanvasData }` for canvas projects.
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

/* ──────────────────────────────────────────────────────────────────────────
   Drag state
   ────────────────────────────────────────────────────────────────────────── */
type DragState =
  | {
      kind: 'move'
      id: string
      startX: number
      startY: number
      origX: number
      origY: number
    }
  | {
      kind: 'resize'
      id: string
      handle: 'tl' | 'tr' | 'bl' | 'br'
      startX: number
      startY: number
      origX: number
      origY: number
      origW: number
      origH: number
    }
  | {
      kind: 'rotate'
      id: string
      centerX: number
      centerY: number
      startAngle: number
      origRotation: number
    }

const MAX_HISTORY = 50

/* ──────────────────────────────────────────────────────────────────────────
   CanvasEditor
   ────────────────────────────────────────────────────────────────────────── */
export function CanvasEditor({
  project, onBack, onSaved, onShareToPage,
}: {
  project: StudioProject
  onBack: () => void
  onSaved?: (p: StudioProject) => void
  onShareToPage?: (projectId: string, title: string) => void
}) {
  /* ── Canvas data state (initialised from project.data.canvas or default) ─ */
  const initialCanvas = useMemo<CanvasData>(() => {
    const stored = project.data?.canvas
    if (stored && stored.canvas && Array.isArray(stored.elements)) {
      return stored as CanvasData
    }
    // Fallback: default square canvas.
    return createDefaultCanvas(CANVAS_PRESETS[0])
  }, [project.data])

  const [canvasData, setCanvasData] = useState<CanvasData>(initialCanvas)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(0.5)
  const [showGrid, setShowGrid] = useState(false)
  const [saving, setSaving] = useState<null | 'save' | 'publish'>(null)
  const [dirty, setDirty] = useState(false)
  const [title, setTitle] = useState(project.title)
  const [mobilePanel, setMobilePanel] = useState<'add' | 'props' | 'layers'>('add')

  /* ── Clipboard + alignment guides + shortcuts hint ─────────────────────── */
  const clipboardRef = useRef<CanvasElement | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [alignmentGuides, setAlignmentGuides] = useState<{ v: boolean; h: boolean }>({ v: false, h: false })

  /* ── History (undo/redo) ──────────────────────────────────────────────── */
  const [history, setHistory] = useState<CanvasData[]>([initialCanvas])
  const [historyIndex, setHistoryIndex] = useState(0)

  /* ── Drag state (mutable ref to avoid re-render on every mousemove) ───── */
  const dragRef = useRef<DragState | null>(null)
  const canvasDataRef = useRef(canvasData)
  useEffect(() => { canvasDataRef.current = canvasData }, [canvasData])
  const canvasRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  /* ── Selected element lookup ──────────────────────────────────────────── */
  const selectedElement = useMemo(
    () => canvasData.elements.find(e => e.id === selectedId) || null,
    [canvasData.elements, selectedId],
  )

  const activePresetId = useMemo(() => {
    return CANVAS_PRESETS.find(
      p => p.width === canvasData.canvas.width && p.height === canvasData.canvas.height,
    )?.id || null
  }, [canvasData.canvas.width, canvasData.canvas.height])

  /* ──────────────────────────────────────────────────────────────────────
     History helpers
     ────────────────────────────────────────────────────────────────────── */
  const pushHistory = useCallback((next: CanvasData) => {
    setHistory(prev => {
      const truncated = prev.slice(0, historyIndex + 1)
      const newHistory = [...truncated, next]
      // Cap history size.
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift()
        setHistoryIndex(newHistory.length - 1)
        return newHistory
      }
      setHistoryIndex(newHistory.length - 1)
      return newHistory
    })
    setDirty(true)
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    setHistoryIndex(newIndex)
    setCanvasData(history[newIndex])
    setDirty(true)
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    const newIndex = historyIndex + 1
    setHistoryIndex(newIndex)
    setCanvasData(history[newIndex])
    setDirty(true)
  }, [history, historyIndex])

  /* ──────────────────────────────────────────────────────────────────────
     Element mutations
     ────────────────────────────────────────────────────────────────────── */
  const updateElement = useCallback((id: string, patch: Partial<CanvasElement>, commit = true) => {
    setCanvasData(prev => {
      const next: CanvasData = {
        ...prev,
        elements: prev.elements.map(el =>
          el.id === id ? { ...el, ...patch } : el,
        ),
      }
      if (commit) pushHistory(next)
      return next
    })
  }, [pushHistory])

  // Live (non-committing) update during drag — avoids flooding history.
  const updateElementLive = useCallback((id: string, patch: Partial<CanvasElement>) => {
    setCanvasData(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === id ? { ...el, ...patch } : el,
      ),
    }))
  }, [])

  const updateCanvas = useCallback((patch: Partial<CanvasData['canvas']>) => {
    setCanvasData(prev => {
      const next: CanvasData = {
        ...prev,
        canvas: { ...prev.canvas, ...patch },
      }
      pushHistory(next)
      return next
    })
  }, [pushHistory])

  const addElement = useCallback((el: CanvasElement) => {
    setCanvasData(prev => {
      // Bump zIndex above all existing elements.
      const maxZ = prev.elements.reduce((m, e) => Math.max(m, e.zIndex), 0)
      const elWithZ: CanvasElement = { ...el, zIndex: maxZ + 1 }
      const next: CanvasData = {
        ...prev,
        elements: [...prev.elements, elWithZ],
      }
      pushHistory(next)
      return next
    })
    setSelectedId(el.id)
  }, [pushHistory])

  const removeElement = useCallback((id: string) => {
    setCanvasData(prev => {
      const next: CanvasData = {
        ...prev,
        elements: prev.elements.filter(e => e.id !== id),
      }
      pushHistory(next)
      return next
    })
    if (selectedId === id) setSelectedId(null)
  }, [pushHistory, selectedId])

  const toggleVisible = useCallback((id: string) => {
    setCanvasData(prev => {
      const next: CanvasData = {
        ...prev,
        elements: prev.elements.map(el =>
          el.id === id ? { ...el, visible: !el.visible } : el,
        ),
      }
      pushHistory(next)
      return next
    })
  }, [pushHistory])

  const toggleLock = useCallback((id: string) => {
    setCanvasData(prev => {
      const next: CanvasData = {
        ...prev,
        elements: prev.elements.map(el =>
          el.id === id ? { ...el, locked: !el.locked } : el,
        ),
      }
      pushHistory(next)
      return next
    })
  }, [pushHistory])

  const layerAction = useCallback((id: string, action: LayerAction) => {
    setCanvasData(prev => {
      const sorted = [...prev.elements].sort((a, b) => a.zIndex - b.zIndex)
      const idx = sorted.findIndex(e => e.id === id)
      if (idx === -1) return prev
      const target = sorted[idx]
      let newArr = sorted
      if (action === 'forward' && idx < sorted.length - 1) {
        newArr = [...sorted]
        const next = newArr[idx + 1]
        newArr[idx + 1] = target
        newArr[idx] = next
      } else if (action === 'backward' && idx > 0) {
        newArr = [...sorted]
        const prevEl = newArr[idx - 1]
        newArr[idx - 1] = target
        newArr[idx] = prevEl
      } else if (action === 'front') {
        newArr = sorted.filter(e => e.id !== id)
        newArr.push(target)
      } else if (action === 'back') {
        newArr = sorted.filter(e => e.id !== id)
        newArr.unshift(target)
      }
      // Reassign zIndex sequentially.
      const remapped = newArr.map((e, i) => ({ ...e, zIndex: i + 1 }))
      const next: CanvasData = { ...prev, elements: remapped }
      pushHistory(next)
      return next
    })
  }, [pushHistory])

  const reorderLayers = useCallback((sourceId: string, targetId: string) => {
    setCanvasData(prev => {
      const sorted = [...prev.elements].sort((a, b) => a.zIndex - b.zIndex)
      const srcIdx = sorted.findIndex(e => e.id === sourceId)
      const tgtIdx = sorted.findIndex(e => e.id === targetId)
      if (srcIdx === -1 || tgtIdx === -1 || srcIdx === tgtIdx) return prev
      const newArr = [...sorted]
      const [moved] = newArr.splice(srcIdx, 1)
      newArr.splice(tgtIdx, 0, moved)
      const remapped = newArr.map((e, i) => ({ ...e, zIndex: i + 1 }))
      const next: CanvasData = { ...prev, elements: remapped }
      pushHistory(next)
      return next
    })
  }, [pushHistory])

  /* ──────────────────────────────────────────────────────────────────────
     Element actions — duplicate / copy / paste / flip / align
     ────────────────────────────────────────────────────────────────────── */
  const duplicateElement = useCallback((id: string) => {
    const el = canvasDataRef.current.elements.find(x => x.id === id)
    if (!el) return
    const clone: CanvasElement = {
      ...el,
      id: 'el-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      x: el.x + 20,
      y: el.y + 20,
    }
    addElement(clone)
  }, [addElement])

  const copyElement = useCallback((id: string) => {
    const el = canvasDataRef.current.elements.find(x => x.id === id)
    if (!el) return
    clipboardRef.current = { ...el }
    toast({ title: 'Copied', description: 'Press Ctrl+V to paste' })
  }, [])

  const pasteElement = useCallback(() => {
    const clip = clipboardRef.current
    if (!clip) return
    const clone: CanvasElement = {
      ...clip,
      id: 'el-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      x: clip.x + 24,
      y: clip.y + 24,
    }
    addElement(clone)
  }, [addElement])

  const flipElement = useCallback((id: string, axis: 'h' | 'v') => {
    if (axis === 'h') updateElement(id, { flipH: !canvasDataRef.current.elements.find(x => x.id === id)?.flipH })
    else updateElement(id, { flipV: !canvasDataRef.current.elements.find(x => x.id === id)?.flipV })
  }, [updateElement])

  const alignElement = useCallback((id: string, alignment: 'center-h' | 'center-v' | 'left' | 'right' | 'top' | 'bottom') => {
    const el = canvasDataRef.current.elements.find(x => x.id === id)
    if (!el) return
    const cw = canvasDataRef.current.canvas.width
    const ch = canvasDataRef.current.canvas.height
    const patch: Partial<CanvasElement> = {}
    if (alignment === 'center-h') { patch.x = (cw - el.width) / 2 }
    else if (alignment === 'center-v') { patch.y = (ch - el.height) / 2 }
    else if (alignment === 'left')   { patch.x = 0 }
    else if (alignment === 'right')  { patch.x = cw - el.width }
    else if (alignment === 'top')    { patch.y = 0 }
    else if (alignment === 'bottom') { patch.y = ch - el.height }
    updateElement(id, patch)
  }, [updateElement])

  /* ──────────────────────────────────────────────────────────────────────
     Add element factories
     ────────────────────────────────────────────────────────────────────── */
  const addText = useCallback(() => {
    const cx = canvasData.canvas.width / 2 - 200
    const cy = canvasData.canvas.height / 2 - 30
    addElement(createTextElement('Your text here', cx, cy))
  }, [canvasData.canvas.width, canvasData.canvas.height, addElement])

  const addShape = useCallback((shape: ShapeType) => {
    const cx = canvasData.canvas.width / 2 - 100
    const cy = canvasData.canvas.height / 2 - 100
    addElement(createShapeElement(shape, cx, cy))
  }, [canvasData.canvas.width, canvasData.canvas.height, addElement])

  const addSticker = useCallback((emoji: string) => {
    const cx = canvasData.canvas.width / 2 - 50
    const cy = canvasData.canvas.height / 2 - 50
    addElement(createStickerElement(emoji, cx, cy))
  }, [canvasData.canvas.width, canvasData.canvas.height, addElement])

  const addImage = useCallback((src: string) => {
    const cx = canvasData.canvas.width / 2 - 150
    const cy = canvasData.canvas.height / 2 - 150
    addElement(createImageElement(src, cx, cy))
  }, [canvasData.canvas.width, canvasData.canvas.height, addElement])

  /* ──────────────────────────────────────────────────────────────────────
     Template / preset / background
     ────────────────────────────────────────────────────────────────────── */
  const loadTemplate = useCallback((templateId: string) => {
    const tpl = CANVAS_TEMPLATES.find(t => t.id === templateId)
    if (!tpl) return
    const preset = CANVAS_PRESETS.find(p => p.id === tpl.presetId) || CANVAS_PRESETS[0]
    // Deep-clone elements + assign fresh IDs.
    const newElements = tpl.elements.map((el, i) => ({
      ...el,
      id: 'el-' + Date.now().toString(36) + '-' + i + '-' + Math.random().toString(36).slice(2, 6),
      zIndex: i + 1,
    }))
    const next: CanvasData = {
      canvas: {
        width: preset.width,
        height: preset.height,
        background: tpl.background,
        backgroundType: tpl.background.startsWith('solid') ? 'solid' : 'gradient',
      },
      elements: newElements,
    }
    setCanvasData(next)
    setSelectedId(null)
    pushHistory(next)
    toast({ title: 'Template loaded', description: tpl.name })
  }, [pushHistory])

  const setPreset = useCallback((presetId: string) => {
    const preset = CANVAS_PRESETS.find(p => p.id === presetId)
    if (!preset) return
    updateCanvas({ width: preset.width, height: preset.height })
  }, [updateCanvas])

  const setBackground = useCallback((key: string) => {
    const css = BACKGROUND_GRADIENTS[key]
    updateCanvas({
      background: key,
      backgroundType: css && css.startsWith('#') ? 'solid' : 'gradient',
    })
  }, [updateCanvas])

  /* ──────────────────────────────────────────────────────────────────────
     Apply an Earnova color palette — picks the first two colors as a
     gradient for the canvas background and stashes the rest in the
     canvasData for the Brand Kit to surface. Saves a custom gradient
     using the palette's hex colors directly (no lookup needed).
     ────────────────────────────────────────────────────────────────────── */
  const applyPalette = useCallback((colors: string[]) => {
    if (!colors || colors.length < 2) return
    const grad = `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`
    // Update the canvas background by storing the full CSS gradient string
    // directly (BACKGROUND_GRADIENTS lookup falls back to the raw value).
    updateCanvas({
      background: grad,
      backgroundType: 'gradient',
    })
    toast({
      title: 'Palette applied',
      description: `${colors.length} colors updated your canvas background.`,
    })
  }, [updateCanvas])

  /* ──────────────────────────────────────────────────────────────────────
     Zoom helpers
     ────────────────────────────────────────────────────────────────────── */
  const computeFitZoom = useCallback(() => {
    if (!viewportRef.current) return 0.5
    const vp = viewportRef.current.getBoundingClientRect()
    const padding = 80
    const availW = vp.width - padding
    const availH = vp.height - padding
    const w = canvasData.canvas.width
    const h = canvasData.canvas.height
    const z = Math.min(availW / w, availH / h, 1)
    return Math.max(0.05, Math.min(2, z))
  }, [canvasData.canvas.width, canvasData.canvas.height])

  const zoomIn = useCallback(() => setZoom(z => Math.min(2, +(z + 0.1).toFixed(2))), [])
  const zoomOut = useCallback(() => setZoom(z => Math.max(0.1, +(z - 0.1).toFixed(2))), [])
  const zoomReset = useCallback(() => setZoom(1), [])
  const zoomFit = useCallback(() => setZoom(computeFitZoom()), [computeFitZoom])

  // Fit on mount and whenever canvas size changes.
  useEffect(() => {
    setZoom(computeFitZoom())
  }, [computeFitZoom])

  /* ──────────────────────────────────────────────────────────────────────
     Drag / resize / rotate
     ────────────────────────────────────────────────────────────────────── */
  // Start moving an element.
  const handleElementMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent, el: CanvasElement) => {
    if (el.locked) return
    e.stopPropagation()
    setSelectedId(el.id)
    const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent)
    dragRef.current = {
      kind: 'move',
      id: el.id,
      startX: point.clientX,
      startY: point.clientY,
      origX: el.x,
      origY: el.y,
    }
  }, [])

  const handleResizeMouseDown = useCallback((
    e: React.MouseEvent | React.TouchEvent,
    el: CanvasElement,
    handle: 'tl' | 'tr' | 'bl' | 'br',
  ) => {
    if (el.locked) return
    e.stopPropagation()
    e.preventDefault()
    const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent)
    dragRef.current = {
      kind: 'resize',
      id: el.id,
      handle,
      startX: point.clientX,
      startY: point.clientY,
      origX: el.x,
      origY: el.y,
      origW: el.width,
      origH: el.height,
    }
  }, [])

  const handleRotateMouseDown = useCallback((
    e: React.MouseEvent | React.TouchEvent,
    el: CanvasElement,
  ) => {
    if (el.locked) return
    e.stopPropagation()
    e.preventDefault()
    setSelectedId(el.id)
    const point = 'touches' in e ? e.touches[0] : (e as React.MouseEvent)
    // Center of the element in screen coordinates.
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const cxScreen = rect.left + (el.x + el.width / 2) * zoom
    const cyScreen = rect.top + (el.y + el.height / 2) * zoom
    const startAngle = Math.atan2(point.clientY - cyScreen, point.clientX - cxScreen)
    dragRef.current = {
      kind: 'rotate',
      id: el.id,
      centerX: cxScreen,
      centerY: cyScreen,
      startAngle,
      origRotation: el.rotation,
    }
  }, [zoom])

  /* Global mousemove / mouseup handlers attached to window. */
  useEffect(() => {
    const move = (e: MouseEvent | TouchEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const point = 'touches' in e ? e.touches[0] : (e as MouseEvent)
      if (!point) return
      // Prevent page scroll during touch drag.
      if ('touches' in e) e.preventDefault()

      if (drag.kind === 'move') {
        const dx = (point.clientX - drag.startX) / zoom
        const dy = (point.clientY - drag.startY) / zoom
        const newX = drag.origX + dx
        const newY = drag.origY + dy
        // Snap to grid if enabled (10px grid).
        let sx = showGrid ? Math.round(newX / 10) * 10 : newX
        let sy = showGrid ? Math.round(newY / 10) * 10 : newY
        // ── Snap-to-center: if the element's center is near the canvas
        //    center (within 12px), snap to the exact center and show
        //    alignment guide lines. ─────────────────────────────────────
        const draggedEl = canvasDataRef.current.elements.find(x => x.id === drag.id)
        if (draggedEl) {
          const cw = canvasDataRef.current.canvas.width
          const ch = canvasDataRef.current.canvas.height
          const elCx = sx + draggedEl.width / 2
          const elCy = sy + draggedEl.height / 2
          const tol = 12
          let vGuide = false, hGuide = false
          if (Math.abs(elCx - cw / 2) < tol) {
            sx = (cw - draggedEl.width) / 2
            vGuide = true
          }
          if (Math.abs(elCy - ch / 2) < tol) {
            sy = (ch - draggedEl.height) / 2
            hGuide = true
          }
          setAlignmentGuides(prev => (prev.v !== vGuide || prev.h !== hGuide ? { v: vGuide, h: hGuide } : prev))
        }
        updateElementLive(drag.id, { x: sx, y: sy })
      } else if (drag.kind === 'resize') {
        const dx = (point.clientX - drag.startX) / zoom
        const dy = (point.clientY - drag.startY) / zoom
        let { origX, origY, origW, origH } = drag
        let newX = origX, newY = origY, newW = origW, newH = origH
        if (drag.handle === 'br') {
          newW = Math.max(10, origW + dx)
          newH = Math.max(10, origH + dy)
        } else if (drag.handle === 'tr') {
          newW = Math.max(10, origW + dx)
          newH = Math.max(10, origH - dy)
          newY = origY + (origH - newH)
        } else if (drag.handle === 'bl') {
          newW = Math.max(10, origW - dx)
          newH = Math.max(10, origH + dy)
          newX = origX + (origW - newW)
        } else if (drag.handle === 'tl') {
          newW = Math.max(10, origW - dx)
          newH = Math.max(10, origH - dy)
          newX = origX + (origW - newW)
          newY = origY + (origH - newH)
        }
        updateElementLive(drag.id, {
          x: newX, y: newY, width: newW, height: newH,
        })
      } else if (drag.kind === 'rotate') {
        const angle = Math.atan2(point.clientY - drag.centerY, point.clientX - drag.centerX)
        const deltaDeg = ((angle - drag.startAngle) * 180) / Math.PI
        let newRot = (drag.origRotation + deltaDeg) % 360
        if (newRot < 0) newRot += 360
        // Snap to 15° increments if shift held.
        if (e.shiftKey) newRot = Math.round(newRot / 15) * 15
        updateElementLive(drag.id, { rotation: newRot })
      }
    }
    const up = () => {
      if (dragRef.current) {
        // Commit final state to history (using ref to avoid stale closure).
        pushHistory(canvasDataRef.current)
        dragRef.current = null
        // Clear alignment guides once the drag ends.
        setAlignmentGuides({ v: false, h: false })
      }
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', up)
    }
  }, [zoom, showGrid, updateElementLive, pushHistory])

  /* ──────────────────────────────────────────────────────────────────────
     Keyboard shortcuts (Delete, arrows, undo/redo, duplicate)
     ────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if focus is inside an input / textarea / select.
      const t = e.target as HTMLElement | null
      const tag = t?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return

      // Undo / Redo.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault(); undo(); return
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault(); redo(); return
      }
      // Duplicate.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && selectedId) {
        e.preventDefault()
        duplicateElement(selectedId)
        return
      }
      // Copy.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedId) {
        e.preventDefault()
        copyElement(selectedId)
        return
      }
      // Paste (works whether or not something is selected).
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault()
        pasteElement()
        return
      }
      // Flip horizontal (Ctrl+Shift+H) / vertical (Ctrl+Shift+V) — Ctrl+V is paste so use Shift.
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h' && selectedId) {
        e.preventDefault()
        flipElement(selectedId, 'h')
        return
      }
      if (!selectedId) return
      const el = canvasData.elements.find(x => x.id === selectedId)
      if (!el) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        removeElement(selectedId)
        return
      }
      const step = e.shiftKey ? 10 : 1
      let dx = 0, dy = 0
      if (e.key === 'ArrowLeft') dx = -step
      else if (e.key === 'ArrowRight') dx = step
      else if (e.key === 'ArrowUp') dy = -step
      else if (e.key === 'ArrowDown') dy = step
      if (dx !== 0 || dy !== 0) {
        e.preventDefault()
        updateElement(selectedId, { x: el.x + dx, y: el.y + dy })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId, canvasData.elements, undo, redo, removeElement, updateElement, addElement, duplicateElement, copyElement, pasteElement, flipElement])

  /* ──────────────────────────────────────────────────────────────────────
     Save / publish
     ────────────────────────────────────────────────────────────────────── */
  const save = useCallback(async (publish: boolean) => {
    setSaving(publish ? 'publish' : 'save')
    const body: Record<string, any> = {
      title,
      data: { canvas: canvasData },
    }
    if (publish) body.isPublished = true
    const res = await safeFetch<{ project: StudioProject }>(
      `/api/studio/projects/${project.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )
    setSaving(null)
    if (res.error) {
      toast({
        title: publish ? 'Could not publish' : 'Could not save',
        description: res.error,
        variant: 'destructive',
      })
      return
    }
    if (res.data?.project) {
      onSaved?.(res.data.project)
      setDirty(false)
      if (publish) {
        toast({ title: 'Published!', description: 'Your canvas is now live.' })
      } else {
        toast({ title: 'Saved', description: 'Draft saved successfully.' })
      }
    }
  }, [title, canvasData, project.id, onSaved])

  /* ──────────────────────────────────────────────────────────────────────
     Export PNG / JSON
     ────────────────────────────────────────────────────────────────────── */
  const exportPng = useCallback(async () => {
    if (!canvasRef.current) return
    try {
      toast({ title: 'Rendering PNG…', description: 'Hang tight.' })
      const dataUrl = await toPng(canvasRef.current, {
        quality: 1,
        pixelRatio: 2,
        width: canvasData.canvas.width,
        height: canvasData.canvas.height,
        cacheBust: true,
        // Override container-only styles so the PNG is a clean rectangle.
        style: {
          transform: 'none',
          margin: '0',
          borderRadius: '0',
          boxShadow: 'none',
          outline: 'none',
        },
      })
      const link = document.createElement('a')
      link.download = `${title.replace(/[^a-z0-9_-]+/gi, '_') || 'canvas'}.png`
      link.href = dataUrl
      link.click()
      toast({ title: 'PNG exported', description: 'Check your downloads.' })
    } catch (err: any) {
      toast({
        title: 'Export failed',
        description: err?.message || 'Unknown error',
        variant: 'destructive',
      })
    }
  }, [canvasData.canvas.width, canvasData.canvas.height, title])

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(canvasData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${title.replace(/[^a-z0-9_-]+/gi, '_') || 'canvas'}.json`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  }, [canvasData, title])

  /* ──────────────────────────────────────────────────────────────────────
     Layout
     ────────────────────────────────────────────────────────────────────── */
  return (
    <div className="relative flex h-full flex-col bg-muted/30">
      {/* ── Top bar (STATIC — does not scroll) ──────────────────────────── */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-evergreen/15 bg-background px-3 py-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-evergreen hover:bg-evergreen/5">
          <ChevronLeft className="h-4 w-4" /> Exit
        </Button>
        <div className="h-4 w-px bg-border" />
        <Input
          value={title}
          onChange={e => { setTitle(e.target.value); setDirty(true) }}
          className="h-8 w-32 border-transparent bg-transparent px-2 text-sm font-semibold hover:border-input focus-visible:border-input md:w-48"
          placeholder="Untitled"
        />
        {dirty && (
          <span className="hidden items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] text-gold-dark md:inline-flex">
            <Sparkles className="h-2.5 w-2.5" /> Unsaved
          </span>
        )}
        {project.isPublished && (
          <span className="hidden items-center gap-1 rounded-full bg-evergreen/10 px-2 py-0.5 text-[10px] text-evergreen md:inline-flex">
            <Globe className="h-2.5 w-2.5" /> Live
          </span>
        )}

        {/* ── Element action buttons (shown when an element is selected) ── */}
        {selectedElement && !selectedElement.locked && (
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5">
            <TopbarBtn title="Duplicate (Ctrl+D)" onClick={() => duplicateElement(selectedElement.id)}>
              <Copy className="h-3.5 w-3.5" />
            </TopbarBtn>
            <TopbarBtn title="Copy (Ctrl+C)" onClick={() => copyElement(selectedElement.id)}>
              <ClipboardPaste className="h-3.5 w-3.5" />
            </TopbarBtn>
            <TopbarBtn title="Flip horizontal (Ctrl+Shift+H)" onClick={() => flipElement(selectedElement.id, 'h')} active={!!selectedElement.flipH}>
              <FlipHorizontal2 className="h-3.5 w-3.5" />
            </TopbarBtn>
            <TopbarBtn title="Flip vertical" onClick={() => flipElement(selectedElement.id, 'v')} active={!!selectedElement.flipV}>
              <FlipVertical2 className="h-3.5 w-3.5" />
            </TopbarBtn>
            <div className="mx-0.5 h-4 w-px bg-border" />
            <TopbarBtn title="Bring forward" onClick={() => layerAction(selectedElement.id, 'forward')}>
              <ArrowUp className="h-3.5 w-3.5" />
            </TopbarBtn>
            <TopbarBtn title="Send backward" onClick={() => layerAction(selectedElement.id, 'backward')}>
              <ArrowDown className="h-3.5 w-3.5" />
            </TopbarBtn>
            <TopbarBtn title="Bring to front" onClick={() => layerAction(selectedElement.id, 'front')}>
              <BringToFront className="h-3.5 w-3.5" />
            </TopbarBtn>
            <TopbarBtn title="Send to back" onClick={() => layerAction(selectedElement.id, 'back')}>
              <SendToBack className="h-3.5 w-3.5" />
            </TopbarBtn>
            <div className="mx-0.5 h-4 w-px bg-border" />
            <TopbarBtn title="Align left to canvas" onClick={() => alignElement(selectedElement.id, 'left')}>
              <AlignHorizontalJustifyStart className="h-3.5 w-3.5" />
            </TopbarBtn>
            <TopbarBtn title="Center horizontally" onClick={() => alignElement(selectedElement.id, 'center-h')}>
              <AlignHorizontalJustifyCenter className="h-3.5 w-3.5" />
            </TopbarBtn>
            <TopbarBtn title="Align right to canvas" onClick={() => alignElement(selectedElement.id, 'right')}>
              <AlignHorizontalJustifyEnd className="h-3.5 w-3.5" />
            </TopbarBtn>
            <TopbarBtn title="Align top to canvas" onClick={() => alignElement(selectedElement.id, 'top')}>
              <AlignVerticalJustifyStart className="h-3.5 w-3.5" />
            </TopbarBtn>
            <TopbarBtn title="Center vertically" onClick={() => alignElement(selectedElement.id, 'center-v')}>
              <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
            </TopbarBtn>
            <TopbarBtn title="Align bottom to canvas" onClick={() => alignElement(selectedElement.id, 'bottom')}>
              <AlignVerticalJustifyEnd className="h-3.5 w-3.5" />
            </TopbarBtn>
            <div className="mx-0.5 h-4 w-px bg-border" />
            <TopbarBtn title="Delete (Del)" onClick={() => removeElement(selectedElement.id)} danger>
              <Trash2 className="h-3.5 w-3.5" />
            </TopbarBtn>
          </div>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {onShareToPage && (
            <Button
              size="sm"
              variant="outline"
              className="hidden border-berry/30 text-berry hover:bg-berry/5 lg:inline-flex"
              onClick={() => onShareToPage(project.id, title)}
              title="Embed this project in your Special Page as a content block"
            >
              <Plus className="h-3.5 w-3.5" /> Share to Page
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="hidden text-muted-foreground hover:bg-evergreen/5 hover:text-evergreen md:inline-flex"
            onClick={() => setShowShortcuts(s => !s)}
            title="Show keyboard shortcuts"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="hidden text-muted-foreground hover:bg-evergreen/5 hover:text-evergreen md:inline-flex"
            onClick={() => setShowGrid(g => !g)}
            title="Toggle grid (snap to 10px)"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={saving !== null}
            onClick={() => save(false)}
            className="border-evergreen/30 text-evergreen hover:bg-evergreen/5"
          >
            {saving === 'save' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </Button>
          <Button
            size="sm"
            disabled={saving !== null}
            onClick={() => save(true)}
            className="bg-gradient-to-r from-evergreen to-evergreen-dark text-cream hover:shadow-festive"
          >
            {saving === 'publish' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
            Publish
          </Button>
        </div>
      </div>

      {/* ── Mobile tabs (STATIC — does not scroll) ──────────────────────── */}
      <div className="flex-shrink-0 border-b border-evergreen/15 bg-background px-3 py-2 md:hidden">
        <Tabs value={mobilePanel} onValueChange={v => setMobilePanel(v as 'add' | 'props' | 'layers')}>
          <TabsList className="w-full">
            <TabsTrigger value="add" className="flex-1"><Plus className="h-3 w-3" /> Add</TabsTrigger>
            <TabsTrigger value="props" className="flex-1"><PanelLeft className="h-3 w-3" /> Props</TabsTrigger>
            <TabsTrigger value="layers" className="flex-1"><PanelRight className="h-3 w-3" /> Layers</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ── Main 3-panel — each panel scrolls INDEPENDENTLY ─────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left toolbar — desktop (overflow-y-auto handles scrolling) */}
        <aside className="hidden w-[280px] flex-shrink-0 flex-col overflow-y-auto border-r border-evergreen/15 bg-background md:flex">
          <CanvasToolbar
            onAddText={addText}
            onAddShape={addShape}
            onAddSticker={addSticker}
            onAddImage={addImage}
            onLoadTemplate={loadTemplate}
            onSetPreset={setPreset}
            onSetBackground={setBackground}
            onExportPng={exportPng}
            onExportJson={exportJson}
            onUndo={undo}
            onRedo={redo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            zoom={zoom}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            onZoomReset={zoomReset}
            onZoomFit={zoomFit}
            activePresetId={activePresetId}
            activeBackground={canvasData.canvas.background}
            unsavedChanges={dirty}
            onApplyPalette={(colors) => applyPalette(colors)}
          />
        </aside>

        {/* Mobile toolbar */}
        {mobilePanel === 'add' && (
          <div className="flex-1 overflow-y-auto md:hidden">
            <CanvasToolbar
              onAddText={addText}
              onAddShape={addShape}
              onAddSticker={addSticker}
              onAddImage={addImage}
              onLoadTemplate={loadTemplate}
              onSetPreset={setPreset}
              onSetBackground={setBackground}
              onExportPng={exportPng}
              onExportJson={exportJson}
              onUndo={undo}
              onRedo={redo}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              zoom={zoom}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onZoomReset={zoomReset}
              onZoomFit={zoomFit}
              activePresetId={activePresetId}
              activeBackground={canvasData.canvas.background}
              unsavedChanges={dirty}
              onApplyPalette={(colors) => applyPalette(colors)}
            />
          </div>
        )}

        {/* ── Center canvas viewport ───────────────────────────────────── */}
        <main
          ref={viewportRef}
          className="relative flex-1 overflow-auto bg-[radial-gradient(circle,_rgba(15,76,58,0.05)_1px,_transparent_1px)] bg-[length:20px_20px]"
          onMouseDown={() => setSelectedId(null)}
        >
          <div
            className="flex min-h-full w-full items-center justify-center p-8"
          >
            {/* Canvas wrapper (scaled) */}
            <div
              className="relative"
              style={{
                width: canvasData.canvas.width * zoom,
                height: canvasData.canvas.height * zoom,
              }}
            >
              {/* Inner canvas — real pixel dimensions */}
              <div
                ref={canvasRef}
                onMouseDown={e => e.stopPropagation()}
                className="absolute left-0 top-0 origin-top-left overflow-hidden rounded-md shadow-2xl ring-1 ring-evergreen/10"
                style={{
                  width: canvasData.canvas.width,
                  height: canvasData.canvas.height,
                  background: BACKGROUND_GRADIENTS[canvasData.canvas.background] || canvasData.canvas.background,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                {/* Optional grid overlay */}
                {showGrid && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-40"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)',
                      backgroundSize: '10px 10px',
                    }}
                  />
                )}

                {/* Alignment guide lines (red dashed) — drawn inside the canvas */}
                {alignmentGuides.v && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute top-0 bottom-0 z-[1000]"
                    style={{
                      left: canvasData.canvas.width / 2 - 0.5,
                      width: 1,
                      borderLeft: '1px dashed #dc2626',
                      boxShadow: '0 0 4px rgba(220,38,38,0.6)',
                    }}
                  />
                )}
                {alignmentGuides.h && (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-0 right-0 z-[1000]"
                    style={{
                      top: canvasData.canvas.height / 2 - 0.5,
                      height: 1,
                      borderTop: '1px dashed #dc2626',
                      boxShadow: '0 0 4px rgba(220,38,38,0.6)',
                    }}
                  />
                )}

                {/* Elements */}
                {canvasData.elements
                  .slice()
                  .sort((a, b) => a.zIndex - b.zIndex)
                  .map(el => (
                    <CanvasElementView
                      key={el.id}
                      el={el}
                      selected={el.id === selectedId}
                      zoom={zoom}
                      showGrid={showGrid}
                      onSelect={() => setSelectedId(el.id)}
                      onElementMouseDown={handleElementMouseDown}
                      onResizeMouseDown={handleResizeMouseDown}
                      onRotateMouseDown={handleRotateMouseDown}
                    />
                  ))}
              </div>
            </div>
          </div>
        </main>

        {/* Right panel — desktop (single overflow-y-auto column with both
            PropertiesPanel + LayersPanel stacked). */}
        <aside className="hidden w-[300px] flex-shrink-0 flex-col overflow-y-auto border-l border-evergreen/15 bg-background md:flex">
          <div className="flex-1 p-3">
            <PropertiesPanel
              selected={selectedElement}
              canvas={canvasData.canvas}
              onUpdateElement={updateElement}
              onUpdateCanvas={updateCanvas}
              onLayerAction={layerAction}
              onDelete={removeElement}
            />
          </div>
          <div className="flex-shrink-0 border-t border-evergreen/15 p-3">
            <LayersPanel
              elements={canvasData.elements}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onToggleVisible={toggleVisible}
              onToggleLock={toggleLock}
              onDelete={removeElement}
              onReorder={reorderLayers}
              onAddLayer={addText}
            />
          </div>
        </aside>

        {/* Mobile right panel */}
        {mobilePanel !== 'add' && (
          <div className="flex-1 overflow-y-auto md:hidden">
            {mobilePanel === 'props' ? (
              <div className="p-3">
                <PropertiesPanel
                  selected={selectedElement}
                  canvas={canvasData.canvas}
                  onUpdateElement={updateElement}
                  onUpdateCanvas={updateCanvas}
                  onLayerAction={layerAction}
                  onDelete={removeElement}
                />
              </div>
            ) : (
              <div className="p-3">
                <LayersPanel
                  elements={canvasData.elements}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  onToggleVisible={toggleVisible}
                  onToggleLock={toggleLock}
                  onDelete={removeElement}
                  onReorder={reorderLayers}
                  onAddLayer={addText}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyboard shortcuts hint (toggleable, floating) */}
      {showShortcuts && (
        <div className="fixed bottom-4 right-4 z-40 w-72 rounded-lg border border-evergreen/30 bg-background p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-evergreen">
              Keyboard shortcuts
            </h4>
            <button
              type="button"
              onClick={() => setShowShortcuts(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close shortcuts"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="space-y-1 text-[11px] text-muted-foreground">
            <li className="flex justify-between"><span>Undo</span><kbd className="font-mono">Ctrl+Z</kbd></li>
            <li className="flex justify-between"><span>Redo</span><kbd className="font-mono">Ctrl+Y</kbd></li>
            <li className="flex justify-between"><span>Duplicate</span><kbd className="font-mono">Ctrl+D</kbd></li>
            <li className="flex justify-between"><span>Copy</span><kbd className="font-mono">Ctrl+C</kbd></li>
            <li className="flex justify-between"><span>Paste</span><kbd className="font-mono">Ctrl+V</kbd></li>
            <li className="flex justify-between"><span>Flip horizontal</span><kbd className="font-mono">Ctrl+Shift+H</kbd></li>
            <li className="flex justify-between"><span>Delete</span><kbd className="font-mono">Del</kbd></li>
            <li className="flex justify-between"><span>Nudge (1px)</span><kbd className="font-mono">Arrows</kbd></li>
            <li className="flex justify-between"><span>Nudge (10px)</span><kbd className="font-mono">Shift+Arrows</kbd></li>
            <li className="flex justify-between"><span>Snap rotate 15°</span><kbd className="font-mono">Shift+drag</kbd></li>
            <li className="flex justify-between"><span>Deselect</span><kbd className="font-mono">Click empty</kbd></li>
          </ul>
        </div>
      )}

      {/* Floating mobile add buttons (quick access) */}
      {mobilePanel !== 'add' && (
        <div className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 md:hidden">
          <div className="flex items-center gap-2 rounded-full border border-evergreen/30 bg-background p-1.5 shadow-lg">
            <button
              type="button"
              onClick={addText}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-evergreen/10 text-evergreen"
              title="Add text"
            >
              <TypeIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => addShape('rect')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-evergreen/10 text-evergreen"
              title="Add rectangle"
            >
              <Square className="h-4 w-4" />
            </button>
            <EmojiPicker onPick={addSticker}>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-evergreen/10 text-evergreen"
                title="Add sticker"
              >
                <Smile className="h-4 w-4" />
              </button>
            </EmojiPicker>
            <button
              type="button"
              onClick={() => addImage('https://images.unsplash.com/photo-1518770660439-4636190af475?w=400')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-evergreen/10 text-evergreen"
              title="Add sample image"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   CanvasElementView — renders a single element + selection handles
   ────────────────────────────────────────────────────────────────────────── */
function CanvasElementView({
  el, selected, zoom, showGrid,
  onSelect, onElementMouseDown, onResizeMouseDown, onRotateMouseDown,
}: {
  el: CanvasElement
  selected: boolean
  zoom: number
  showGrid: boolean
  onSelect: () => void
  onElementMouseDown: (e: React.MouseEvent | React.TouchEvent, el: CanvasElement) => void
  onResizeMouseDown: (e: React.MouseEvent | React.TouchEvent, el: CanvasElement, handle: 'tl' | 'tr' | 'bl' | 'br') => void
  onRotateMouseDown: (e: React.MouseEvent | React.TouchEvent, el: CanvasElement) => void
}) {
  if (!el.visible) return null

  // Build the inner DOM per element type.
  const inner = renderInner(el)

  // Combine rotation + flip transforms. We apply flips via the scale()
  // operation so the rotation handle still behaves intuitively.
  const flipScale = `${el.flipH ? -1 : 1}, ${el.flipV ? -1 : 1}`

  return (
    <div
      onMouseDown={e => { onElementMouseDown(e, el) }}
      onTouchStart={e => { onElementMouseDown(e, el) }}
      onClick={e => { e.stopPropagation(); onSelect() }}
      className="absolute"
      style={{
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        opacity: el.opacity,
        zIndex: el.zIndex,
        transform: `rotate(${el.rotation}deg) scale(${flipScale})`,
        cursor: el.locked ? 'default' : 'move',
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      {inner}

      {/* Selection outline + handles */}
      {selected && (
        <>
          <div
            className="pointer-events-none absolute inset-0 border-2 border-evergreen"
            style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.6)' }}
          />
          {/* Resize handles (only if not locked) */}
          {!el.locked && (
            <>
              <Handle pos="tl" onDown={e => onResizeMouseDown(e, el, 'tl')} zoom={zoom} />
              <Handle pos="tr" onDown={e => onResizeMouseDown(e, el, 'tr')} zoom={zoom} />
              <Handle pos="bl" onDown={e => onResizeMouseDown(e, el, 'bl')} zoom={zoom} />
              <Handle pos="br" onDown={e => onResizeMouseDown(e, el, 'br')} zoom={zoom} />
              {/* Rotation handle */}
              <div
                onMouseDown={e => onRotateMouseDown(e, el)}
                onTouchStart={e => onRotateMouseDown(e, el)}
                className="absolute left-1/2 z-10 flex -translate-x-1/2 cursor-grab items-center justify-center"
                style={{ top: -36 / zoom }}
              >
                <div
                  className="rounded-full border-2 border-evergreen bg-white"
                  style={{ width: 14 / zoom, height: 14 / zoom }}
                  title="Rotate"
                />
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[100%] bg-evergreen"
                  style={{ width: 2 / zoom, height: 22 / zoom }}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   Render element inner DOM by type
   ────────────────────────────────────────────────────────────────────────── */
function renderInner(el: CanvasElement): React.ReactNode {
  if (el.type === 'TEXT') {
    // Gradient text: when textGradient is set we use background-clip:text so
    // the gradient becomes the text fill color. We also make `color`
    // transparent so the underlying text color doesn't bleed through.
    const usingGradient = !!el.textGradient
    const textStroke =
      el.textStrokeWidth && el.textStrokeWidth > 0
        ? `${el.textStrokeWidth}px ${el.textStrokeColor || '#000000'}`
        : undefined
    return (
      <div
        className="flex h-full w-full"
        style={{
          fontFamily: el.fontFamily,
          fontSize: el.fontSize,
          fontWeight: el.fontWeight as any,
          fontStyle: el.fontStyle as any,
          textDecoration: el.textDecoration,
          color: usingGradient ? 'transparent' : el.color,
          textAlign: el.textAlign,
          lineHeight: el.lineHeight,
          letterSpacing: el.letterSpacing,
          textShadow: el.textShadow,
          textTransform: el.textTransform || 'none',
          backgroundColor: el.backgroundColor,
          padding: el.padding,
          borderRadius: el.borderRadius,
          alignItems: 'center',
          justifyContent:
            el.textAlign === 'left' ? 'flex-start'
            : el.textAlign === 'right' ? 'flex-end'
            : 'center',
          overflow: 'hidden',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          boxShadow: el.boxShadow,
          // ── Text effects ────────────────────────────────────────────────
          WebkitTextStroke: textStroke as any,
          ...(usingGradient ? {
            backgroundImage: el.textGradient,
            WebkitBackgroundClip: 'text' as any,
            backgroundClip: 'text' as any,
            WebkitTextFillColor: 'transparent' as any,
          } : {}),
        } as React.CSSProperties}
      >
        {el.text || ''}
      </div>
    )
  }
  if (el.type === 'SHAPE') {
    const fill = el.fill && el.fill !== 'transparent' ? el.fill : 'transparent'
    const border = el.borderWidth && el.borderColor && el.borderColor !== 'transparent'
      ? `${el.borderWidth}px solid ${el.borderColor}`
      : 'none'
    if (el.shape === 'circle') {
      return (
        <div
          className="h-full w-full"
          style={{
            background: fill,
            border,
            borderRadius: '50%',
          }}
        />
      )
    }
    if (el.shape === 'line') {
      return (
        <div
          className="h-full w-full"
          style={{
            background: fill && fill !== 'transparent' ? fill : el.borderColor || '#c89b3c',
          }}
        />
      )
    }
    // Shapes with a clip-path (triangle, star, heart, arrow, hexagon, pentagon).
    const clipPath = el.shape ? SHAPE_CLIP_PATHS[el.shape] : null
    if (clipPath) {
      return (
        <div
          className="h-full w-full"
          style={{
            background: fill !== 'transparent' ? fill : el.borderColor,
            clipPath,
            // Note: CSS clip-path doesn't render borders — use a colored fill
            // or an SVG outline for visible outlines.
          }}
        />
      )
    }
    // rect (default)
    return (
      <div
        className="h-full w-full"
        style={{
          background: fill,
          border,
          borderRadius: el.borderRadius,
        }}
      />
    )
  }
  if (el.type === 'STICKER') {
    return (
      <div
        className="flex h-full w-full items-center justify-center"
        style={{
          fontSize: el.fontSize,
          lineHeight: 1,
        }}
      >
        {el.emoji}
      </div>
    )
  }
  if (el.type === 'IMAGE') {
    return (
      <img
        src={el.src}
        alt=""
        draggable={false}
        className="h-full w-full"
        style={{
          objectFit: el.objectFit,
          borderRadius: el.borderRadius,
          filter: buildImageFilter(el),
        }}
      />
    )
  }
  return null
}

/* ──────────────────────────────────────────────────────────────────────────
   Resize handle (corner)
   ────────────────────────────────────────────────────────────────────────── */
function Handle({
  pos, onDown, zoom,
}: {
  pos: 'tl' | 'tr' | 'bl' | 'br'
  onDown: (e: React.MouseEvent | React.TouchEvent) => void
  zoom: number
}) {
  const size = 12 / zoom
  const positions: Record<'tl' | 'tr' | 'bl' | 'br', React.CSSProperties> = {
    tl: { left: -size / 2, top: -size / 2, cursor: 'nwse-resize' },
    tr: { right: -size / 2, top: -size / 2, cursor: 'nesw-resize' },
    bl: { left: -size / 2, bottom: -size / 2, cursor: 'nesw-resize' },
    br: { right: -size / 2, bottom: -size / 2, cursor: 'nwse-resize' },
  }
  return (
    <div
      onMouseDown={onDown}
      onTouchStart={onDown}
      className="absolute z-20 rounded-sm border-2 border-evergreen bg-white shadow-sm"
      style={{
        width: size,
        height: size,
        ...positions[pos],
      }}
    />
  )
}

/* ──────────────────────────────────────────────────────────────────────────
   TopbarBtn — small icon button used in the top bar action group.
   ────────────────────────────────────────────────────────────────────────── */
function TopbarBtn({
  title, onClick, active, danger, children,
}: {
  title: string
  onClick: () => void
  active?: boolean
  danger?: boolean
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
        'flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors',
        active
          ? 'bg-evergreen/15 text-evergreen'
          : 'hover:bg-evergreen/5 hover:text-evergreen',
        danger && 'hover:bg-destructive/10 hover:text-destructive',
      )}
    >
      {children}
    </button>
  )
}
