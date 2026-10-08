'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { motion, AnimatePresence } from 'framer-motion'
import { safeFetch } from '@/lib/safe-fetch'
import { useConfetti } from '@/components/animated/confetti'
import { FloatingOrbs } from '@/components/animated/floating-orbs'
import {
  Sparkles, Check, X, User, Link2, Eye,
  Loader2, AtSign, MapPin, Globe2, AlertCircle, RefreshCw, ShieldOff,
} from 'lucide-react'
import { BlockMuteSection } from '@/components/social/block-mute-section'
import type { View, CurrentUser } from '@/app/page'

type SocialLink = { id?: string; platform: string; url: string; label?: string }

type ProfileData = {
  id: string
  email: string
  name: string | null
  username: string | null
  bio: string | null
  image: string | null
  coverImage: string | null
  country: string | null
  timezone: string
  locale: string
  website: string | null
  interests: string[]
  profileVisibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'
  socialLinks: SocialLink[]
}

export default function ProfileSetupView({ user, navigate }: { user: CurrentUser; navigate: (v: View) => void }) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Username claiming state
  const [usernameInput, setUsernameInput] = useState('')
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([])
  const [usernameError, setUsernameError] = useState('')

  const { fire: fireConfetti, ConfettiLayer } = useConfetti()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await safeFetch<{ profile?: ProfileData }>('/api/profile/me')
      if (cancelled) return
      if (res.data?.profile) {
        setProfile(res.data.profile)
        if (res.data.profile.username) {
          setUsernameInput(res.data.profile.username)
        }
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  // Debounced username check
  useEffect(() => {
    if (!usernameInput || usernameInput.length < 3) {
      return
    }
    const t = setTimeout(async () => {
      setUsernameChecking(true)
      const res = await safeFetch<{ available?: boolean; reason?: string; suggestions?: string[] }>(
        `/api/profile/username?check=${encodeURIComponent(usernameInput.toLowerCase())}`
      )
      setUsernameChecking(false)
      if (res.data) {
        setUsernameAvailable(res.data.available ?? false)
        if (!res.data.available && res.data.reason) {
          setUsernameError(res.data.reason)
          setUsernameSuggestions(res.data.suggestions || [])
        } else {
          setUsernameSuggestions([])
        }
      }
    }, 400)
    return () => clearTimeout(t)
  }, [usernameInput])

  async function claimUsername() {
    if (!usernameInput || usernameAvailable !== true) return
    setError('')
    const res = await safeFetch('/api/profile/username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput.toLowerCase() }),
    })
    if (res.error) {
      setError(res.error)
      return
    }
    fireConfetti({ count: 80, spread: 60, y: 0.35 })
    setProfile(prev => prev ? { ...prev, username: usernameInput.toLowerCase() } : prev)
  }

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    setError('')
    const res = await safeFetch('/api/profile/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: profile.name,
        bio: profile.bio,
        image: profile.image,
        coverImage: profile.coverImage,
        country: profile.country,
        website: profile.website,
        interests: profile.interests,
        profileVisibility: profile.profileVisibility,
        socialLinks: profile.socialLinks,
      }),
    })
    setSaving(false)
    if (res.error) {
      setError(res.error)
      return
    }
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  if (loading) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 mesh-bg opacity-30 pointer-events-none" aria-hidden />
        <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl flex items-center justify-center min-h-[60vh]">
          <div className="glass-card rounded-2xl p-8 text-center w-full max-w-md">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <p className="font-serif text-lg font-bold mb-1">Loading your profile</p>
            <p className="text-sm text-muted-foreground mb-4">Hang tight while we fetch your details…</p>
            <div className="h-1.5 w-32 mx-auto rounded-full overflow-hidden bg-muted/40">
              <div className="h-full w-1/2 shimmer-bg rounded-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="relative min-h-screen">
        <div className="absolute inset-0 mesh-bg opacity-30 pointer-events-none" aria-hidden />
        <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />
        <div className="relative z-10 container mx-auto px-4 py-8 max-w-2xl">
          <Alert className="border-cranberry/40 bg-cranberry/5 backdrop-blur-sm shadow-festive">
            <AlertCircle className="h-4 w-4 text-cranberry" />
            <AlertDescription>
              <p className="font-semibold text-foreground mb-1">Failed to load profile</p>
              <p className="text-sm text-muted-foreground mb-4">
                We couldn&apos;t fetch your profile details. Please try again.
              </p>
              <Button size="sm" variant="outline" onClick={() => location.reload()} className="border-cranberry/30 text-cranberry hover:bg-cranberry/5">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      {/* Ambient background layer — subtle mesh + drifting orbs so the
          profile setup view sits on a layered surface rather than flat bg-background. */}
      <div className="absolute inset-0 mesh-bg opacity-30 pointer-events-none" aria-hidden />
      <FloatingOrbs count={2} colors={['evergreen', 'gold']} className="opacity-20" />

      <div className="relative z-10 view-fade container mx-auto px-4 py-8 max-w-2xl">
        {ConfettiLayer}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative mb-8">
          <div className="absolute -inset-x-3 -inset-y-4 rounded-3xl bg-gradient-to-br from-evergreen/8 via-gold/4 to-berry/5 pointer-events-none" aria-hidden />
          <div className="relative">
            <h1 className="font-serif text-3xl font-bold mb-1 flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-evergreen" />
              Set up your profile
            </h1>
            <p className="text-muted-foreground">Claim your username and customize how you appear to the world.</p>
          </div>
        </motion.div>

      {/* Username claiming */}
      <Card className={`mb-6 overflow-hidden glass-strong shadow-festive ${profile.username ? 'border-evergreen/30' : 'border-gold/40'}`}>
        <div className={`h-1.5 w-full ${profile.username ? 'bg-gradient-to-r from-evergreen to-evergreen-light' : 'bg-gradient-to-r from-gold to-gold-dark'}`} />
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AtSign className="h-5 w-5 text-evergreen" />
            {profile.username ? 'Your username' : 'Claim your username'}
          </CardTitle>
          <CardDescription>
            {profile.username
              ? 'Your unique handle on Earnova. Changing it will break existing links.'
              : 'Choose a unique handle for your public profile (e.g. earnova.com/@kingsley).'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">@</span>
              <Input
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="kingsley"
                className={`pl-7 font-mono transition-colors ${
                  !profile.username && usernameAvailable === true ? 'border-evergreen/50 focus:ring-2 focus:ring-evergreen/20'
                  : !profile.username && usernameAvailable === false ? 'border-cranberry/50 focus:ring-2 focus:ring-cranberry/20'
                  : ''
                }`}
                disabled={!!profile.username}
                maxLength={20}
              />
              {usernameChecking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              {!usernameChecking && usernameAvailable === true && !profile.username && (
                <motion.span
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 14 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-evergreen/15"
                >
                  <Check className="h-3.5 w-3.5 text-evergreen" />
                </motion.span>
              )}
              {!usernameChecking && usernameAvailable === false && !profile.username && (
                <motion.span
                  initial={{ scale: 0, rotate: 90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 14 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-cranberry/15"
                >
                  <X className="h-3.5 w-3.5 text-cranberry" />
                </motion.span>
              )}
            </div>
            {!profile.username && (
              <Button
                onClick={claimUsername}
                disabled={!usernameInput || usernameAvailable !== true || usernameChecking}
                className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
              >
                Claim
              </Button>
            )}
          </div>

          {/* Username status */}
          {usernameError && !profile.username && (
            <p className="text-xs text-cranberry flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 flex-shrink-0" />
              {usernameError}
            </p>
          )}
          {usernameSuggestions.length > 0 && !profile.username && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Try:</span>
              {usernameSuggestions.map(s => (
                <button
                  key={s}
                  onClick={() => setUsernameInput(s)}
                  className="text-xs font-mono px-2 py-1 rounded-lg bg-evergreen/5 text-evergreen border border-evergreen/20 hover:bg-evergreen/15 hover:border-evergreen/40 hover:-translate-y-0.5 transition-all"
                >
                  @{s}
                </button>
              ))}
            </div>
          )}
          {profile.username && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-evergreen/5 border border-evergreen/20">
              <Badge className="bg-evergreen/15 text-evergreen border-evergreen/30">
                <Check className="h-3 w-3 mr-1" /> Claimed
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">earnova.com/@{profile.username}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile fields */}
      <Card className="mb-6 overflow-hidden glass-strong shadow-festive">
        <div className="h-1.5 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-evergreen" />
            Profile information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Display name</Label>
            <Input
              value={profile.name || ''}
              onChange={e => setProfile({ ...profile, name: e.target.value })}
              placeholder="Kingsley Owusu"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Bio</Label>
            <Textarea
              value={profile.bio || ''}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell people who you are and what you create..."
              rows={3}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                <MapPin className="inline h-3 w-3 mr-1" />Country
              </Label>
              <Input
                value={profile.country || ''}
                onChange={e => setProfile({ ...profile, country: e.target.value })}
                placeholder="Ghana"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                <Link2 className="inline h-3 w-3 mr-1" />Website
              </Label>
              <Input
                value={profile.website || ''}
                onChange={e => setProfile({ ...profile, website: e.target.value })}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Avatar URL</Label>
            <Input
              value={profile.image || ''}
              onChange={e => setProfile({ ...profile, image: e.target.value })}
              placeholder="https://..."
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Interests (comma-separated)</Label>
            <Input
              value={profile.interests.join(', ')}
              onChange={e => setProfile({ ...profile, interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="music, photography, christmas"
              className="mt-1"
            />
            {profile.interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
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
            )}
          </div>

          {/* Visibility */}
          <div>
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              <Eye className="inline h-3 w-3 mr-1" />Profile visibility
            </Label>
            <div className="mt-2 flex gap-1.5">
              {(['PUBLIC', 'UNLISTED', 'PRIVATE'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setProfile({ ...profile, profileVisibility: v })}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    profile.profileVisibility === v
                      ? 'bg-evergreen text-cream shadow-festive'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social links */}
      <Card className="mb-6 overflow-hidden glass-strong shadow-festive">
        <div className="h-1.5 w-full bg-gradient-to-r from-gold via-evergreen to-berry" />
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-gold-dark" />
            Social links
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {profile.socialLinks.map((sl, i) => (
            <div
              key={i}
              className="flex gap-2 items-center p-2 rounded-xl bg-gradient-to-r from-card/80 to-card/40 backdrop-blur-sm border border-border/50 hover:border-evergreen/30 transition-colors flex-wrap"
            >
              <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-evergreen/15 to-gold/10 text-evergreen font-bold text-xs uppercase">
                {sl.platform ? sl.platform[0] : <Globe2 className="h-3.5 w-3.5" />}
              </span>
              <Input
                value={sl.platform}
                onChange={e => {
                  const links = [...profile.socialLinks]
                  links[i] = { ...links[i], platform: e.target.value }
                  setProfile({ ...profile, socialLinks: links })
                }}
                placeholder="platform"
                className="w-20 sm:w-28 font-mono text-sm h-9 border-transparent bg-transparent focus-visible:border-border flex-shrink-0"
              />
              <Input
                value={sl.url}
                onChange={e => {
                  const links = [...profile.socialLinks]
                  links[i] = { ...links[i], url: e.target.value }
                  setProfile({ ...profile, socialLinks: links })
                }}
                placeholder="https://..."
                className="flex-1 min-w-[8rem] font-mono text-sm h-9 border-transparent bg-transparent focus-visible:border-border"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setProfile({ ...profile, socialLinks: profile.socialLinks.filter((_, idx) => idx !== i) })}
                className="text-muted-foreground hover:text-cranberry hover:bg-cranberry/5 h-9 px-2 flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setProfile({ ...profile, socialLinks: [...profile.socialLinks, { platform: '', url: '' }] })}
            className="border-evergreen/30 text-evergreen hover:bg-evergreen/5 btn-glow overflow-hidden"
          >
            + Add link
          </Button>
        </CardContent>
      </Card>

      {/* Block / mute management — Trust & Safety Phase 9 */}
      <Card className="mb-6 overflow-hidden glass-strong shadow-festive">
        <div className="h-1.5 w-full bg-gradient-to-r from-cranberry via-berry to-gold" />
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-cranberry" />
            Blocked &amp; muted users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BlockMuteSection navigate={navigate} />
        </CardContent>
      </Card>

      {/* Error + Save */}
      {error && (
        <div className="p-3 rounded-lg bg-cranberry/10 border border-cranberry/30 text-sm text-cranberry mb-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="ghost" onClick={() => navigate({ name: 'dashboard' })} className="flex-shrink-0">
          Skip for now
        </Button>
        <div className="flex items-center gap-3 flex-shrink-0">
          {savedFlash && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-sm text-evergreen font-medium"
            >
              ✓ Saved
            </motion.span>
          )}
          <Button
            onClick={saveProfile}
            disabled={saving}
            className="bg-evergreen text-cream hover:bg-evergreen-dark btn-glow overflow-hidden"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </div>
      </div>
    </div>
  )
}
