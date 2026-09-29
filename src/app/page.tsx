// Single-page application: all views render at "/" with client-side view-state navigation.
// Public Special Page is fetched via /api/p/[slug] and rendered in a "view" panel.
// Public Post is fetched via /api/post/[id] and rendered in a "view" panel.
'use client'
import { useState, useEffect, useCallback } from 'react'
import { PageTransition } from '@/components/animated/motion'
import LandingView from '@/components/views/landing-view'
import LoginView from '@/components/views/login-view'
import SignupView from '@/components/views/signup-view'
import DashboardView from '@/components/views/dashboard-view'
import BuilderView from '@/components/views/builder-view'
import MonetizationView from '@/components/views/monetization-view'
import AdminView from '@/components/views/admin-view'
import PublicPageView from '@/components/views/public-page-view'
import AnalyticsView from '@/components/views/analytics-view'
import ProfileSetupView from '@/components/views/profile-setup-view'
import PublicProfileView from '@/components/views/public-profile-view'
import PostsView from '@/components/views/posts-view'
import PostEditorView from '@/components/views/post-editor-view'
import PublicPostView from '@/components/views/public-post-view'
import Header from '@/components/layout/header'
import Footer from '@/components/layout/footer'
import Sidebar from '@/components/layout/sidebar'

export type View =
  | { name: 'landing' }
  | { name: 'login' }
  | { name: 'signup' }
  | { name: 'dashboard' }
  | { name: 'builder'; pageId: string }
  | { name: 'monetization' }
  | { name: 'analytics'; pageId: string }
  | { name: 'admin' }
  | { name: 'public'; slug: string }
  | { name: 'profile-setup' }
  | { name: 'public-profile'; username: string }
  | { name: 'posts' }
  | { name: 'post-editor'; postId?: string }
  | { name: 'public-post'; postId: string }

export type CurrentUser = { id: string; email: string; name: string | null; role: string }

export default function Home() {
  const [view, setView] = useState<View>({ name: 'landing' })
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // ── Single source of truth for initial view ─────────────────────────────
  // Combines auth check + hash routing + sessionStorage restore into ONE
  // effect so there's no race condition between them.
  //
  // Priority on initial load:
  //   1. Public hash in URL (#/p/, #/profile/, #/post/) → navigate to that public view
  //   2. Logged in + saved view in sessionStorage → restore that view
  //   3. Logged in + no saved view → dashboard
  //   4. Not logged in → landing
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      let u: CurrentUser | null = null
      try {
        const res = await fetch('/api/auth/me')
        const d = await res.json()
        u = d.user
      } catch {
        // Network error — treat as not logged in
      }
      if (cancelled) return
      setUser(u)

      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      const pageMatch = hash.match(/^#\/p\/(.+)$/)
      const profileMatch = hash.match(/^#\/profile\/(.+)$/)
      const postMatch = hash.match(/^#\/post\/(.+)$/)

      if (pageMatch) {
        setView({ name: 'public', slug: decodeURIComponent(pageMatch[1]) })
      } else if (profileMatch) {
        setView({ name: 'public-profile', username: decodeURIComponent(profileMatch[1]) })
      } else if (postMatch) {
        setView({ name: 'public-post', postId: decodeURIComponent(postMatch[1]) })
      } else if (u) {
        // Logged in, no public hash — restore from sessionStorage
        try {
          const saved = sessionStorage.getItem('earnova_view')
          if (saved) {
            const savedView = JSON.parse(saved) as View
            if (savedView.name && !['landing', 'login', 'signup'].includes(savedView.name)) {
              setView(savedView)
            } else {
              setView({ name: 'dashboard' })
            }
          } else {
            setView({ name: 'dashboard' })
          }
        } catch {
          setView({ name: 'dashboard' })
        }
      } else {
        // Not logged in, no hash → landing
        setView({ name: 'landing' })
      }

      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const navigate = useCallback((v: View) => {
    setView(v)
    if (typeof window !== 'undefined') {
      // Persist to sessionStorage so a refresh restores this view
      try {
        sessionStorage.setItem('earnova_view', JSON.stringify(v))
      } catch {
        // Ignore storage errors (private mode, quota, etc.)
      }

      // ── Update/clear the URL hash ──────────────────────────────────────
      // Public views get a shareable hash (#/p/slug, #/profile/username, #/post/id).
      // Authenticated views (dashboard, posts, builder, etc.) CLEAR the hash so
      // a refresh doesn't redirect back to a previously-visited public page.
      let newHash = ''
      if (v.name === 'public') newHash = `#/p/${v.slug}`
      else if (v.name === 'public-profile') newHash = `#/profile/${v.username}`
      else if (v.name === 'public-post') newHash = `#/post/${v.postId}`

      const currentHash = window.location.hash
      if (newHash !== currentHash) {
        // Use replaceState (NOT pushState) so the browser's back button
        // doesn't get cluttered with hash changes. replaceState also
        // doesn't trigger the hashchange event, avoiding a re-navigate loop.
        const newUrl = newHash
          ? `${window.location.pathname}${window.location.search}${newHash}`
          : `${window.location.pathname}${window.location.search}`
        window.history.replaceState(null, '', newUrl)
      }

      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  // ── Hashchange listener (browser back/forward + manual URL changes) ─────
  // Only fires on hashchange events AFTER initial load — the initial hash
  // is handled by the auth effect above.
  useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash
      const pageMatch = h.match(/^#\/p\/(.+)$/)
      const profileMatch = h.match(/^#\/profile\/(.+)$/)
      const postMatch = h.match(/^#\/post\/(.+)$/)
      if (pageMatch) navigate({ name: 'public', slug: decodeURIComponent(pageMatch[1]) })
      if (profileMatch) navigate({ name: 'public-profile', username: decodeURIComponent(profileMatch[1]) })
      if (postMatch) navigate({ name: 'public-post', postId: decodeURIComponent(postMatch[1]) })
    }
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [navigate])

  const onAuth = (u: CurrentUser) => {
    setUser(u)
    navigate({ name: 'dashboard' })
  }

  const onLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    // Clear the saved view so a refresh after logout doesn't restore an
    // authenticated view (which would immediately redirect to landing anyway)
    try { sessionStorage.removeItem('earnova_view') } catch {}
    navigate({ name: 'landing' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-evergreen/30 blur-xl animate-ping" />
          <div className="relative h-12 w-12 rounded-full border-2 border-evergreen/30 border-t-evergreen animate-spin" />
        </div>
      </div>
    )
  }

  // Determine if we should show the sidebar (authenticated + non-public views)
  const showSidebar = user && view.name !== 'landing' && view.name !== 'login' && view.name !== 'signup' && view.name !== 'public' && view.name !== 'public-profile' && view.name !== 'public-post'

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {showSidebar ? (
        <div className="flex w-full">
          <Sidebar
            user={user}
            view={view}
            navigate={navigate}
            onLogout={onLogout}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <main className="flex-1">
              <PageTransition key={view.name + ('pageId' in view ? view.pageId : '') + ('slug' in view ? view.slug : '') + ('postId' in view ? view.postId : '')}>
                {view.name === 'dashboard' && user && <DashboardView user={user} navigate={navigate} />}
                {view.name === 'builder' && user && <BuilderView pageId={view.pageId} user={user} navigate={navigate} />}
                {view.name === 'monetization' && user && <MonetizationView user={user} navigate={navigate} />}
                {view.name === 'analytics' && user && <AnalyticsView pageId={view.pageId} user={user} navigate={navigate} />}
                {view.name === 'profile-setup' && user && <ProfileSetupView user={user} navigate={navigate} />}
                {view.name === 'posts' && user && <PostsView user={user} navigate={navigate} />}
                {view.name === 'post-editor' && user && <PostEditorView postId={view.postId} user={user} navigate={navigate} />}
                {view.name === 'admin' && user && (user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                  <AdminView user={user} navigate={navigate} />
                )}
              </PageTransition>
            </main>
            <Footer />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <Header user={user} view={view} navigate={navigate} onLogout={onLogout} />
          <main className="flex-1">
            <PageTransition key={view.name + ('pageId' in view ? view.pageId : '') + ('slug' in view ? view.slug : '') + ('postId' in view ? view.postId : '')}>
              {view.name === 'landing' && <LandingView navigate={navigate} user={user} />}
              {view.name === 'login' && <LoginView onAuth={onAuth} navigate={navigate} />}
              {view.name === 'signup' && <SignupView onAuth={onAuth} navigate={navigate} />}
              {view.name === 'public' && <PublicPageView slug={view.slug} navigate={navigate} />}
              {view.name === 'public-profile' && <PublicProfileView username={view.username} navigate={navigate} />}
              {view.name === 'public-post' && <PublicPostView postId={view.postId} navigate={navigate} />}
            </PageTransition>
          </main>
          <Footer />
        </div>
      )}
    </div>
  )
}
