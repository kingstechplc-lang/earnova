'use client'
import { Lock, Layers, Sparkles, User } from 'lucide-react'

type Placement = {
  id: string
  slot: string
  source: string  // 'USER_INTEGRATION' | 'PLATFORM_NETWORK' | 'PLATFORM_DIRECT'
  adNetworkCode: string  // 'adsterra' | 'monetag' | 'platform'
  integrationType: string | null
  scriptReference: string | null  // sanitized key, never raw JS
  priority: number
}

const NETWORK_LABEL: Record<string, { label: string; color: string }> = {
  adsterra: { label: 'Adsterra', color: 'text-gold-dark' },
  monetag:  { label: 'Monetag',  color: 'text-berry' },
  platform: { label: 'Platform', color: 'text-evergreen' },
}

export function AdSlot({ placement }: { placement: Placement }) {
  const isPlatform = placement.source !== 'USER_INTEGRATION'
  const network = NETWORK_LABEL[placement.adNetworkCode] || { label: placement.adNetworkCode, color: 'text-muted-foreground' }
  const label = isPlatform ? `Platform ad · ${network.label}` : `Creator ad · ${network.label}`

  return (
    <div
      data-ad-slot={placement.id}
      data-ad-source={placement.source}
      data-ad-network={placement.adNetworkCode}
      data-ad-integration-type={placement.integrationType || ''}
      data-ad-script-ref={placement.scriptReference || ''}
      className={`relative w-full min-h-[100px] md:min-h-[120px] rounded-2xl flex flex-col items-center justify-center gap-2 p-5 overflow-hidden ${
        isPlatform ? 'ad-slot-platform' : 'ad-slot-user'
      }`}
    >
      {/* Decorative corner accents */}
      <div className="absolute top-2 left-2 h-2 w-2 rounded-full bg-current opacity-20" />
      <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-current opacity-20" />
      <div className="absolute bottom-2 left-2 h-2 w-2 rounded-full bg-current opacity-20" />
      <div className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-current opacity-20" />

      {/* Engine badge */}
      <div className="absolute top-2.5 right-3 flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold ${
          isPlatform
            ? 'bg-evergreen/15 text-evergreen'
            : 'bg-berry/15 text-berry'
        }`}>
          {isPlatform ? <Layers className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
          {isPlatform ? 'Platform engine' : 'User engine'}
        </span>
      </div>

      {/* Main label */}
      <div className="flex items-center gap-2">
        <Sparkles className={`h-4 w-4 ${isPlatform ? 'text-gold-dark' : 'text-berry'}`} />
        <span className={`text-xs uppercase tracking-wider font-bold ${network.color}`}>
          {label}
        </span>
      </div>

      {/* Slot metadata */}
      <p className="text-xs text-muted-foreground">
        Slot: <span className="font-mono font-medium">{placement.slot}</span> · Priority {placement.priority}
      </p>

      {/* Sanitized ref */}
      <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-1">
        <Lock className="h-2.5 w-2.5" />
        {placement.scriptReference ? (
          <span className="font-mono">Ref: {placement.scriptReference}</span>
        ) : (
          <span>No active inventory</span>
        )}
      </p>

      {placement.integrationType && (
        <p className="text-[10px] text-muted-foreground/60 font-mono">
          {placement.integrationType}
        </p>
      )}
    </div>
  )
}
