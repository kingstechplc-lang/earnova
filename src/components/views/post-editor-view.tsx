'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { motion } from 'framer-motion'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { FadeIn } from '@/components/animated/motion'
import { safeFetch } from '@/lib/safe-fetch'
import { useConfetti } from '@/components/animated/confetti'
import { toast } from '@/hooks/use-toast'
import {
  ChevronLeft, Eye, Trash2, Send, Calendar, Archive, Settings2,
  Image as ImageIcon, Sparkles, Check, AlertCircle, Loader2, Globe2, Lock, Link2,
} from 'lucide-react'
import type { View, CurrentUser } from '@/app/page'

// ── Types ──────────────────────────────────────────────────────────────────
type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED' | 'REMOVED' | 'UNDER_REVIEW'

type Post = {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: any[] | null
  type: string
  status: PostStatus
  visibility: string
  coverImage: string | null
  scheduledAt: string | null
  publishedAt: string | null
  seoTitle: string | null
  seoDescription: string | null
  ogImage: string | null
  tags: string | null
  page: { id: string; slug: string; title: string } | null
  campaign: { id: string; slug: string; title: string } | null
}

// ── Static maps ────────────────────────────────────────────────────────────
const POST_TYPES: Array<[string, string, string]> = [
  ['TEXT',         'Text',         '📝'],
  ['ARTICLE',      'Article',      '📰'],
  ['IMAGE',        'Image',        '🖼️'],
  ['GALLERY',      'Gallery',      '🎨'],
  ['VIDEO',        'Video',        '🎬'],
  ['LINK',         'Link',         '🔗'],
  ['POLL',         'Poll',         '📊'],
  ['EVENT',        'Event',        '📅'],
  ['ANNOUNCEMENT', 'Announcement', '📢'],
  ['QUESTION',     'Question',     '❓'],
  ['QUIZ',         'Quiz',         '🧠'],
  ['CARD',         'Card',         '🎴'],
]

const VISIBILITIES: Array<{ value: string; label: string; description: string; icon: React.ReactNode }> = [
  { value: 'PUBLIC',   label: 'Public',   description: 'Anyone can find and read this post.',         icon: <Globe2 className="h-3.5 w-3.5" /> },
  { value: 'UNLISTED', label: 'Unlisted', description: 'Accessible via direct link, not in feeds.', icon: <Link2 className="h-3.5 w-3.5" /> },
  { value: 'PRIVATE',  label: 'Private',  description: 'Only you can view this post.',                icon: <Lock className="h-3.5 w-3.5" /> },
]

const STATUS_BADGE: Record<PostStatus, { label: string; cls: string }> = {
  DRAFT:        { label: 'Draft',        cls: 'pill-draft' },
  SCHEDULED:    { label: 'Scheduled',    cls: 'pill-pending' },
  PUBLISHED:    { label: 'Published',    cls: 'pill-approved' },
  ARCHIVED:     { label: 'Archived',     cls: 'pill-restricted' },
  REMOVED:      { label: 'Removed',      cls: 'pill-banned' },
  UNDER_REVIEW: { label: 'Under review', cls: 'pill-pending' },
}

// ── Helpers ─────────────────────────────────────────────────────────────────
/** Parse a plain-text content textarea value into a JSON array of content blocks. */
function textToBlocks(text: string): Array<{ type: string; text: string; level?: number }> {
  // Split on blank lines (one or more newlines)
  const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  return paragraphs.map(p => {
    // ## prefix → level-2 heading
    if (p.startsWith('## ')) return { type: 'heading', text: p.slice(3).trim(), level: 2 }
    if (p.startsWith('# '))  return { type: 'heading', text: p.slice(2).trim(), level: 1 }
    return { type: 'paragraph', text: p }
  })
}

/** Reverse: render content blocks back to plain text for editing. */
function blocksToText(blocks: any[] | null): string {
  if (!Array.isArray(blocks)) return ''
  return blocks.map(b => {
    if (b.type === 'heading' && b.level === 1) return `# ${b.text}`
    if (b.type === 'heading') return `## ${b.text}`
    return b.text || ''
  }).join('\n\n')
}

// ── Component ───────────────────────────────────────────────────────────────
export default function PostEditorView({
  postId, user, navigate,
}: {
  postId?: string
  user: CurrentUser
  navigate: (v: View) => void
}) {
  const isEditMode = !!postId

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(isEditMode)
  const [notFound, setNotFound] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [contentText, setContentText] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [type, setType] = useState('TEXT')
  const [coverImage, setCoverImage] = useState('')
  const [visibility, setVisibility] = useState('PUBLIC')
  const [tags, setTags] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [ogImage, setOgImage] = useState('')
  const [seoOpen, setSeoOpen] = useState(false)

  // Mutation state
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [currentPostId, setCurrentPostId] = useState<string | undefined>(postId)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { fire: fireConfetti, ConfettiLayer } = useConfetti()
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Hydrate form state from a Post object (used on load + after mutations) ─
  const hydrate = useCallback((p: Post) => {
    setPost(p)
    setCurrentPostId(p.id)
    setTitle(p.title)
    setContentText(blocksToText(p.content))
    setExcerpt(p.excerpt || '')
    setType(p.type)
    setCoverImage(p.coverImage || '')
    setVisibility(p.visibility)
    setTags(p.tags || '')
    setSeoTitle(p.seoTitle || '')
    setSeoDescription(p.seoDescription || '')
    setOgImage(p.ogImage || '')
  }, [])

  // ── Load existing post (edit mode only) ──────────────────────────────────
  useEffect(() => {
    if (!isEditMode) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const res = await safeFetch<{ post?: Post }>(`/api/posts/${postId}`)
      if (cancelled) return
      if (res.data?.post) {
        hydrate(res.data.post)
      } else if (res.error) {
        setNotFound(true)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [postId, isEditMode, hydrate])

  // Cleanup the saved-flash timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current)
    }
  }, [])

  function flashSaved() {
    setSavedFlash(true)
    if (savedTimer.current) clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSavedFlash(false), 1800)
  }

  // ── Save draft (creates or updates) ─────────────────────────────────────
  const handleSaveDraft = useCallback(async () => {
    setActionError(null)
    if (!title.trim() || title.trim().length < 3) {
      setActionError('Title must be at least 3 characters.')
      return
    }
    setSaving(true)
    const blocks = textToBlocks(contentText)

    if (currentPostId) {
      // PATCH existing
      const res = await safeFetch<{ post?: Post }>(`/api/posts/${currentPostId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, content: blocks, excerpt, type,
          coverImage, visibility, tags,
          seoTitle, seoDescription, ogImage,
        }),
      })
      setSaving(false)
      if (res.data?.post) {
        hydrate(res.data.post)
        flashSaved()
      } else if (res.error) {
        setActionError(res.error)
      }
    } else {
      // POST new
      const res = await safeFetch<{ post?: Post }>('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, content: blocks, excerpt, type, coverImage, visibility, tags,
        }),
      })
      setSaving(false)
      if (res.data?.post) {
        hydrate(res.data.post)
        flashSaved()
        // Update URL hash so reload keeps the editor on this post
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `#`)
        }
      } else if (res.error) {
        setActionError(res.error)
      }
    }
  }, [currentPostId, title, contentText, excerpt, type, coverImage, visibility, tags, seoTitle, seoDescription, ogImage])

  // ── Publish ─────────────────────────────────────────────────────────────
  async function handlePublish() {
    if (!currentPostId) {
      // Save first, then publish
      await handleSaveDraft()
      if (!currentPostIdRef.current) return
    }
    const id = currentPostId || currentPostIdRef.current
    if (!id) return

    setActionError(null)
    setSaving(true)
    const res = await safeFetch<{ post?: Post }>(`/api/posts/${id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setSaving(false)
    if (res.data?.post) {
      hydrate(res.data.post)
      // Confetti celebration — 100 particles per spec
      fireConfetti({ count: 100, spread: 70, y: 0.3 })
      toast({ title: 'Post published!', description: 'Your post is now live.' })
    } else if (res.error) {
      setActionError(res.error)
    }
  }

  // Keep a ref of currentPostId so handlePublish can read the latest value
  // after handleSaveDraft runs (handleSaveDraft sets state, but the closure
  // captured the old value).
  const currentPostIdRef = useRef<string | undefined>(currentPostId)
  useEffect(() => { currentPostIdRef.current = currentPostId }, [currentPostId])

  // ── Schedule ─────────────────────────────────────────────────────────────
  async function handleSchedule() {
    if (!currentPostId) {
      // Save first, then schedule
      await handleSaveDraft()
    }
    const id = currentPostId || currentPostIdRef.current
    if (!id) return
    if (!scheduleAt) {
      setActionError('Please pick a date and time to schedule.')
      return
    }
    const scheduledDate = new Date(scheduleAt)
    if (scheduledDate.getTime() <= Date.now()) {
      setActionError('Scheduled time must be in the future.')
      return
    }

    setActionError(null)
    setSaving(true)
    const res = await safeFetch<{ post?: Post }>(`/api/posts/${id}/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt: scheduledDate.toISOString() }),
    })
    setSaving(false)
    if (res.data?.post) {
      hydrate(res.data.post)
      setScheduleOpen(false)
      toast({ title: 'Post scheduled', description: `Will publish on ${scheduledDate.toLocaleString()}.` })
    } else if (res.error) {
      setActionError(res.error)
    }
  }

  // ── Archive ──────────────────────────────────────────────────────────────
  async function handleArchive() {
    if (!currentPostId) return
    setActionError(null)
    setSaving(true)
    const res = await safeFetch<{ post?: Post }>(`/api/posts/${currentPostId}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    setSaving(false)
    if (res.data?.post) {
      hydrate(res.data.post)
      toast({ title: 'Post archived', description: 'It is no longer publicly visible.' })
    } else if (res.error) {
      setActionError(res.error)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!currentPostId) return
    setActionError(null)
    setSaving(true)
    const res = await safeFetch(`/api/posts/${currentPostId}`, { method: 'DELETE' })
    setSaving(false)
    if (res.error) {
      setActionError(res.error)
      return
    }
    toast({ title: 'Post deleted', description: 'The post has been removed.' })
    navigate({ name: 'posts' })
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" aria-hidden />
      <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />
      <div className="relative z-10 container mx-auto px-4 py-20 max-w-md flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 text-center w-full">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-evergreen mb-3" />
          <p className="font-serif text-lg font-bold">Loading post…</p>
          <p className="text-sm text-muted-foreground mt-1">Fetching the editor state.</p>
        </div>
      </div>
    </div>
  )

  if (notFound) return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" aria-hidden />
      <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />
      <div className="relative z-10 container mx-auto px-4 py-12 max-w-md">
        <Alert className="border-cranberry/40 bg-cranberry/5 backdrop-blur-sm shadow-festive">
          <AlertCircle className="h-4 w-4 text-cranberry" />
          <AlertTitle>Post not found</AlertTitle>
          <AlertDescription>
            <p className="text-sm text-muted-foreground mb-4">
              This post may have been removed or you don&apos;t have access to it.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate({ name: 'posts' })} className="border-cranberry/30 text-cranberry hover:bg-cranberry/5 btn-glow overflow-hidden">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to Posts
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )

  const status = post?.status || 'DRAFT'
  const statusCfg = STATUS_BADGE[status] || STATUS_BADGE.DRAFT

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 mesh-bg opacity-40 pointer-events-none" aria-hidden />
      <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />

      <div className="relative z-10 view-fade container mx-auto px-4 py-6 max-w-4xl pb-32">
        {ConfettiLayer}

        {/* Header */}
        <FadeIn>
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'posts' })} className="hover:bg-evergreen/5 hover:text-evergreen">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to Posts
            </Button>
            <div className="flex-1" />
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
            {saving ? (
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
                Saving…
              </span>
            ) : savedFlash ? (
              <span className="text-sm text-evergreen flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            ) : null}
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mb-6">
            <span className="gradient-text-evergreen">{isEditMode ? 'Edit post' : 'New post'}</span>
          </h1>
        </FadeIn>

        {/* Action error */}
        {actionError && (
          <Alert className="mb-6 border-cranberry/40 bg-cranberry/5 backdrop-blur-sm">
            <AlertCircle className="h-4 w-4 text-cranberry" />
            <AlertDescription className="text-sm text-foreground/85">{actionError}</AlertDescription>
          </Alert>
        )}

        {/* Editor card */}
        <FadeIn delay={0.1}>
          <Card className="mb-6 overflow-hidden glass-strong shadow-festive">
            <div className="h-1.5 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
            <CardHeader>
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-evergreen" /> Content
              </CardTitle>
              <CardDescription>Write your post. Save as a draft, publish immediately, or schedule for later.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Title */}
              <div>
                <Label htmlFor="post-title" className="text-xs uppercase tracking-wide text-muted-foreground">Title</Label>
                <Input
                  id="post-title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Your post title…"
                  className="mt-1 font-serif text-lg"
                />
              </div>

              {/* Slug display (read-only) */}
              {post && (
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">URL</Label>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <code className="font-mono text-evergreen bg-evergreen/5 px-2 py-1 rounded border border-evergreen/20">
                      /post/{post.id}
                    </code>
                    <span className="text-xs text-muted-foreground">
                      URL uses the post ID for stability (slug changes won&apos;t break shared links).
                    </span>
                  </div>
                </div>
              )}

              {/* Type + Visibility */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POST_TYPES.map(([v, l, emoji]) => (
                        <SelectItem key={v} value={v}>
                          <span className="mr-2">{emoji}</span> {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Visibility</Label>
                  <Select value={visibility} onValueChange={setVisibility}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VISIBILITIES.map(v => (
                        <SelectItem key={v.value} value={v.value}>
                          <span className="mr-2 inline-flex items-center">{v.icon}</span> {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {VISIBILITIES.find(v => v.value === visibility)?.description}
                  </p>
                </div>
              </div>

              {/* Cover image URL */}
              <div>
                <Label htmlFor="post-cover" className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <ImageIcon className="h-3 w-3" /> Cover image URL (optional)
                </Label>
                <Input
                  id="post-cover"
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                  className="mt-1"
                />
                {coverImage && (
                  <div className="mt-2 relative h-40 rounded-xl overflow-hidden border border-border/40 bg-muted/20">
                    <img
                      src={coverImage}
                      alt="Cover preview"
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                )}
              </div>

              {/* Excerpt */}
              <div>
                <Label htmlFor="post-excerpt" className="text-xs uppercase tracking-wide text-muted-foreground">Excerpt (optional)</Label>
                <Textarea
                  id="post-excerpt"
                  value={excerpt}
                  onChange={e => setExcerpt(e.target.value)}
                  rows={2}
                  placeholder="Leave empty to auto-generate from content."
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Shown in post cards and search results. Auto-generated from the first paragraph if left blank.
                </p>
              </div>

              {/* Content editor (MVP: simple Textarea) */}
              <div>
                <Label htmlFor="post-content" className="text-xs uppercase tracking-wide text-muted-foreground">Content</Label>
                <Textarea
                  id="post-content"
                  value={contentText}
                  onChange={e => setContentText(e.target.value)}
                  rows={10}
                  placeholder={'Write your post here. Separate paragraphs with a blank line.\n\n## Use double-hash for a heading'}
                  className="mt-1 font-sans leading-relaxed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate paragraphs with a blank line. Start a line with <code className="bg-muted/40 px-1 rounded">## </code> for a heading. Rich text editor coming soon.
                </p>
              </div>

              {/* Tags */}
              <div>
                <Label htmlFor="post-tags" className="text-xs uppercase tracking-wide text-muted-foreground">Tags (comma-separated)</Label>
                <Input
                  id="post-tags"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="holiday, tutorial, announcement"
                  className="mt-1"
                />
                {tags && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tags.split(',').map(t => t.trim()).filter(Boolean).map((t, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-evergreen/5 text-evergreen border-evergreen/30">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* SEO (collapsible) */}
              <Collapsible open={seoOpen} onOpenChange={setSeoOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between px-3 py-2 hover:bg-muted/40 border border-border/40 rounded-lg">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Settings2 className="h-4 w-4 text-gold-dark" /> Advanced SEO
                    </span>
                    <span className="text-xs text-muted-foreground">{seoOpen ? 'Hide' : 'Show'}</span>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3">
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">SEO title</Label>
                    <Input
                      value={seoTitle}
                      onChange={e => setSeoTitle(e.target.value)}
                      placeholder="Defaults to post title if empty"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">SEO description</Label>
                    <Textarea
                      value={seoDescription}
                      onChange={e => setSeoDescription(e.target.value)}
                      rows={2}
                      placeholder="Defaults to excerpt if empty"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">OG image URL</Label>
                    <Input
                      value={ogImage}
                      onChange={e => setOgImage(e.target.value)}
                      placeholder="Defaults to cover image if empty"
                      className="mt-1"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-background/85 backdrop-blur-lg">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" aria-hidden />
        <div className="container mx-auto px-4 py-3 max-w-4xl flex flex-wrap items-center gap-2">
          <Button
            onClick={handleSaveDraft}
            disabled={saving || !title.trim()}
            variant="outline"
            className="border-evergreen/30 text-evergreen hover:bg-evergreen/5 btn-glow overflow-hidden"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
            Save draft
          </Button>

          {/* Publish (only when not already published) */}
          {status !== 'PUBLISHED' && status !== 'ARCHIVED' && (
            <Button
              onClick={handlePublish}
              disabled={saving || !title.trim()}
              className="bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive btn-glow overflow-hidden"
            >
              <Send className="h-4 w-4 mr-1.5" />
              Publish
            </Button>
          )}

          {/* Schedule (only when DRAFT) */}
          {status === 'DRAFT' && (
            <Button
              onClick={() => setScheduleOpen(true)}
              disabled={saving || !title.trim()}
              variant="outline"
              className="border-gold/40 text-gold-dark hover:bg-gold/5"
            >
              <Calendar className="h-4 w-4 mr-1.5" />
              Schedule
            </Button>
          )}

          {/* Archive (only when PUBLISHED) */}
          {status === 'PUBLISHED' && (
            <Button
              onClick={handleArchive}
              disabled={saving}
              variant="outline"
              className="border-muted-foreground/30 text-muted-foreground hover:bg-muted/20"
            >
              <Archive className="h-4 w-4 mr-1.5" />
              Archive
            </Button>
          )}

          {/* View public (when PUBLISHED) */}
          {status === 'PUBLISHED' && currentPostId && (
            <Button
              onClick={() => navigate({ name: 'public-post', postId: currentPostId })}
              variant="ghost"
              className="text-evergreen hover:bg-evergreen/5"
            >
              <Eye className="h-4 w-4 mr-1.5" /> View public
            </Button>
          )}

          <div className="flex-1" />

          {/* Delete (only when post exists) */}
          {currentPostId && (
            <Button
              onClick={() => setDeleteOpen(true)}
              disabled={saving}
              variant="ghost"
              size="sm"
              className="text-cranberry hover:bg-cranberry/5"
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gold-dark" /> Schedule post
            </DialogTitle>
            <DialogDescription>
              Pick a future date and time. Your post will publish automatically when that time arrives.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="schedule-at" className="text-xs uppercase tracking-wide text-muted-foreground">Publish at</Label>
            <Input
              id="schedule-at"
              type="datetime-local"
              value={scheduleAt}
              onChange={e => setScheduleAt(e.target.value)}
              className="mt-1"
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Requires a verified email. Schedules are processed on first read after the time arrives.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSchedule}
              disabled={saving || !scheduleAt}
              className="bg-gold text-cream hover:bg-gold-dark btn-glow overflow-hidden"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Calendar className="h-4 w-4 mr-1.5" />}
              Schedule post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl">Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              {post?.publishedAt
                ? 'This will mark the post as REMOVED. The record is retained for moderation purposes but it will no longer be visible.'
                : 'This will permanently delete the draft. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-cranberry text-cream hover:bg-cranberry/80"
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
