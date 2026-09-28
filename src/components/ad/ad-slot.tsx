'use client'
import { motion } from 'framer-motion'
import { Lock, Layers, Sparkles, User, Eye } from 'lucide-react'

type Placement = {
  id: string
  slot: string
  source: string
  adNetworkCode: string
  integrationType: string | null
  scriptReference: string | null
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
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.005 }}
      data-ad-slot={placement.id}
      data-ad-source={placement.source}
      data-ad-network={placement.adNetworkCode}
      data-ad-integration-type={placement.integrationType || ''}
      data-ad-script-ref={placement.scriptReference || ''}
      className={`group relative w-full min-h-[100px] md:min-h-[120px] rounded-2xl overflow-hidden ${isPlatform ? 'ad-slot-platform' : 'ad-slot-user'}`}
    >
      {/* Animated scan-line on hover */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div
          className={`absolute inset-x-0 h-16 ${isPlatform ? 'bg-gradient-to-b from-gold/10 to-transparent' : 'bg-gradient-to-b from-berry/10 to-transparent'}`}
          style={{ animation: 'scan-line 2s linear infinite' }}
        />
      </div>

      {/* Corner accents */}
      <motion.div
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute top-2 left-2 h-2 w-2 rounded-full bg-current opacity-30"
      />
      <motion.div
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
        className="absolute top-2 right-2 h-2 w-2 rounded-full bg-current opacity-30"
      />
      <motion.div
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, delay: 1 }}
        className="absolute bottom-2 left-2 h-2 w-2 rounded-full bg-current opacity-30"
      />
      <motion.div
        animate={{ opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
        className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-current opacity-30"
      />

      {/* Engine badge in corner */}
      <div className="absolute top-2.5 right-3 flex items-center gap-1.5">
        <motion.span
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold ${
            isPlatform
              ? 'bg-evergreen/15 text-evergreen'
              : 'bg-berry/15 text-berry'
          }`}
        >
          {isPlatform ? <Layers className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
          {isPlatform ? 'Platform' : 'User'}
        </motion.span>
      </div>

      {/* Inner content */}
      <div className="relative flex flex-col items-center justify-center gap-2 p-5 h-full min-h-[100px] md:min-h-[120px]">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="flex items-center gap-2"
        >
          <Sparkles className={`h-4 w-4 ${isPlatform ? 'text-gold-dark' : 'text-berry'} anim-sparkle-pulse`} />
          <span className={`text-xs uppercase tracking-wider font-bold ${network.color}`}>
            {label}
          </span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-muted-foreground"
        >
          Slot: <span className="font-mono font-medium">{placement.slot}</span> · Priority {placement.priority}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-1"
        >
          <Lock className="h-2.5 w-2.5" />
          {placement.scriptReference ? (
            <span className="font-mono">Ref: {placement.scriptReference}</span>
          ) : (
            <span>No active inventory</span>
          )}
        </motion.p>

        {placement.integrationType && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[10px] text-muted-foreground/60 font-mono"
          >
            {placement.integrationType}
          </motion.span>
        )}

        {/* Hover hint */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[9px] text-muted-foreground/40"
        >
          <Eye className="h-2 w-2" />
          Sanitized placement
        </motion.div>
      </div>
    </motion.div>
  )
}
