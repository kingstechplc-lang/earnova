'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Sparkles, LayoutDashboard, Wallet, Shield, LogOut, Menu, X,
  ChevronLeft, ChevronRight, Eye, Globe2, Sparkles as SparklesIcon, FileText,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import type { View, CurrentUser } from '@/app/page'

/*
 * Sidebar visual treatment
 * ------------------------
 * The sidebar now lives on a deep evergreen "forest panel" (see .sidebar-bg
 * in globals.css) with a faint pine-needle SVG texture. Because the surface
 * is dark, all nav text uses cream tints and the active item is a translucent
 * glass pill with a gold left-border accent. The mobile drawer shares the
 * same treatment so the brand reads consistently across breakpoints.
 */

export default function Sidebar({
  user, view, navigate, onLogout, collapsed, setCollapsed,
}: {
  user: CurrentUser
  view: View
  navigate: (v: View) => void
  onLogout: () => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}) {
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, target: { name: 'dashboard' } as View, active: view.name === 'dashboard' || view.name === 'builder' || view.name === 'analytics' },
    { label: 'Posts', icon: FileText, target: { name: 'posts' } as View, active: view.name === 'posts' || view.name === 'post-editor' },
    { label: 'Profile', icon: SparklesIcon, target: { name: 'profile-setup' } as View, active: view.name === 'profile-setup' },
    { label: 'Monetization', icon: Wallet, target: { name: 'monetization' } as View, active: view.name === 'monetization' },
  ]
  if (user.role === 'ADMIN' || user.role === 'MODERATOR') {
    navItems.push({ label: 'Admin', icon: Shield, target: { name: 'admin' } as View, active: view.name === 'admin' })
  }

  const isActive = (item: typeof navItems[0]) => item.active

  return (
    <>
      {/* Desktop/Tablet sidebar (persistent, collapsible) */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 flex-col border-r border-evergreen-dark/60 sidebar-bg"
      >
        {/* Subtle ambient gold orb at the top — adds depth without distraction */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-gold/10 blur-3xl"
        />

        {/* Logo — elevated glass panel with a gold accent line below */}
        <div className="relative h-16 flex items-center gap-2.5 px-4 border-b border-cream/10 flex-shrink-0">
          <button
            onClick={() => navigate({ name: 'landing' })}
            className="flex items-center gap-2.5 font-semibold flex-1 min-w-0 relative z-10"
          >
            <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-evergreen-light to-evergreen text-cream shadow-festive flex-shrink-0 ring-1 ring-gold/40">
              <Sparkles className="h-4 w-4 relative z-10 text-gold-light" />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-evergreen-dark animate-pulse" />
            </span>
            {!collapsed && (
              <span className="flex flex-col leading-tight text-left overflow-hidden">
                <span className="text-sm font-bold tracking-tight text-cream">Earnova</span>
                <span className="text-[10px] text-gold-light/70 uppercase tracking-[0.15em]">Create · Share · Shine</span>
              </span>
            )}
          </button>
          {/* Gold accent line at the bottom of the logo panel */}
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
          />
        </div>

        {/* Nav items */}
        <nav className="relative z-10 flex-1 py-4 px-3 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.target)}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all w-full ${
                  isActive(item)
                    ? 'nav-pill-active text-cream'
                    : 'text-cream/70 hover:text-cream hover:bg-cream/5'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                {isActive(item) && !collapsed && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-gradient-to-b from-gold-light to-gold shadow-[0_0_8px_rgba(212,164,55,0.55)]"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                {isActive(item) && collapsed && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-gradient-to-b from-gold-light to-gold shadow-[0_0_8px_rgba(212,164,55,0.55)]" />
                )}
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive(item) ? 'text-gold' : 'text-cream/60'}`} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="relative z-10 p-3 border-t border-cream/10 flex-shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-cream/60 hover:text-cream hover:bg-cream/5 transition-all w-full ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed && <span>Collapse menu</span>}
          </button>
        </div>

        {/* User info + logout */}
        <div className="relative z-10 p-3 border-t border-cream/10 flex-shrink-0">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 px-1">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg font-bold text-sm flex-shrink-0 ${
                  user.role === 'ADMIN' ? 'bg-berry/20 text-gold-light ring-1 ring-berry/40' :
                  user.role === 'MODERATOR' ? 'bg-gold/15 text-gold-light ring-1 ring-gold/40' :
                  'bg-cream/10 text-cream ring-1 ring-cream/20'
                }`}>
                  {(user.name || user.email)[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate text-cream">{user.name || user.email.split('@')[0]}</p>
                  <p className="text-[10px] text-cream/50 truncate">{user.email}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                className="w-full border-gold/30 bg-cream/5 text-gold-light hover:bg-gold hover:text-evergreen-dark hover:border-gold group"
              >
                <LogOut className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                <span>Log out</span>
              </Button>
            </div>
          ) : (
            <button
              onClick={onLogout}
              className="flex items-center justify-center w-full p-2 rounded-lg text-cream/60 hover:text-cranberry hover:bg-cranberry/10 transition-all"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.aside>

      {/* Mobile drawer (slide-out) */}
      <MobileDrawer user={user} view={view} navigate={navigate} onLogout={onLogout} />

      {/* Spacer to push main content right on desktop */}
      <div
        className="hidden md:block flex-shrink-0 transition-all"
        style={{ width: collapsed ? 72 : 256 }}
      />
    </>
  )
}

function MobileDrawer({
  user, view, navigate, onLogout,
}: {
  user: CurrentUser
  view: View
  navigate: (v: View) => void
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)

  // Close drawer when view changes
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => setOpen(false), 0)
      return () => window.clearTimeout(id)
    }
  }, [view, open])

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, target: { name: 'dashboard' } as View, active: view.name === 'dashboard' || view.name === 'builder' || view.name === 'analytics' },
    { label: 'Posts', icon: FileText, target: { name: 'posts' } as View, active: view.name === 'posts' || view.name === 'post-editor' },
    { label: 'Profile', icon: SparklesIcon, target: { name: 'profile-setup' } as View, active: view.name === 'profile-setup' },
    { label: 'Monetization', icon: Wallet, target: { name: 'monetization' } as View, active: view.name === 'monetization' },
  ]
  if (user.role === 'ADMIN' || user.role === 'MODERATOR') {
    navItems.push({ label: 'Admin', icon: Shield, target: { name: 'admin' } as View, active: view.name === 'admin' })
  }

  return (
    <>
      {/* Mobile top bar with menu trigger */}
      <div className="md:hidden sticky top-0 z-40 w-full border-b border-cream/10 sidebar-bg">
        <div className="header-accent-line" />
        <div className="flex h-14 items-center justify-between px-4 relative z-10">
          <button onClick={() => navigate({ name: 'landing' })} className="flex items-center gap-2">
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-evergreen-light to-evergreen text-cream shadow-festive ring-1 ring-gold/40">
              <Sparkles className="h-4 w-4 text-gold-light" />
            </span>
            <span className="text-sm font-bold tracking-tight text-cream">Earnova</span>
          </button>
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg text-cream/70 hover:text-cream hover:bg-cream/10 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-72 max-w-[85vw] flex flex-col sidebar-bg border-r border-evergreen-dark/60 shadow-elevated"
            >
              {/* Ambient gold glow at top */}
              <div aria-hidden className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />

              {/* Mobile drawer header */}
              <div className="relative h-16 flex items-center justify-between px-4 border-b border-cream/10 flex-shrink-0 z-10">
                <div className="flex items-center gap-2.5">
                  <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-evergreen-light to-evergreen text-cream shadow-festive ring-1 ring-gold/40">
                    <Sparkles className="h-4 w-4 text-gold-light" />
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-gold ring-2 ring-evergreen-dark animate-pulse" />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm font-bold tracking-tight text-cream">Earnova</span>
                    <span className="text-[9px] text-gold-light/70 uppercase tracking-[0.15em]">Create · Share · Shine</span>
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg text-cream/70 hover:text-cream hover:bg-cream/10 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile nav items */}
              <nav className="relative z-10 flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
                {navItems.map(item => {
                  const Icon = item.icon
                  const active = item.active
                  return (
                    <button
                      key={item.label}
                      onClick={() => navigate(item.target)}
                      className={`relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all w-full ${
                        active ? 'nav-pill-active text-cream' : 'text-cream/70 hover:text-cream hover:bg-cream/5'
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-gradient-to-b from-gold-light to-gold shadow-[0_0_8px_rgba(212,164,55,0.55)]" />
                      )}
                      <Icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-gold' : 'text-cream/60'}`} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </nav>

              {/* Mobile user info + logout */}
              <div className="relative z-10 p-3 border-t border-cream/10 flex-shrink-0 space-y-2">
                <div className="flex items-center gap-2.5 px-1">
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl font-bold text-sm flex-shrink-0 ${
                    user.role === 'ADMIN' ? 'bg-berry/20 text-gold-light ring-1 ring-berry/40' :
                    user.role === 'MODERATOR' ? 'bg-gold/15 text-gold-light ring-1 ring-gold/40' :
                    'bg-cream/10 text-cream ring-1 ring-cream/20'
                  }`}>
                    {(user.name || user.email)[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate text-cream">{user.name || user.email.split('@')[0]}</p>
                    <p className="text-[10px] text-cream/50 truncate">{user.email}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogout}
                  className="w-full border-gold/30 bg-cream/5 text-gold-light hover:bg-gold hover:text-evergreen-dark hover:border-gold"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Log out</span>
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
