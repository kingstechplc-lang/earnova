'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animated/motion'
import { motion } from 'framer-motion'
import { safeFetch } from '@/lib/safe-fetch'
import { useConfetti } from '@/components/animated/confetti'
import { Search, FileText, Eye, ChevronRight } from 'lucide-react'

type AdminPage = {
  id: string; slug: string; title: string; pageType: string
  moderationState: string; publishedAt: string | null; createdAt: string; updatedAt: string
  owner: { id: string; email: string; name: string | null }
  campaign: { id: string; title: string } | null
  _count: { blocks: number; placements: number }
}

const STATES = ['ALL', 'PENDING', 'APPROVED', 'RESTRICTED', 'SUSPENDED', 'BANNED'] as const

export function PagesSection() {
  const [pages, setPages] = useState<AdminPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState<string>('ALL')
  const { fire: fireConfetti, ConfettiLayer } = useConfetti()

  const load = async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (stateFilter !== 'ALL') params.set('state', stateFilter)
    const res = await safeFetch<{ pages?: AdminPage[] }>(`/api/admin/pages?${params}`)
    if (res.error) setError(res.error)
    setPages(res.data?.pages || [])
    setLoading(false)
  }
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [search, stateFilter])

  async function changeState(page: AdminPage, newState: string) {
    if (page.moderationState === newState) return
    const reason = prompt(`Change "${page.title}" from ${page.moderationState} to ${newState}? Reason (optional):`)
    if (reason === null) return
    const res = await safeFetch(`/api/admin/pages/${page.id}/moderation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: newState, reason: reason || `Manual moderation` }),
    })
    if (res.error) { alert(res.error); return }
    if (newState === 'APPROVED') fireConfetti({ count: 80, spread: 60, y: 0.4 })
    load()
  }

  return (
    <div className="space-y-4">
      {ConfettiLayer}
      <FadeIn>
        <div className="mb-3">
          <h3 className="font-serif text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-evergreen" />
            Page moderation
          </h3>
          <p className="text-sm text-muted-foreground">{pages.length} shown · change moderation state per page</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title or slug..."
              className="pl-9"
            />
          </div>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATES.map(s => <SelectItem key={s} value={s}>{s === 'ALL' ? 'All states' : s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </FadeIn>

      {loading && pages.length === 0 ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl shimmer-bg" />)}</div>
      ) : error ? (
        <Card className="border-cranberry/40"><CardContent className="py-4 text-sm text-cranberry">{error}</CardContent></Card>
      ) : (
        <StaggerContainer className="space-y-2">
          {pages.map(p => (
            <StaggerItem key={p.id} y={10}>
              <Card className="overflow-hidden hover:shadow-elevated transition-all">
                <div className={`h-0.5 w-full ${
                  p.moderationState === 'APPROVED' ? 'bg-gradient-to-r from-evergreen to-evergreen-light' :
                  p.moderationState === 'PENDING' ? 'bg-gradient-to-r from-gold to-gold-dark' :
                  p.moderationState === 'BANNED' ? 'bg-gradient-to-r from-cranberry to-berry' :
                  p.moderationState === 'SUSPENDED' ? 'bg-gradient-to-r from-cranberry to-cranberry/70' :
                  'bg-gradient-to-r from-amber-500 to-amber-700'
                }`} />
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-medium truncate">{p.title}</h4>
                        {p.publishedAt ? (
                          <Badge variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30 text-[10px]">Published</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Draft</Badge>
                        )}
                        {p.campaign && <Badge variant="outline" className="text-[10px] bg-gold/5 text-gold-dark border-gold/30">{p.campaign.title}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        /p/{p.slug} · {p._count.blocks} blocks · {p._count.placements} placements
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        Owner: <strong className="text-foreground">{p.owner.name || p.owner.email}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Select
                        value={p.moderationState}
                        onValueChange={(v) => changeState(p, v)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATES.filter(s => s !== 'ALL').map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => { window.location.hash = `/p/${p.slug}` }}
                        title="View page"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
          {pages.length === 0 && !loading && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="font-medium">No pages found</p>
                <p className="text-sm">Try a different search or filter.</p>
              </CardContent>
            </Card>
          )}
        </StaggerContainer>
      )}
    </div>
  )
}
