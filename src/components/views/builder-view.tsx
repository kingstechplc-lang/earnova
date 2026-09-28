'use client'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, GripVertical, Trash2, ChevronLeft, Eye } from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'

type Block = {
  id: string; type: string; data: any; order: number
}

type Page = {
  id: string; slug: string; title: string; description: string | null
  pageType: string; moderationState: string; publishedAt: string | null
  campaign: { id: string; title: string } | null
  blocks: Block[]
}

const BLOCK_TYPES: Array<[string, string]> = [
  ['HEADING', 'Heading'],
  ['TEXT', 'Text paragraph'],
  ['IMAGE', 'Image'],
  ['QUOTE', 'Quote'],
  ['LINK', 'Link'],
  ['SOCIAL_LINK', 'Social link'],
  ['DIVIDER', 'Divider'],
]

export default function BuilderView({
  pageId, user, navigate,
}: {
  pageId: string
  user: CurrentUser
  navigate: (v: View) => void
}) {
  const [page, setPage] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await fetch(`/api/pages/${pageId}`)
      const data = await res.json()
      if (cancelled) return
      if (res.ok) {
        setPage(data.page)
        setTitle(data.page.title)
        setDescription(data.page.description || '')
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [pageId])

  const load = useCallback(async () => {
    const res = await fetch(`/api/pages/${pageId}`)
    const data = await res.json()
    if (res.ok) {
      setPage(data.page)
      setTitle(data.page.title)
      setDescription(data.page.description || '')
    }
  }, [pageId])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(e: DragEndEvent) {
    if (!page || !e.active || !e.over) return
    if (e.active.id === e.over.id) return
    const oldIdx = page.blocks.findIndex(b => b.id === e.active.id)
    const newIdx = page.blocks.findIndex(b => b.id === e.over!.id)
    const reordered = arrayMove(page.blocks, oldIdx, newIdx)
    setPage({ ...page, blocks: reordered })
    setSaving(true)
    await fetch(`/api/page-builder/${pageId}/blocks`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: reordered.map(b => b.id) }),
    })
    setSaving(false)
  }

  async function addBlock(type: string) {
    const defaultData: Record<string, any> = {
      HEADING: { text: 'New heading' },
      TEXT: { text: 'Write something here…' },
      IMAGE: { url: '', alt: '', caption: '' },
      QUOTE: { text: '', author: '' },
      LINK: { url: '', label: '' },
      SOCIAL_LINK: { platform: 'whatsapp', url: '', label: '' },
      DIVIDER: {},
    }
    await fetch(`/api/page-builder/${pageId}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, data: defaultData[type] || {} }),
    })
    load()
  }

  async function updateBlock(blockId: string, data: any) {
    setDirty(true)
    setPage(prev => prev ? {
      ...prev,
      blocks: prev.blocks.map(b => b.id === blockId ? { ...b, data } : b),
    } : null)
  }

  async function saveBlock(blockId: string, data: any) {
    setSaving(true)
    await fetch(`/api/page-builder/${pageId}/blocks/${blockId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
    setSaving(false)
    setDirty(false)
  }

  async function deleteBlock(blockId: string) {
    if (!page) return
    await fetch(`/api/page-builder/${pageId}/blocks/${blockId}`, { method: 'DELETE' })
    load()
  }

  async function saveMetadata() {
    setSaving(true)
    await fetch(`/api/pages/${pageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    })
    setSaving(false)
  }

  async function togglePublish() {
    if (!page) return
    const newState = !page.publishedAt
    setSaving(true)
    const res = await fetch(`/api/pages/${pageId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publish: newState }),
    })
    if (res.ok) {
      const data = await res.json()
      setPage(prev => prev ? { ...prev, publishedAt: data.page.publishedAt } : null)
    }
    setSaving(false)
  }

  if (loading) return <div className="container mx-auto px-4 py-8">Loading…</div>
  if (!page) return <div className="container mx-auto px-4 py-8">Page not found.</div>

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'dashboard' })}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex-1" />
        {saving && <span className="text-sm text-muted-foreground">Saving…</span>}
        <Button variant="outline" size="sm" onClick={() => {
          window.location.hash = `/p/${page.slug}`
          navigate({ name: 'public', slug: page.slug })
        }}>
          <Eye className="h-4 w-4 mr-1" /> Preview
        </Button>
        <Button size="sm" onClick={togglePublish}>
          {page.publishedAt ? 'Unpublish' : 'Publish'}
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Page settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">/p/{page.slug}</Badge>
            <Badge variant="outline">{page.pageType}</Badge>
            <Badge variant="outline">{page.moderationState}</Badge>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={saveMetadata}>Save settings</Button>
          </div>
        </CardContent>
      </Card>

      {/* Block palette */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Add a content block</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {BLOCK_TYPES.map(([type, label]) => (
              <Button key={type} size="sm" variant="outline" onClick={() => addBlock(type)}>
                <Plus className="h-3 w-3 mr-1" /> {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Blocks */}
      <div className="space-y-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={page.blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            {page.blocks.map(block => (
              <SortableBlock
                key={block.id}
                block={block}
                onUpdate={updateBlock}
                onSave={saveBlock}
                onDelete={deleteBlock}
              />
            ))}
          </SortableContext>
        </DndContext>
        {page.blocks.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No blocks yet. Add one above.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function SortableBlock({
  block, onUpdate, onSave, onDelete,
}: {
  block: Block
  onUpdate: (id: string, data: any) => void
  onSave: (id: string, data: any) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Card ref={setNodeRef} style={style}>
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-2 text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="text-xs">{block.type}</Badge>
            </div>
            <BlockEditor block={block} onUpdate={(d) => onUpdate(block.id, d)} onSave={() => onSave(block.id, block.data)} />
          </div>
          <Button variant="ghost" size="sm" onClick={() => onDelete(block.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function BlockEditor({
  block, onUpdate, onSave,
}: {
  block: Block
  onUpdate: (data: any) => void
  onSave: () => void
}) {
  const data = block.data || {}

  function set<K extends string>(key: K, value: any) {
    onUpdate({ ...data, [key]: value })
  }

  switch (block.type) {
    case 'HEADING':
      return (
        <Input
          value={data.text || ''}
          onChange={e => set('text', e.target.value)}
          onBlur={onSave}
          className="font-semibold text-lg"
        />
      )
    case 'TEXT':
      return (
        <Textarea
          value={data.text || ''}
          onChange={e => set('text', e.target.value)}
          onBlur={onSave}
          rows={3}
        />
      )
    case 'IMAGE':
      return (
        <div className="space-y-2">
          <Input placeholder="Image URL" value={data.url || ''} onChange={e => set('url', e.target.value)} onBlur={onSave} />
          <Input placeholder="Alt text" value={data.alt || ''} onChange={e => set('alt', e.target.value)} onBlur={onSave} />
          <Input placeholder="Caption (optional)" value={data.caption || ''} onChange={e => set('caption', e.target.value)} onBlur={onSave} />
          {data.url && <img src={data.url} alt={data.alt || ''} className="max-h-48 rounded border border-border" />}
        </div>
      )
    case 'QUOTE':
      return (
        <div className="space-y-2">
          <Textarea placeholder="Quote text" value={data.text || ''} onChange={e => set('text', e.target.value)} onBlur={onSave} rows={2} />
          <Input placeholder="Author" value={data.author || ''} onChange={e => set('author', e.target.value)} onBlur={onSave} />
        </div>
      )
    case 'LINK':
      return (
        <div className="space-y-2">
          <Input placeholder="URL" value={data.url || ''} onChange={e => set('url', e.target.value)} onBlur={onSave} />
          <Input placeholder="Label" value={data.label || ''} onChange={e => set('label', e.target.value)} onBlur={onSave} />
        </div>
      )
    case 'SOCIAL_LINK':
      return (
        <div className="grid grid-cols-[120px_1fr] gap-2">
          <Select value={data.platform || 'whatsapp'} onValueChange={v => set('platform', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="telegram">Telegram</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="x">X</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="URL" value={data.url || ''} onChange={e => set('url', e.target.value)} onBlur={onSave} />
          <Input placeholder="Label" value={data.label || ''} onChange={e => set('label', e.target.value)} onBlur={onSave} />
        </div>
      )
    case 'DIVIDER':
      return <div className="border-t border-border py-2 text-center text-xs text-muted-foreground">Divider</div>
    default:
      return <div className="text-xs text-muted-foreground">Unknown block type: {block.type}</div>
  }
}
