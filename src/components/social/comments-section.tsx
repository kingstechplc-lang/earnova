'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { safeFetch } from '@/lib/safe-fetch'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/relative-time'
import type { CurrentVisitor } from './use-current-user'
import {
  MessageCircle, Send, Loader2, LogIn, Pencil, Trash2, Reply, X, CornerDownRight,
} from 'lucide-react'

/**
 * CommentsSection — threaded comment list + composer for a public post.
 *
 * Layout (top-to-bottom inside a Card):
 *   1. "Comments (N)" heading
 *   2. Composer (Textarea + Post button) — or a "Log in to comment" CTA
 *   3. Threaded list of top-level comments (date desc), each with:
 *        - author avatar (gradient circle with initial if no image) + name
 *          + @username + relative time
 *        - comment text (or "[deleted]" if isDeleted)
 *        - reply / edit / delete actions
 *        - nested replies (date asc), indented under the parent
 *   4. "Load more comments" cursor pagination button
 *
 * All API calls go through safeFetch; errors are surfaced via toast.
 * If the visitor is not logged in, the composer is replaced by a CTA
 * that calls onLogin.
 *
 * The parent passes the post's current commentCount; this component
 * owns its own local copy that increments when a comment is added and
 * decrements when one is deleted (so the count in the heading stays
 * in sync without a refetch).
 */
type Author = {
  id: string
  name: string | null
  username: string | null
  image: string | null
}

type Comment = {
  id: string
  postId: string
  authorId: string
  parentId: string | null
  content: string
  likeCount: number
  replyCount: number
  isEdited: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  author: Author
  replies: Comment[]
}

type CommentsResponse = {
  comments: Comment[]
  nextCursor: string | null
}

export function CommentsSection({
  postId,
  currentUser,
  initialCommentCount,
  sectionRef,
  onLogin,
}: {
  postId: string
  currentUser: CurrentVisitor | null
  initialCommentCount: number
  sectionRef: React.RefObject<HTMLDivElement | null>
  onLogin?: () => void
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [commentCount, setCommentCount] = useState(initialCommentCount)

  // Composer state
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  // Per-comment local UI state
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [postingReplyFor, setPostingReplyFor] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [savingEditFor, setSavingEditFor] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { setCommentCount(initialCommentCount) }, [initialCommentCount])

  // ── Initial fetch ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setComments([])
    setCursor(null)
    ;(async () => {
      const res = await safeFetch<CommentsResponse>(`/api/comments/${encodeURIComponent(postId)}?limit=10`)
      if (cancelled) return
      if (res.error) {
        setError(res.error)
      } else if (res.data) {
        setComments(res.data.comments)
        setCursor(res.data.nextCursor ?? null)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [postId])

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    const res = await safeFetch<CommentsResponse>(
      `/api/comments/${encodeURIComponent(postId)}?limit=10&cursor=${cursor}`
    )
    setLoadingMore(false)
    if (res.error) {
      toast({ title: 'Could not load more comments', description: res.error, variant: 'destructive' })
      return
    }
    if (res.data) {
      setComments(prev => [...prev, ...res.data.comments])
      setCursor(res.data.nextCursor ?? null)
    }
  }, [cursor, loadingMore, postId])

  // ── Post a top-level comment ─────────────────────────────────────────────
  async function postComment() {
    const content = draft.trim()
    if (!content || posting) return
    if (!currentUser) {
      onLogin?.()
      return
    }
    setPosting(true)
    const res = await safeFetch<{ comment: Comment }>(
      `/api/comments/${encodeURIComponent(postId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }
    )
    setPosting(false)
    if (res.error) {
      toast({ title: 'Could not post comment', description: res.error, variant: 'destructive' })
      return
    }
    if (res.data?.comment) {
      // Prepend to the list (newest first).
      setComments(prev => [res.data.comment, ...prev])
      setCommentCount(c => c + 1)
      setDraft('')
      toast({ title: 'Comment posted' })
    }
  }

  // ── Reply handlers ───────────────────────────────────────────────────────
  async function postReply(parentId: string) {
    const content = (replyDrafts[parentId] || '').trim()
    if (!content || postingReplyFor) return
    setPostingReplyFor(parentId)
    const res = await safeFetch<{ comment: Comment }>(
      `/api/comments/${encodeURIComponent(postId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, parentId }),
      }
    )
    setPostingReplyFor(null)
    if (res.error) {
      toast({ title: 'Could not post reply', description: res.error, variant: 'destructive' })
      return
    }
    if (res.data?.comment) {
      // Append the reply to the parent's replies array (sorted asc by date).
      setComments(prev => prev.map(c => {
        if (c.id !== parentId) return c
        return { ...c, replies: [...c.replies, res.data.comment], replyCount: c.replyCount + 1 }
      }))
      setReplyDrafts(prev => ({ ...prev, [parentId]: '' }))
      setReplyingTo(null)
      setCommentCount(c => c + 1)
      toast({ title: 'Reply posted' })
    }
  }

  // ── Edit / delete ────────────────────────────────────────────────────────
  function startEdit(c: Comment) {
    setEditingId(c.id)
    setEditDraft(c.content)
  }

  async function saveEdit(id: string) {
    const content = editDraft.trim()
    if (!content || savingEditFor) return
    setSavingEditFor(id)
    const res = await safeFetch<{ comment: Comment }>(
      `/api/comments/${encodeURIComponent(postId)}/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }
    )
    setSavingEditFor(null)
    if (res.error) {
      toast({ title: 'Could not save edit', description: res.error, variant: 'destructive' })
      return
    }
    if (res.data?.comment) {
      const updated = res.data.comment
      setComments(prev => prev.map(c => {
        if (c.id === updated.id) return { ...c, ...updated, replies: c.replies }
        // Update nested replies too.
        return {
          ...c,
          replies: c.replies.map(r => r.id === updated.id ? { ...r, ...updated } : r),
        }
      }))
      setEditingId(null)
      setEditDraft('')
      toast({ title: 'Comment updated' })
    }
  }

  async function deleteComment(id: string) {
    if (deletingId) return
    if (!confirm('Delete this comment? This cannot be undone.')) return
    setDeletingId(id)
    const res = await safeFetch<{ deleted: boolean }>(
      `/api/comments/${encodeURIComponent(postId)}/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
    setDeletingId(null)
    if (res.error) {
      toast({ title: 'Could not delete comment', description: res.error, variant: 'destructive' })
      return
    }
    // Soft-delete locally — preserve thread structure.
    setComments(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, isDeleted: true, content: '[deleted]', replies: c.replies }
      }
      return {
        ...c,
        replies: c.replies.map(r => r.id === id ? { ...r, isDeleted: true, content: '[deleted]' } : r),
      }
    }))
    setCommentCount(c => Math.max(0, c - 1))
    toast({ title: 'Comment deleted' })
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div ref={sectionRef} className="mt-8 scroll-mt-24" id="comments">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-serif text-xl font-bold flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-evergreen" />
          Comments
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-evergreen/15 to-gold/10 text-evergreen border border-evergreen/30 tabular-nums">
            {commentCount}
          </span>
        </h3>
      </div>

      {/* Composer */}
      <div className="mb-6">
        {currentUser ? (
          <div className="glass-card rounded-2xl border border-border/60 p-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-evergreen to-evergreen-dark text-cream text-sm font-bold flex-shrink-0">
                {(currentUser.name || currentUser.email)[0]?.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <Textarea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="Add a comment…"
                  className="min-h-[72px] resize-none bg-background/70 border-border/60 focus-visible:ring-evergreen/30"
                  maxLength={5000}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      postComment()
                    }
                  }}
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground">
                    {draft.length}/5000 · ⌘/Ctrl+Enter to post
                  </span>
                  <Button
                    size="sm"
                    onClick={postComment}
                    disabled={!draft.trim() || posting}
                    className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
                  >
                    {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl border border-border/60 p-4 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground flex-shrink-0">
              <LogIn className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">Want to join the conversation?</p>
              <p className="text-xs text-muted-foreground">Log in to post a comment.</p>
            </div>
            <Button size="sm" onClick={onLogin} className="bg-evergreen text-cream hover:bg-evergreen-dark">
              Log in to comment
            </Button>
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mb-2" />
          <span className="text-sm">Loading comments…</span>
        </div>
      ) : error ? (
        <div className="py-8 text-center text-sm text-cranberry">{error}</div>
      ) : comments.length === 0 ? (
        <div className="py-12 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-evergreen/10 to-gold/8 text-evergreen/70 mb-3">
            <MessageCircle className="h-6 w-6" />
          </div>
          <p className="font-medium mb-1">No comments yet</p>
          <p className="text-sm text-muted-foreground">Be the first to comment!</p>
        </div>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {comments.map(c => (
              <CommentItem
                key={c.id}
                comment={c}
                depth={0}
                currentUser={currentUser}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyDrafts={replyDrafts}
                setReplyDrafts={setReplyDrafts}
                postingReplyFor={postingReplyFor}
                onPostReply={postReply}
                editingId={editingId}
                editDraft={editDraft}
                setEditDraft={setEditDraft}
                savingEditFor={savingEditFor}
                onStartEdit={startEdit}
                onCancelEdit={() => { setEditingId(null); setEditDraft('') }}
                onSaveEdit={saveEdit}
                deletingId={deletingId}
                onDelete={deleteComment}
                onLogin={onLogin}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}

      {/* Load more */}
      {cursor && !loading && !error && (
        <div className="pt-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMore}
            disabled={loadingMore}
            className="text-evergreen hover:bg-evergreen/5"
          >
            {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Load more comments
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Single comment row (recursive for replies) ─────────────────────────────
function CommentItem({
  comment,
  depth,
  currentUser,
  replyingTo,
  setReplyingTo,
  replyDrafts,
  setReplyDrafts,
  postingReplyFor,
  onPostReply,
  editingId,
  editDraft,
  setEditDraft,
  savingEditFor,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  deletingId,
  onDelete,
  onLogin,
}: {
  comment: Comment
  depth: number
  currentUser: CurrentVisitor | null
  replyingTo: string | null
  setReplyingTo: (id: string | null) => void
  replyDrafts: Record<string, string>
  setReplyDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>
  postingReplyFor: string | null
  onPostReply: (parentId: string) => void
  editingId: string | null
  editDraft: string
  setEditDraft: (s: string) => void
  savingEditFor: string | null
  onStartEdit: (c: Comment) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string) => void
  deletingId: string | null
  onDelete: (id: string) => void
  onLogin?: () => void
}) {
  const isAuthor = !!currentUser && currentUser.id === comment.authorId
  const isAdmin = !!currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR')
  const canDelete = isAuthor || isAdmin
  const canEdit = isAuthor
  const authorName = comment.author.name || comment.author.username || 'Anonymous'
  const authorInitial = authorName[0]?.toUpperCase() || '?'
  const isReplyOpen = replyingTo === comment.id
  const isEditing = editingId === comment.id
  const isSaving = savingEditFor === comment.id
  const isPostingReply = postingReplyFor === comment.id
  const isDeleting = deletingId === comment.id
  const replyDraft = replyDrafts[comment.id] || ''

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn('rounded-xl', depth > 0 && 'pl-3 sm:pl-5 border-l-2 border-border/50 hover:border-evergreen/40 transition-colors')}
    >
      <div className="flex items-start gap-3 py-2">
        {/* Author avatar */}
        {comment.author.image ? (
          <img
            src={comment.author.image}
            alt={authorName}
            className="h-8 w-8 rounded-full object-cover border border-border flex-shrink-0"
          />
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-evergreen to-evergreen-dark text-cream text-xs font-bold flex-shrink-0">
            {authorInitial}
          </span>
        )}

        <div className="flex-1 min-w-0">
          {/* Author meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{authorName}</span>
            {comment.author.username && (
              <span className="text-xs text-muted-foreground">@{comment.author.username}</span>
            )}
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{relativeTime(comment.createdAt)}</span>
            {comment.isEdited && !comment.isDeleted && (
              <span className="text-[10px] text-muted-foreground italic">(edited)</span>
            )}
          </div>

          {/* Body */}
          {comment.isDeleted ? (
            <p className="text-sm italic text-muted-foreground mt-0.5">[deleted]</p>
          ) : isEditing ? (
            <div className="mt-2">
              <Textarea
                value={editDraft}
                onChange={e => setEditDraft(e.target.value)}
                className="min-h-[60px] bg-background/70 border-border/60 focus-visible:ring-evergreen/30"
                maxLength={5000}
                autoFocus
              />
              <div className="flex items-center gap-2 mt-1.5">
                <Button
                  size="sm"
                  onClick={() => onSaveEdit(comment.id)}
                  disabled={!editDraft.trim() || isSaving}
                  className="bg-evergreen text-cream hover:bg-evergreen-dark h-7"
                >
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" onClick={onCancelEdit} className="h-7">
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
          )}

          {/* Actions (only if not deleted) */}
          {!comment.isDeleted && !isEditing && (
            <div className="flex items-center gap-1 mt-1">
              {currentUser ? (
                <button
                  onClick={() => setReplyingTo(isReplyOpen ? null : comment.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded text-muted-foreground hover:text-evergreen hover:bg-evergreen/5 transition-colors"
                >
                  <Reply className="h-3 w-3" />
                  Reply
                </button>
              ) : (
                <button
                  onClick={onLogin}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded text-muted-foreground hover:text-evergreen hover:bg-evergreen/5 transition-colors"
                >
                  <LogIn className="h-3 w-3" /> Log in to reply
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => onStartEdit(comment)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded text-muted-foreground hover:text-gold-dark hover:bg-gold/5 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onDelete(comment.id)}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded text-muted-foreground hover:text-cranberry hover:bg-cranberry/5 transition-colors disabled:opacity-60"
                >
                  {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  Delete
                </button>
              )}
            </div>
          )}

          {/* Reply composer (inline) */}
          {isReplyOpen && currentUser && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2"
            >
              <div className="flex items-start gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-evergreen to-evergreen-dark text-cream text-[10px] font-bold flex-shrink-0">
                  {(currentUser.name || currentUser.email)[0]?.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <Textarea
                    value={replyDraft}
                    onChange={e => setReplyDrafts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                    placeholder={`Reply to ${authorName}…`}
                    className="min-h-[56px] resize-none bg-background/70 border-border/60 focus-visible:ring-evergreen/30 text-sm"
                    maxLength={5000}
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-1.5">
                    <Button
                      size="sm"
                      onClick={() => onPostReply(comment.id)}
                      disabled={!replyDraft.trim() || isPostingReply}
                      className="bg-evergreen text-cream hover:bg-evergreen-dark h-7"
                    >
                      {isPostingReply ? <Loader2 className="h-3 w-3 animate-spin" /> : <CornerDownRight className="h-3 w-3" />}
                      Reply
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)} className="h-7">
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Nested replies (sorted asc — the API already returns them asc) */}
          {comment.replies.length > 0 && (
            <ul className="mt-1 space-y-1">
              {comment.replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  currentUser={currentUser}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  replyDrafts={replyDrafts}
                  setReplyDrafts={setReplyDrafts}
                  postingReplyFor={postingReplyFor}
                  onPostReply={onPostReply}
                  editingId={editingId}
                  editDraft={editDraft}
                  setEditDraft={setEditDraft}
                  savingEditFor={savingEditFor}
                  onStartEdit={onStartEdit}
                  onCancelEdit={onCancelEdit}
                  onSaveEdit={onSaveEdit}
                  deletingId={deletingId}
                  onDelete={onDelete}
                  onLogin={onLogin}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </motion.li>
  )
}
