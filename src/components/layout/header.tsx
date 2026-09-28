'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { View, CurrentUser } from '@/app/page'

export default function Header({
  user, view, navigate, onLogout,
}: {
  user: CurrentUser | null
  view: View
  navigate: (v: View) => void
  onLogout: () => void
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <button
          onClick={() => navigate({ name: 'landing' })}
          className="flex items-center gap-2 font-semibold text-lg"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background text-sm font-bold">G</span>
          <span className="hidden sm:inline">Global Creator Pages</span>
        </button>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                variant={view.name === 'dashboard' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate({ name: 'dashboard' })}
              >
                Dashboard
              </Button>
              <Button
                variant={view.name === 'monetization' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => navigate({ name: 'monetization' })}
              >
                Monetization
              </Button>
              {(user.role === 'ADMIN' || user.role === 'MODERATOR') && (
                <Button
                  variant={view.name === 'admin' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => navigate({ name: 'admin' })}
                >
                  Admin
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={onLogout}>Log out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ name: 'login' })}>Log in</Button>
              <Button size="sm" onClick={() => navigate({ name: 'signup' })}>Sign up</Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
