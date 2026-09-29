// Single-page application: all views render at "/" with client-side view-state navigation.
// Public Special Page is fetched via /api/p/[slug] and rendered in a "view" panel.
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

export type CurrentUser = { id: string; email: string; name: string | null; role: string }

export default function Home() {
  const [view, setView] = useState<View>({ name: 'landing' })
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUser(d.user)
      setLoading(false)
    })
  }, [])

  const navigate = useCallback((v: View) => {
    setView(v)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Hash-based deep linking for public pages: #/p/<slug>
  useEffect(() => {
    const handleHash = () => {
      const h = window.location.hash
      const m = h.match(/^#\/p\/(.+)$/)
      if (m) navigate({ name: 'public', slug: decodeURIComponent(m[1]) })
    }
    handleHash()
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
  const showSidebar = user && view.name !== 'landing' && view.name !== 'login' && view.name !== 'signup' && view.name !== 'public'

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
              <PageTransition key={view.name + ('pageId' in view ? view.pageId : '') + ('slug' in view ? view.slug : '')}>
                {view.name === 'dashboard' && user && <DashboardView user={user} navigate={navigate} />}
                {view.name === 'builder' && user && <BuilderView pageId={view.pageId} user={user} navigate={navigate} />}
                {view.name === 'monetization' && user && <MonetizationView user={user} navigate={navigate} />}
                {view.name === 'analytics' && user && <AnalyticsView pageId={view.pageId} user={user} navigate={navigate} />}
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
            <PageTransition key={view.name + ('pageId' in view ? view.pageId : '') + ('slug' in view ? view.slug : '')}>
              {view.name === 'landing' && <LandingView navigate={navigate} user={user} />}
              {view.name === 'login' && <LoginView onAuth={onAuth} navigate={navigate} />}
              {view.name === 'signup' && <SignupView onAuth={onAuth} navigate={navigate} />}
              {view.name === 'public' && <PublicPageView slug={view.slug} navigate={navigate} />}
            </PageTransition>
          </main>
          <Footer />
        </div>
      )}
    </div>
  )
}
