'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { safeFetch } from '@/lib/safe-fetch'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import {
  Share2, ExternalLink, ChevronLeft, MapPin, Globe2, Clock, Sparkles,
  FileText, Eye,
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

  if (loading) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading profile…</div>

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-md">
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-xl font-bold mb-1 font-serif">{error}</p>
            <p className="text-sm text-muted-foreground mb-6">This creator may not exist or their profile is private.</p>
            <Button variant="outline" onClick={() => navigate({ name: 'landing' })}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to home
            </Button>
          </CardContent>
        </Card>
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
                  <FileText className="h-3 w-3 mr-1" /> {profile.stats.totalPages} pages
                </Badge>
              </div>
            </div>

            {/* Share */}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const url = `${window.location.origin}/#/profile/${profile.username}`
                navigator.clipboard.writeText(url)
                alert('Profile link copied')
              }}
              className="bg-cream/15 text-cream hover:bg-cream/25 border-cream/20 backdrop-blur-sm"
            >
              <Share2 className="h-4 w-4 mr-1.5" /> Share
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Body */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Interests */}
        {profile.interests.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2">Interests</h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.map(i => (
                <Badge key={i} variant="outline" className="bg-evergreen/5 text-evergreen border-evergreen/30">
                  {i}
                </Badge>
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
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-evergreen/40 hover:bg-evergreen/5 transition-all"
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
            Pages ({profile.pages.length})
          </h3>
          {profile.pages.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm">No published pages yet.</p>
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
                  <Card className="overflow-hidden hover:shadow-elevated hover:-translate-y-0.5 transition-all cursor-pointer"
                    onClick={() => {
                      window.location.hash = `/p/${page.slug}`
                      navigate({ name: 'public', slug: page.slug })
                    }}
                  >
                    <div className="h-0.5 w-full bg-gradient-to-r from-evergreen to-gold" />
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold truncate">{page.title}</h4>
                          <p className="text-xs text-muted-foreground font-mono truncate">/p/{page.slug}</p>
                          {page.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{page.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {page.campaign && (
                              <Badge variant="outline" className="bg-gold/5 text-gold-dark border-gold/30 text-[10px]">
                                {page.campaign.title}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">
                              {page._count.blocks} blocks · {page.publishedAt ? new Date(page.publishedAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
  )
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
