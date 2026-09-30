'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { safeFetch } from '@/lib/safe-fetch'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import { CountUp } from '@/components/animated/count-up'
import { FollowButton } from '@/components/social/follow-button'
import { FollowersDialog } from '@/components/social/followers-dialog'
import { useCurrentUser } from '@/components/social/use-current-user'
import {
  Share2, ExternalLink, ChevronLeft, MapPin, Globe2, Clock, Sparkles,
  FileText, Eye, AlertCircle, Users, UserCheck,
} from 'lucide-react'
import type { View } from '@/app/page'

type SocialLink = { platform: string; url: string; label?: string }
type PublicPage = {
  id: string; slug: string; title: string; description: string | null
  pageType: string; publishedAt: string | null
  campaign: { title: string } | null
  _count: { blocks: number }
}

type CreatorProfile = {
  id: string
  name: string | null
  username: string | null
  bio: string | null
  image: string | null
  coverImage: string | null
  country: string | null
  website: string | null
  interests: string[]
  joinedAt: string
  profileCompletion: number
  socialLinks: SocialLink[]
  pages: PublicPage[]
  stats: { totalPages: number }
}

export default function PublicProfileView({ username, navigate }: { username: string; navigate: (v: View) => void }) {
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Social state — fetched after profile loads.
  const [following, setFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTab, setDialogTab] = useState<'followers' | 'following'>('followers')

  // Visitor auth — fetched via /api/auth/me on mount. isOwn is true when the
  // visitor is looking at their own profile (in which case we hide the Follow
  // button since you can't follow yourself).
  const { user: currentUser, isOwn } = useCurrentUser(profile?.id)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      const res = await safeFetch<{ profile?: CreatorProfile }>(`/api/profile/${username}`)
      if (cancelled) return
      if (res.error) {
        setError(res.error)
      } else if (res.data?.profile) {
        setProfile(res.data.profile)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [username])

  // ── Fetch follow status + follower/following counts ──────────────────────
  // The follow status (GET /api/follow/[username]) requires the visitor to be
  // logged in — if not, we skip it. The counts endpoints are public.
  // We fetch with limit=50 (the API max) to get an accurate count up to 50;
  // if a nextCursor is returned, we display "50+" instead.
  useEffect(() => {
    if (!username) return
    let cancelled = false
    ;(async () => {
      const [followRes, followersRes, followingRes] = await Promise.all([
        // Follow status — only meaningful if logged in (the API returns 401
        // otherwise, which we ignore).
        currentUser
          ? safeFetch<{ following: boolean }>(`/api/follow/${encodeURIComponent(username)}`)
          : Promise.resolve({ data: null, error: null, status: 0 } as const),
        safeFetch<{ followers?: { id: string }[]; nextCursor: string | null }>(`/api/followers/${encodeURIComponent(username)}?limit=50`),
        safeFetch<{ following?: { id: string }[]; nextCursor: string | null }>(`/api/following/${encodeURIComponent(username)}?limit=50`),
      ])
      if (cancelled) return
      if (!followRes.error && followRes.data) {
        setFollowing(!!followRes.data.following)
      }
      if (!followersRes.error && followersRes.data) {
        const list = followersRes.data.followers || []
        const more = !!followersRes.data.nextCursor
        setFollowersCount(more ? 50 : list.length)
      }
      if (!followingRes.error && followingRes.data) {
        const list = followingRes.data.following || []
        const more = !!followingRes.data.nextCursor
        setFollowingCount(more ? 50 : list.length)
      }
    })()
    return () => { cancelled = true }
  }, [username, currentUser])

  if (loading) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 mesh-bg opacity-30 pointer-events-none" aria-hidden />
        <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />
        <div className="relative z-10 container mx-auto px-4 py-20 max-w-md flex items-center justify-center">
          <div className="glass-card rounded-2xl p-8 text-center w-full">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="font-serif text-lg font-bold mb-1">Loading profile…</p>
            <p className="text-sm text-muted-foreground mb-4">Fetching the creator&apos;s details.</p>
            <div className="h-1.5 w-32 mx-auto rounded-full overflow-hidden bg-muted/40">
              <div className="h-full w-1/2 shimmer-bg rounded-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 mesh-bg opacity-30 pointer-events-none" aria-hidden />
        <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />
        <div className="relative z-10 container mx-auto px-4 py-12 max-w-md">
          <Alert className="border-cranberry/40 bg-cranberry/5 backdrop-blur-sm shadow-festive">
            <AlertCircle className="h-4 w-4 text-cranberry" />
            <AlertDescription>
              <p className="font-serif text-lg font-bold mb-1 text-foreground">{error}</p>
              <p className="text-sm text-muted-foreground mb-4">This creator may not exist or their profile is private.</p>
              <Button variant="outline" size="sm" onClick={() => navigate({ name: 'landing' })} className="border-cranberry/30 text-cranberry hover:bg-cranberry/5 btn-glow overflow-hidden">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back to home
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen">
      {/* Cover + Avatar */}
      <div className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-gradient-to-br from-evergreen-dark via-evergreen to-berry/30" />
        <div className="absolute inset-0 bg-pine-pattern opacity-20" />
        <FloatingOrbs count={3} colors={['gold', 'berry', 'sage']} />

        <div className="container mx-auto px-4 py-10 md:py-14 max-w-3xl relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row items-center md:items-end gap-4"
          >
            {/* Avatar */}
            <div className="relative">
              {profile.image ? (
                <img
                  src={profile.image}
                  alt={profile.name || profile.username || 'Creator'}
                  className="h-24 w-24 md:h-28 md:w-28 rounded-2xl object-cover border-4 border-background shadow-elevated"
                />
              ) : (
                <div className="h-24 w-24 md:h-28 md:w-28 rounded-2xl bg-gradient-to-br from-gold to-gold-dark border-4 border-background shadow-elevated flex items-center justify-center text-4xl font-bold text-cream font-serif">
                  {(profile.name || profile.username || '?')[0]?.toUpperCase()}
                </div>
              )}
              {profile.profileCompletion >= 80 && (
                <span className="absolute -bottom-2 -right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold text-cream shadow-gold ring-2 ring-background">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
              )}
            </div>

            {/* Name + meta */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-serif text-2xl md:text-3xl font-bold text-cream">
                {profile.name || profile.username}
              </h1>
              {profile.username && (
                <p className="text-cream/70 text-sm">@{profile.username}</p>
              )}
              {profile.bio && (
                <p className="text-cream/80 text-sm mt-2 max-w-md">{profile.bio}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
                {profile.country && (
                  <Badge className="bg-cream/15 text-cream border-cream/20 backdrop-blur-sm">
                    <MapPin className="h-3 w-3 mr-1" /> {profile.country}
                  </Badge>
                )}
                <Badge className="bg-cream/15 text-cream border-cream/20 backdrop-blur-sm">
                  <Clock className="h-3 w-3 mr-1" /> Joined {new Date(profile.joinedAt).toLocaleDateString()}
                </Badge>
                <Badge className="bg-cream/15 text-cream border-cream/20 backdrop-blur-sm">
                  <FileText className="h-3 w-3 mr-1" /> <CountUp value={profile.stats.totalPages} duration={1000} /> pages
                </Badge>
                {/* Followers / Following — clickable, opens the dialog */}
                {profile.username && (
                  <>
                    <button
                      onClick={() => { setDialogTab('followers'); setDialogOpen(true) }}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-cream/15 text-cream border border-cream/20 backdrop-blur-sm hover:bg-cream/25 transition-colors"
                      title="View followers"
                    >
                      <Users className="h-3 w-3" />
                      <span className="tabular-nums">
                        {followersCount >= 50 ? '50+' : followersCount}
                      </span>{' '}
                      followers
                    </button>
                    <button
                      onClick={() => { setDialogTab('following'); setDialogOpen(true) }}
                      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-cream/15 text-cream border border-cream/20 backdrop-blur-sm hover:bg-cream/25 transition-colors"
                      title="View following"
                    >
                      <UserCheck className="h-3 w-3" />
                      <span className="tabular-nums">
                        {followingCount >= 50 ? '50+' : followingCount}
                      </span>{' '}
                      following
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Follow + Share actions */}
            <div className="flex flex-col items-center md:items-end gap-2">
              {!isOwn && profile.username && (
                <FollowButton
                  username={profile.username}
                  initialFollowing={following}
                  currentUser={currentUser}
                  variant="hero"
                  onLogin={() => navigate({ name: 'login' })}
                  onFollowingChange={(f) => {
                    setFollowing(f)
                    // Keep follower count in sync (the visitor just became a
                    // follower — or stopped being one).
                    setFollowersCount(prev => Math.max(0, prev + (f ? 1 : -1)))
                  }}
                />
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const url = `${window.location.origin}/#/profile/${profile.username}`
                  navigator.clipboard.writeText(url)
                  alert('Profile link copied')
                }}
                className="bg-cream/15 text-cream hover:bg-cream/25 border-cream/20 backdrop-blur-sm btn-glow overflow-hidden"
              >
                <Share2 className="h-4 w-4 mr-1.5" /> Share
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Body */}
      <div className="relative">
        {/* Ambient body background — subtle so it doesn't compete with the rich hero above. */}
        <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" aria-hidden />
        <FloatingOrbs count={1} colors={['evergreen']} className="opacity-15" />

        <div className="relative z-10 container mx-auto px-4 py-8 max-w-3xl">
          {/* Interests */}
          {profile.interests.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map(i => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gradient-to-br from-evergreen/8 to-gold/5 text-evergreen border border-evergreen/30 hover:from-evergreen/15 hover:to-gold/10 hover:border-evergreen/50 hover:-translate-y-0.5 hover:shadow-sm transition-all"
                  >
                    <Sparkles className="h-3 w-3 opacity-70" />
                    {i}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Social links */}
          {profile.socialLinks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2">Links</h3>
              <div className="flex flex-wrap gap-2">
                {profile.socialLinks.map((sl, i) => (
                  <a
                    key={i}
                    href={sl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-sm px-4 py-2 text-sm hover:border-evergreen/40 hover:bg-evergreen/5 hover:-translate-y-0.5 hover:shadow-sm transition-all"
                  >
                    <SocialIcon platform={sl.platform} />
                    <span>{sl.label || sl.platform}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Pages */}
          <div>
            <h3 className="font-serif text-xl font-bold mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-evergreen" />
              Pages
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-evergreen/15 to-gold/10 text-evergreen border border-evergreen/30">
                <CountUp value={profile.pages.length} duration={800} />
              </span>
            </h3>
            {profile.pages.length === 0 ? (
              <Card className="border-dashed border-evergreen/30 bg-card/60 backdrop-blur-sm">
                <CardContent className="py-12 text-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-evergreen/10 to-gold/8 text-evergreen/60 mb-3"
                  >
                    <FileText className="h-7 w-7" />
                  </motion.div>
                  <p className="font-medium text-foreground mb-1">No published pages yet</p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    This creator hasn&apos;t published any Special Pages. Check back soon!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {profile.pages.map((page, i) => (
                  <motion.div
                    key={page.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      className="relative overflow-hidden hover:shadow-elevated hover:-translate-y-0.5 hover:border-evergreen/40 transition-all cursor-pointer glass-card"
                      onClick={() => {
                        window.location.hash = `/p/${page.slug}`
                        navigate({ name: 'public', slug: page.slug })
                      }}
                    >
                      <div className="h-0.5 w-full bg-gradient-to-r from-evergreen to-gold" />
                      <CardContent className="py-4">
                        <div className="flex items-start gap-3">
                          {/* Page-type icon tile */}
                          <div className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-evergreen/10 to-gold/8 text-xl" aria-hidden>
                            {pageTypeEmoji(page.pageType)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold truncate">{page.title}</h4>
                            <p className="text-xs text-muted-foreground font-mono truncate">/p/{page.slug}</p>
                            {page.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{page.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {page.campaign && (
                                <Badge variant="outline" className="bg-gold/8 text-gold-dark border-gold/30 text-[10px]">
                                  <Sparkles className="h-2.5 w-2.5 mr-1" /> {page.campaign.title}
                                </Badge>
                              )}
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                <FileText className="h-2.5 w-2.5" /> {page._count.blocks} blocks
                              </span>
                              {page.publishedAt && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                  <Clock className="h-2.5 w-2.5" /> {new Date(page.publishedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-evergreen/5 text-evergreen">
                            <Eye className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Followers / Following dialog — rendered at the bottom so it sits
          above all body content via Radix portal. */}
      {profile?.username && profile?.id && (
        <FollowersDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          username={profile.username}
          profileUserId={profile.id}
          currentUser={currentUser}
          initialFollowersCount={followersCount}
          initialFollowingCount={followingCount}
          defaultTab={dialogTab}
          onNavigate={(otherUsername) => {
            setDialogOpen(false)
            window.location.hash = `/profile/${otherUsername}`
            navigate({ name: 'public-profile', username: otherUsername })
          }}
          onLogin={() => navigate({ name: 'login' })}
        />
      )}
    </div>
  )
}

/** Returns an emoji for a given page type. */
function pageTypeEmoji(pageType: string): string {
  const map: Record<string, string> = {
    PERSONAL: '👤',
    CELEBRATION: '🎄',
    LINK_HUB: '🔗',
    CREATOR: '✨',
    BLOGGER: '✍️',
    PHOTOGRAPHY: '📸',
    MUSIC: '🎵',
    GAMING: '🎮',
    BUSINESS: '💼',
    EVENT: '🎉',
  }
  return map[pageType] || '📄'
}

function SocialIcon({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    whatsapp: 'bg-evergreen text-cream',
    telegram: 'bg-chart-4 text-cream',
    facebook: 'bg-berry text-cream',
    x: 'bg-foreground text-background',
    twitter: 'bg-foreground text-background',
    instagram: 'bg-gradient-to-br from-berry via-gold to-evergreen text-cream',
    tiktok: 'bg-foreground text-background',
    youtube: 'bg-cranberry text-cream',
    website: 'bg-evergreen text-cream',
  }
  const c = colors[platform.toLowerCase()] || 'bg-muted text-foreground'
  return (
    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${c} text-[10px] font-bold uppercase`}>
      {platform[0]}
    </span>
  )
}
