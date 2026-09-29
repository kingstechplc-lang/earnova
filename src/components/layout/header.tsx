'use client'
import { Button } from '@/components/ui/button'
import { Sparkles, LayoutDashboard, Wallet, Shield, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <button
      onClick={() => { navigate(target); setMobileOpen(false) }}
      className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all
        ${current ? 'text-evergreen' : 'text-foreground/70 hover:text-foreground hover:bg-muted/60'}
      `}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {current && (
        <motion.span
          layoutId="nav-underline"
          className="absolute -bottom-0.5 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-evergreen via-gold to-berry"
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        />
      )}
    </button>
  )

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
      {/* Animated gold accent line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <motion.button
          onClick={() => navigate({ name: 'landing' })}
          className="flex items-center gap-2.5 font-semibold"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-evergreen to-evergreen-dark text-cream shadow-festive overflow-hidden">
            <Sparkles className="h-4 w-4 relative z-10" />
            <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-gold/30 to-transparent animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-background animate-pulse-glow" />
          </span>
          <span className="flex flex-col leading-tight text-left">
            <span className="text-sm font-bold tracking-tight text-foreground">PageNova</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-evergreen animate-pulse" />
              Christmas 2026 · Live
            </span>
          </span>
        </motion.button>

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
                className="border-evergreen/20 text-evergreen hover:bg-evergreen hover:text-cream group"
              >
                <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'login' })} className="text-foreground/70 hover:text-foreground">
                Log in
              </Button>
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Button
                  size="sm"
                  onClick={() => navigate({ name: 'signup' })}
                  className="bg-evergreen text-cream hover:bg-evergreen-dark shadow-festive btn-glow relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    Get started
                    <Sparkles className="h-3.5 w-3.5 ml-1 anim-sparkle-pulse" />
                  </span>
                </Button>
              </motion.div>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          <AnimatePresence mode="wait">
            {mobileOpen ? (
              <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X className="h-5 w-5" />
              </motion.div>
            ) : (
              <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                <Menu className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden border-t border-border bg-background/95 backdrop-blur-xl"
          >
            <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
              {user ? (
                <>
                  <MobileNavItem icon={<LayoutDashboard className="h-4 w-4" />} label="Dashboard" onClick={() => { navigate({ name: 'dashboard' }); setMobileOpen(false) }} active={view.name === 'dashboard'} />
                  <MobileNavItem icon={<Wallet className="h-4 w-4" />} label="Monetization" onClick={() => { navigate({ name: 'monetization' }); setMobileOpen(false) }} active={view.name === 'monetization'} />
                  {(user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                    <MobileNavItem icon={<Shield className="h-4 w-4" />} label="Admin" onClick={() => { navigate({ name: 'admin' }); setMobileOpen(false) }} active={view.name === 'admin'} />
                  )}
                  <Button variant="outline" size="sm" onClick={() => { onLogout(); setMobileOpen(false) }} className="justify-start mt-1">
                    <LogOut className="h-4 w-4 mr-2" /> Log out
                  </Button>
                </>
              ) : (
                <>
                  <MobileNavItem label="Log in" onClick={() => { navigate({ name: 'login' }); setMobileOpen(false) }} />
                  <Button size="sm" onClick={() => { navigate({ name: 'signup' }); setMobileOpen(false) }} className="bg-evergreen text-cream mt-1">
                    Get started
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

function MobileNavItem({ icon, label, onClick, active }: {
  icon?: React.ReactNode; label: string; onClick: () => void; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
        active ? 'bg-evergreen/10 text-evergreen' : 'text-foreground hover:bg-muted'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
