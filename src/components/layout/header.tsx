'use client'
import { Button } from '@/components/ui/button'
import { Sparkles, LayoutDashboard, Wallet, Shield, LogOut, Menu } from 'lucide-react'
import { useState } from 'react'
import type { View, CurrentUser } from '@/app/page'

export default function Header({
  user, view, navigate, onLogout,
}: {
  user: CurrentUser | null
  view: View
  navigate: (v: View) => void
  onLogout: () => void
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItem = (label: string, icon: React.ReactNode, target: View, current: boolean) => (
    <Button
      variant={current ? 'secondary' : 'ghost'}
      size="sm"
      onClick={() => { navigate(target); setMobileOpen(false) }}
      className={`gap-1.5 ${current ? 'bg-evergreen/10 text-evergreen hover:bg-evergreen/15' : 'text-foreground/70 hover:text-foreground'}`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      {/* Thin gold accent line at top */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <button
          onClick={() => navigate({ name: 'landing' })}
          className="flex items-center gap-2.5 font-semibold"
        >
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive">
            <Sparkles className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-background" />
          </span>
          <span className="flex flex-col leading-tight text-left">
            <span className="text-sm font-bold tracking-tight text-foreground">Global Creator Pages</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">Christmas 2026 · Live</span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1.5">
          {user ? (
            <>
              {navItem('Dashboard', <LayoutDashboard className="h-4 w-4" />, { name: 'dashboard' }, view.name === 'dashboard')}
              {navItem('Monetization', <Wallet className="h-4 w-4" />, { name: 'monetization' }, view.name === 'monetization')}
              {(user.role === 'ADMIN' || user.role === 'MODERATOR') &&
                navItem('Admin', <Shield className="h-4 w-4" />, { name: 'admin' }, view.name === 'admin')
              }
              <div className="w-px h-6 bg-border mx-1.5" />
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="border-evergreen/20 text-evergreen hover:bg-evergreen hover:text-cream"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'login' })} className="text-foreground/70">
                Log in
              </Button>
              <Button
                size="sm"
                onClick={() => navigate({ name: 'signup' })}
                className="bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive"
              >
                Get started
                <Sparkles className="h-3.5 w-3.5 ml-1" />
              </Button>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-muted"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-1.5">
            {user ? (
              <>
                {navItem('Dashboard', <LayoutDashboard className="h-4 w-4" />, { name: 'dashboard' }, view.name === 'dashboard')}
                {navItem('Monetization', <Wallet className="h-4 w-4" />, { name: 'monetization' }, view.name === 'monetization')}
                {(user.role === 'ADMIN' || user.role === 'MODERATOR') &&
                  navItem('Admin', <Shield className="h-4 w-4" />, { name: 'admin' }, view.name === 'admin')
                }
                <Button variant="outline" size="sm" onClick={() => { onLogout(); setMobileOpen(false) }} className="justify-start">
                  <LogOut className="h-4 w-4 mr-2" /> Log out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => { navigate({ name: 'login' }); setMobileOpen(false) }}>Log in</Button>
                <Button size="sm" onClick={() => { navigate({ name: 'signup' }); setMobileOpen(false) }} className="bg-evergreen text-cream">
                  Get started
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
