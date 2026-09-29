import { Sparkles } from 'lucide-react'

/*
 * Footer visual treatment
 * -----------------------
 * Sits on the deepest brand surface (--forest-ink) with a tri-color accent
 * line on top (evergreen → gold → berry) and a faint pine-needle scatter.
 * The brand mark has a soft radial gold glow behind it, and the active
 * "Christmas 2026" status dot gets a glowing evergreen halo. All body text
 * uses cream tints for AAA-readable contrast on the dark surface.
 */
export default function Footer() {
  return (
    <footer className="mt-auto footer-bg text-cream">
      {/* Tri-color top accent line */}
      <div className="footer-accent-line" />

      {/* Subtle gold glow positioned behind the brand mark in the left column */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-[12%] h-40 w-40 -translate-y-1/3 rounded-full bg-gold/15 blur-3xl"
      />

      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="max-w-md">
            <div className="gold-glow inline-flex">
              <div className="flex items-center gap-2.5 mb-3 relative z-10">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-evergreen-light to-evergreen text-cream ring-1 ring-gold/40">
                  <Sparkles className="h-3.5 w-3.5 text-gold-light" />
                </span>
                <span className="font-bold text-gold-light">Earnova</span>
              </div>
            </div>
            <p className="text-sm text-cream/70 leading-relaxed">
              Earnova — a global creator platform. Christmas 2026 is our
              flagship launch campaign — but the platform supports creators worldwide, every day of the year.
            </p>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-gold-light mb-3">Compliance</h3>
            <p className="text-sm text-cream/70 leading-relaxed">
              The platform does not pay users. Earnings come from external ad networks.
            </p>
            <p className="text-sm text-cream/70 leading-relaxed mt-2">
              Users are responsible for their ad-network relationships and traffic quality.
            </p>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-gold-light mb-3">Campaigns</h3>
            <ul className="text-sm text-cream/70 space-y-1.5">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-evergreen-light dot-glow-evergreen" />
                Christmas 2026 — Active
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cream/30" />
                New Year 2027 — Upcoming
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-cream/10 flex flex-col sm:flex-row justify-between gap-3 text-xs text-cream/60">
          <p>© 2026 Earnova · Christmas 2026 campaign active</p>
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-evergreen-light dot-glow-evergreen animate-pulse" />
            All systems operational
          </p>
        </div>
      </div>
    </footer>
  )
}
