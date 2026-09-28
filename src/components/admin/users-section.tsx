'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animated/motion'
import { motion } from 'framer-motion'
import { safeFetch } from '@/lib/safe-fetch'
import { useConfetti } from '@/components/animated/confetti'
import {
  Search, Users, ShieldCheck, Ban, Shield, Mail, FileText, Plug, ChevronRight,
} from 'lucide-react'

type AdminUser = {
  id: string
  email: string
  name: string | null
  role: 'USER' | 'MODERATOR' | 'ADMIN'
  bio: string | null
  locale: string
  createdAt: string
  _count: { pages: number; adIntegrations: number }
}

type UserDetail = {
  id: string
  email: string
  name: string | null
  role: 'USER' | 'MODERATOR' | 'ADMIN'
  bio: string | null
  locale: string
  createdAt: string
  pages: Array<{
    id: string; slug: string; title: string; pageType: string
    moderationState: string; publishedAt: string | null; createdAt: string
    _count: { blocks: number }
  }>
  adIntegrations: Array<{
    id: string; integrationType: string; siteIdentifier: string | null
    zoneIdentifier: string | null; lifecycleState: string; createdAt: string
    adNetwork: { code: string; displayName: string }
  }>
}

export function UsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const { fire: fireConfetti, ConfettiLayer } = useConfetti()

  const load = async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (roleFilter !== 'ALL') params.set('role', roleFilter)
    const res = await safeFetch<{ users?: AdminUser[] }>(`/api/admin/users?${params}`)
    if (res.error) setError(res.error)
    setUsers(res.data?.users || [])
    setLoading(false)
  }
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [search, roleFilter])

  async function banUser(u: AdminUser) {
    const reason = prompt(`Ban user "${u.email}"? All their pages will be set to BANNED and integrations disabled. Reason (optional):`)
    if (reason === null) return
    const res = await safeFetch(`/api/admin/users/${u.id}/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'Banned by admin' }),
    })
    if (res.error) { alert(res.error); return }
    alert(`Banned. ${res.data?.bannedPages || 0} page(s) affected.`)
    load()
  }
  async function unbanUser(u: AdminUser) {
    const reason = prompt(`Restore user "${u.email}"? Their pages will return to PENDING for re-moderation. Reason (optional):`)
    if (reason === null) return
    const res = await safeFetch(`/api/admin/users/${u.id}/unban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason || 'Unbanned by admin' }),
    })
    if (res.error) { alert(res.error); return }
    fireConfetti({ count: 80, spread: 60, y: 0.4 })
    alert(`Restored. ${res.data?.restoredPages || 0} page(s) back to PENDING.`)
    load()
  }

  if (loading && users.length === 0) {
    return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl shimmer-bg" />)}</div>
  }

  return (
    <div className="space-y-4">
      {ConfettiLayer}
      <FadeIn>
        <div className="mb-3">
          <h3 className="font-serif text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-evergreen" />
            Users
          </h3>
          <p className="text-sm text-muted-foreground">{users.length} shown · search and filter above</p>
        </div>
      </FadeIn>

      {/* Search + filter */}
      <FadeIn delay={0.05}>
        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by email or name..."
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All roles</SelectItem>
              <SelectItem value="USER">Users</SelectItem>
              <SelectItem value="MODERATOR">Moderators</SelectItem>
              <SelectItem value="ADMIN">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FadeIn>

      {error && (
        <Card className="border-cranberry/40">
          <CardContent className="py-4 text-sm text-cranberry">{error}</CardContent>
        </Card>
      )}

      {/* User list */}
      <StaggerContainer className="space-y-2">
        {users.map(u => (
          <StaggerItem key={u.id} y={10}>
            <Card className="overflow-hidden hover:shadow-elevated hover:-translate-y-0.5 transition-all">
              <div className={`h-0.5 w-full ${
                u.role === 'ADMIN' ? 'bg-gradient-to-r from-berry to-berry/70' :
                u.role === 'MODERATOR' ? 'bg-gradient-to-r from-gold to-gold-dark' :
                'bg-gradient-to-r from-evergreen to-evergreen-light'
              }`} />
              <CardContent className="py-3 flex items-center gap-3 flex-wrap">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm ${
                  u.role === 'ADMIN' ? 'bg-berry/10 text-berry' :
                  u.role === 'MODERATOR' ? 'bg-gold/15 text-gold-dark' :
                  'bg-evergreen/10 text-evergreen'
                }`}>
                  {(u.name || u.email)[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{u.name || u.email.split('@')[0]}</span>
                    {u.role !== 'USER' && (
                      <Badge variant="outline" className={
                        u.role === 'ADMIN' ? 'bg-berry/5 text-berry border-berry/30' : 'bg-gold/5 text-gold-dark border-gold/30'
                      }>
                        {u.role === 'ADMIN' && <Shield className="h-3 w-3 mr-0.5" />}
                        {u.role}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {u.email}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1" title="Pages">
                    <FileText className="h-3 w-3" />
                    <strong className="text-foreground">{u._count.pages}</strong>
                  </span>
                  <span className="flex items-center gap-1" title="Ad integrations">
                    <Plug className="h-3 w-3" />
                    <strong className="text-foreground">{u._count.adIntegrations}</strong>
                  </span>
                  <span className="text-[10px] font-mono">{new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setDetailUserId(u.id)} className="h-8 px-2">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {u.role === 'USER' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => banUser(u)}
                      className="h-8 px-2 text-muted-foreground hover:text-cranberry hover:bg-cranberry/5"
                      title="Ban user"
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
        {users.length === 0 && !loading && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-medium">No users found</p>
              <p className="text-sm">Try a different search or filter.</p>
            </CardContent>
          </Card>
        )}
      </StaggerContainer>

      {/* User detail drawer */}
      {detail && (
        <UserDetailDialog
          user={detail}
          onClose={() => setDetail(null)}
          onBan={() => { banUser({ id: detail.id, email: detail.email, name: detail.name, role: detail.role, bio: detail.bio, locale: detail.locale, createdAt: detail.createdAt, _count: { pages: detail.pages.length, adIntegrations: detail.adIntegrations.length } }); setDetail(null) }}
          onUnban={() => { unbanUser({ id: detail.id, email: detail.email, name: detail.name, role: detail.role, bio: detail.bio, locale: detail.locale, createdAt: detail.createdAt, _count: { pages: detail.pages.length, adIntegrations: detail.adIntegrations.length } }); setDetail(null) }}
        />
      )}
    </div>
  )

  async function setDetailUserId(id: string) {
    const res = await safeFetch<{ user?: UserDetail }>(`/api/admin/users/${id}`)
    if (res.data?.user) setDetail(res.data.user)
  }
}

function UserDetailDialog({
  user, onClose, onBan, onUnban,
}: {
  user: UserDetail
  onClose: () => void
  onBan: () => void
  onUnban: () => void
}) {
  const hasBannedPages = user.pages.some(p => p.moderationState === 'BANNED')
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden" showCloseButton>
        <div className="h-1.5 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-evergreen/10 text-evergreen font-bold">
              {(user.name || user.email)[0]?.toUpperCase()}
            </span>
            {user.name || user.email.split('@')[0]}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Mail className="h-3 w-3" /> {user.email} · joined {new Date(user.createdAt).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-2 max-h-[60vh] overflow-y-auto space-y-4">
          {/* Pages */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <FileText className="h-4 w-4 text-evergreen" />
              Pages ({user.pages.length})
            </h4>
            {user.pages.length === 0 ? (
              <p className="text-xs text-muted-foreground">No pages yet.</p>
            ) : (
              <div className="space-y-1.5">
                {user.pages.map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 text-xs">
                    <div className="min-w-0">
                      <span className="font-medium truncate">{p.title}</span>
                      <span className="text-muted-foreground font-mono ml-2">/p/{p.slug}</span>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      p.moderationState === 'APPROVED' ? 'pill-approved' :
                      p.moderationState === 'BANNED' ? 'pill-banned' :
                      p.moderationState === 'PENDING' ? 'pill-pending' : 'pill-restricted'
                    }`}>
                      {p.moderationState}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ad integrations */}
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
              <Plug className="h-4 w-4 text-gold-dark" />
              Ad integrations ({user.adIntegrations.length})
            </h4>
            {user.adIntegrations.length === 0 ? (
              <p className="text-xs text-muted-foreground">No integrations.</p>
            ) : (
              <div className="space-y-1.5">
                {user.adIntegrations.map(int => (
                  <div key={int.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 text-xs">
                    <div className="min-w-0">
                      <span className="font-medium">{int.adNetwork.displayName}</span>
                      <span className="text-muted-foreground font-mono ml-2">{int.integrationType}</span>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      int.lifecycleState === 'APPROVED' ? 'pill-approved' :
                      int.lifecycleState === 'PENDING_REVIEW' ? 'pill-pending' :
                      int.lifecycleState === 'REVOKED' ? 'pill-revoked' : 'pill-draft'
                    }`}>
                      {int.lifecycleState.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="p-6 pt-3 border-t border-border/60">
          {hasBannedPages ? (
            <Button variant="outline" size="sm" onClick={onUnban} className="border-evergreen/30 text-evergreen hover:bg-evergreen/5">
              <ShieldCheck className="h-4 w-4 mr-1" /> Restore user
            </Button>
          ) : (
            user.role === 'USER' && (
              <Button variant="outline" size="sm" onClick={onBan} className="border-cranberry/30 text-cranberry hover:bg-cranberry/5">
                <Ban className="h-4 w-4 mr-1" /> Ban user
              </Button>
            )
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
