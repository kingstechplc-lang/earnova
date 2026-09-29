import { Sparkles } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-gradient-to-b from-background to-muted/40">
      {/* Gold accent line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="max-w-md">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-evergreen to-evergreen-dark text-cream">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="font-bold">PageNova</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              PageNova — a global creator platform. Christmas 2026 is our
              flagship launch campaign — but the platform supports creators worldwide, every day of the year.
            </p>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-foreground mb-3">Compliance</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The platform does not pay users. Earnings come from external ad networks.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Users are responsible for their ad-network relationships and traffic quality.
            </p>
          </div>

          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-foreground mb-3">Campaigns</h3>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-evergreen" />
                Christmas 2026 — Active
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                New Year 2027 — Upcoming
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col sm:flex-row justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2026 PageNova · Christmas 2026 campaign active</p>
          <p className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-evergreen animate-pulse" />
            All systems operational
          </p>
        </div>
      </div>
    </footer>
  )
}
