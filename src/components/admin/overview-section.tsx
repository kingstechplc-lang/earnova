'use client'
import { Card, CardContent } from '@/components/ui/card'
import { CountUp } from '@/components/animated/count-up'
import { motion } from 'framer-motion'
import { StaggerContainer, StaggerItem } from '@/components/animated/motion'
import { Users, FileText, Megaphone, Plug, ShieldCheck, AlertCircle, Activity, Network } from 'lucide-react'

type Stats = {
  users: { total: number; admins: number }
  pages: { total: number; published: number; pending: number; banned: number }
  campaigns: { total: number; active: number }
  integrations: { total: number; pending: number; approved: number; revoked: number }
  networks: { total: number; active: number }
  trustScoresComputed: number
}

type RecentEvent = {
  id: string
  pageId: string | null
  pageSlug: string | null
  pageTitle: string | null
  integrationId: string | null
  fromState: string | null
  toState: string
  reason: string
  triggeredBy: string
  moderatorName: string | null
  createdAt: string
}

export function AdminOverview({ stats, events }: { stats: Stats; events: RecentEvent[] }) {
  const cards = [
    { label: 'Total users', value: stats.users.total, icon: Users, color: 'evergreen' as const, sublabel: `${stats.users.admins} admins` },
    { label: 'Total pages', value: stats.pages.total, icon: FileText, color: 'gold' as const, sublabel: `${stats.pages.published} published` },
    { label: 'Active campaigns', value: stats.campaigns.active, icon: Megaphone, color: 'berry' as const, sublabel: `${stats.campaigns.total} total` },
    { label: 'Pending integrations', value: stats.integrations.pending, icon: Plug, color: 'cranberry' as const, sublabel: `${stats.integrations.approved} approved` },
    { label: 'Pending pages', value: stats.pages.pending, icon: AlertCircle, color: 'gold' as const, sublabel: `${stats.pages.banned} banned` },
    { label: 'Active networks', value: stats.networks.active, icon: Network, color: 'evergreen' as const, sublabel: `${stats.networks.total} total` },
    { label: 'Trust scores', value: stats.trustScoresComputed, icon: Activity, color: 'berry' as const, sublabel: 'computed' },
    { label: 'Revoked', value: stats.integrations.revoked, icon: ShieldCheck, color: 'cranberry' as const, sublabel: 'integrations' },
  ]

  const colorMap = {
    evergreen: { bg: 'bg-evergreen/10', text: 'text-evergreen', bar: 'bg-gradient-to-r from-evergreen to-evergreen-light', border: 'border-evergreen/30' },
    gold: { bg: 'bg-gold/15', text: 'text-gold-dark', bar: 'bg-gradient-to-r from-gold-light via-gold to-gold-dark', border: 'border-gold/30' },
    berry: { bg: 'bg-berry/10', text: 'text-berry', bar: 'bg-gradient-to-r from-berry to-berry/70', border: 'border-berry/30' },
    cranberry: { bg: 'bg-cranberry/10', text: 'text-cranberry', bar: 'bg-gradient-to-r from-cranberry to-berry', border: 'border-cranberry/30' },
  }

  return (
    <div className="space-y-6">
      <StaggerContainer className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {cards.map((c) => {
          const cm = colorMap[c.color]
          return (
            <StaggerItem key={c.label}>
              <Card className={`relative overflow-hidden transition-all hover:shadow-elevated hover:-translate-y-0.5 ${cm.border}`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${c.color === 'evergreen' ? 'from-evergreen/8' : c.color === 'gold' ? 'from-gold/12' : c.color === 'berry' ? 'from-berry/10' : 'from-cranberry/10'} to-transparent`} />
                <div className={`absolute -top-6 -right-6 h-16 w-16 rounded-full ${cm.bg} blur-2xl animate-pulse`} />
                <div className={`h-1.5 w-full ${cm.bar}`} />
                <CardContent className="relative py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${cm.bg} ${cm.text}`}>
                      <c.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{c.sublabel}</span>
                  </div>
                  <p className={`text-3xl font-bold font-serif ${cm.text}`}>
                    <CountUp value={c.value} duration={1200} />
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{c.label}</p>
                </CardContent>
              </Card>
            </StaggerItem>
          )
        })}
      </StaggerContainer>

      {/* Recent moderation events */}
      <Card className="overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-evergreen via-gold to-berry" />
        <CardContent className="py-4">
          <h3 className="font-serif text-lg font-bold mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-evergreen" />
            Recent moderation activity
          </h3>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No moderation events yet.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {events.map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors"
                >
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-mono">
                      <span className="text-muted-foreground">{e.fromState || '∅'}</span>
                      <span className="text-foreground mx-1">→</span>
                      <span className={`font-bold ${stateColor(e.toState)}`}>{e.toState}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {e.pageTitle || e.integrationId ? (
                        <>on <strong className="text-foreground">{e.pageTitle || e.integrationId}</strong></>
                      ) : null}
                      {' · '}
                      {e.triggeredBy === 'automated' ? (
                        <span className="text-evergreen font-medium">automated</span>
                      ) : (
                        <span>by <strong className="text-foreground">{e.moderatorName || e.triggeredBy}</strong></span>
                      )}
                    </span>
                    {e.reason && (
                      <span className="text-muted-foreground italic">"{e.reason}"</span>
                    )}
                    <span className="text-[10px] text-muted-foreground/60 font-mono">
                      {new Date(e.createdAt).toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function stateColor(state: string): string {
  const map: Record<string, string> = {
    APPROVED: 'text-evergreen',
    PENDING: 'text-gold-dark',
    PENDING_REVIEW: 'text-gold-dark',
    RESTRICTED: 'text-amber-600',
    SUSPENDED: 'text-cranberry',
    BANNED: 'text-cranberry',
    REVOKED: 'text-cranberry',
    DISABLED: 'text-amber-600',
    DRAFT: 'text-muted-foreground',
  }
  return map[state] || 'text-foreground'
}
