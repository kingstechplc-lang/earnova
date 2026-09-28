'use client'
import { Badge } from '@/components/ui/badge'
import { Lock } from 'lucide-react'

// AdSlot — renders a placeholder for an ad placement on a Special Page.
//
// In production, this component would:
//   1. Check the visitor's consent state (Consent Layer from Chapter 3 of the spec)
//   2. Emit the appropriate ad-network tag based on the placement source and ad-network code
//   3. Forward the IAB TCF v2.2 consent string to the ad-network request
//
// In this MVP demo, we render a visible placeholder so the architecture is clear:
//   - Platform placements (Layer 2) render the platform's own Adsterra/Monetag inventory
//   - User placements render the page owner's approved Adsterra/Monetag integration
//   - The placement engine has already filtered which placements may render (Chapter 2)

type Placement = {
  id: string
  slot: string
  source: string  // 'USER_INTEGRATION' | 'PLATFORM_NETWORK' | 'PLATFORM_DIRECT'
  adNetworkCode: string  // 'adsterra' | 'monetag' | 'platform'
  integrationType: string | null
  scriptReference: string | null  // sanitized key, never raw JS
  priority: number
}

export function AdSlot({ placement }: { placement: Placement }) {
  const isPlatform = placement.source !== 'USER_INTEGRATION'
  const label = isPlatform
    ? `Platform ad · ${placement.adNetworkCode === 'platform' ? 'Platform' : placement.adNetworkCode}`
    : `Creator ad · ${placement.adNetworkCode}`

  return (
    <div
      data-ad-slot={placement.id}
      data-ad-source={placement.source}
      data-ad-network={placement.adNetworkCode}
      data-ad-integration-type={placement.integrationType || ''}
      data-ad-script-ref={placement.scriptReference || ''}
      className="relative w-full min-h-[90px] md:min-h-[120px] rounded-lg border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-1 p-4"
    >
      <Badge variant={isPlatform ? 'secondary' : 'outline'} className="text-[10px] uppercase tracking-wide">
        {label}
      </Badge>
      <p className="text-xs text-muted-foreground mt-1">
        Slot: {placement.slot} · Priority {placement.priority}
      </p>
      <p className="text-[10px] text-muted-foreground/70 mt-1 flex items-center gap-1">
        <Lock className="h-2 w-2" />
        {placement.scriptReference ? `Ref: ${placement.scriptReference}` : 'No active inventory'}
      </p>

      {/* The actual ad-network tag would be emitted here in production.
          For MVP demo, we render a visible placeholder so reviewers can see
          exactly where each placement lives and which engine owns it. */}
      <div className="absolute top-1 right-2 text-[9px] text-muted-foreground/40">
        {placement.source === 'USER_INTEGRATION' ? 'USER' : 'PLATFORM'} ENGINE
      </div>
    </div>
  )
}
