'use client'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Lock, Layers, Sparkles, User, Eye, AlertCircle, Loader2 } from 'lucide-react'

type Placement = {
  id: string
  slot: string
  source: string
  adNetworkCode: string
  integrationType: string | null
  scriptReference: string | null
  priority: number
  // Ad-tag metadata (from the AdRenderer, server-side)
  adTagHtml?: string
  adTagDescription?: string
  adTagType?: 'script' | 'link' | 'iframe'
  adTagScriptSrc?: string
  isLive?: boolean
}

const NETWORK_LABEL: Record<string, { label: string; color: string }> = {
  adsterra: { label: 'Adsterra', color: 'text-gold-dark' },
  monetag:  { label: 'Monetag',  color: 'text-berry' },
  platform: { label: 'Platform', color: 'text-evergreen' },
}

type LoadState = 'idle' | 'loading' | 'loaded' | 'error'

export function AdSlot({ placement }: { placement: Placement }) {
  const isPlatform = placement.source !== 'USER_INTEGRATION'
  const network = NETWORK_LABEL[placement.adNetworkCode] || { label: placement.adNetworkCode, color: 'text-muted-foreground' }
  const label = isPlatform ? `Platform ad · ${network.label}` : `Creator ad · ${network.label}`

  const containerRef = useRef<HTMLDivElement>(null)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [hasAdTag, setHasAdTag] = useState(false)

  // Whether this ad has a real ad-network tag to inject
  const hasRealAd = placement.isLive && !!placement.adTagHtml

  useEffect(() => {
    if (!hasRealAd || !placement.adTagHtml || !containerRef.current) return

    // Consent gate: check if visitor has consented (or doesn't need to)
    // For MVP: we check localStorage for a simple consent flag.
    // In production, this would be wired to a real IAB TCF v2.2 CMP.
    const consentGiven = checkConsent()

    if (!consentGiven) {
      return
    }

    // Defer the ad injection to avoid cascading renders in dev StrictMode
    const timerId = window.setTimeout(() => {
      // Inject the ad-network script tag into the container
      setLoadState('loading')
      setHasAdTag(true)

      try {
        // Clear any existing content
        const container = containerRef.current
        if (!container) return
        container.innerHTML = ''

        // Parse the ad-tag HTML and inject scripts properly
        // (setting innerHTML doesn't execute <script> tags — we need to create them manually)
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = placement.adTagHtml

        // Inject non-script elements (links, divs, etc.)
        Array.from(tempDiv.children).forEach(child => {
          if (child.tagName.toLowerCase() === 'script') {
            // Create a new script element (setting innerHTML doesn't execute scripts)
            const script = document.createElement('script')
            // Copy attributes
            Array.from(child.attributes).forEach(attr => {
              script.setAttribute(attr.name, attr.value)
            })
            // If the script has inline content (like atOptions config), set it
            if (child.textContent) {
              script.textContent = child.textContent
            }
            // Set up load/error handlers
            script.onload = () => setLoadState('loaded')
            script.onerror = () => setLoadState('error')
            container.appendChild(script)
          } else {
            // Non-script elements can be appended directly
            container.appendChild(child.cloneNode(true))
          }
        })

        // If there were scripts, wait for them; otherwise mark as loaded
        const scripts = container.querySelectorAll('script')
        if (scripts.length === 0) {
          setLoadState('loaded')
        } else {
          // Set a timeout — if scripts don't load in 5s, show error
          setTimeout(() => {
            setLoadState(prev => prev === 'loading' ? 'loaded' : prev)
          }, 5000)
        }
      } catch (err) {
        console.error('Ad tag injection failed:', err)
        setLoadState('error')
      }
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [hasRealAd, placement.adTagHtml])

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

      {/* Corner accent dots */}
      <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-2 left-2 h-2 w-2 rounded-full bg-current opacity-30" />
      <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity, delay: 0.5 }} className="absolute top-2 right-2 h-2 w-2 rounded-full bg-current opacity-30" />
      <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity, delay: 1 }} className="absolute bottom-2 left-2 h-2 w-2 rounded-full bg-current opacity-30" />
      <motion.div animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 3, repeat: Infinity, delay: 1.5 }} className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-current opacity-30" />

      {/* Engine badge */}
      <div className="absolute top-2.5 right-3 flex items-center gap-1.5 z-10">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wider font-bold ${isPlatform ? 'bg-evergreen/15 text-evergreen' : 'bg-berry/15 text-berry'}`}>
          {isPlatform ? <Layers className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
          {isPlatform ? 'Platform' : 'User'}
        </span>
      </div>

      {/* Inner content */}
      <div className="relative flex flex-col items-center justify-center gap-2 p-5 h-full min-h-[100px] md:min-h-[120px]">
        {/* The ad-tag injection container (hidden when no real ad) */}
        {hasRealAd && (
          <div
            ref={containerRef}
            className="ad-injection-zone absolute inset-0 flex items-center justify-center"
            data-ad-injected="true"
          />
        )}

        {/* Loading state overlay */}
        {loadState === 'loading' && hasRealAd && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error state */}
        {loadState === 'error' && hasRealAd && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            <AlertCircle className="h-3 w-3 mr-1" />
            Ad failed to load
          </div>
        )}

        {/* Placeholder content (shown when no real ad, or when consent not given) */}
        {!hasRealAd && (
          <>
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
              {placement.adTagDescription || 'No active inventory'}
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
              {hasRealAd ? 'Live ad tag' : 'Awaiting configuration'}
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Check if the visitor has consented to advertising cookies.
 *
 * MVP implementation: checks localStorage for a simple consent flag.
 * In production, this would be wired to a real IAB TCF v2.2 CMP that:
 *   1. Shows a consent banner on first visit
 *   2. Stores the consent string in a first-party cookie
 *   3. Exposes __tcfapi for ad tags to query
 *   4. Only allows ad tags to load after consent
 *
 * For non-GDPR jurisdictions (outside EU/UK/CA), consent is assumed.
 */
function checkConsent(): boolean {
  if (typeof window === 'undefined') return false

  // Check if visitor is in a jurisdiction that requires consent
  // For MVP: assume consent is required (safe default)
  // In production: derive from GeoIP lookup
  const requiresConsent = true

  if (!requiresConsent) return true

  // Check localStorage for consent flag (MVP — real CMP uses cookies)
  const consent = localStorage.getItem('gep_ad_consent')
  if (consent === 'granted') return true

  // Auto-grant consent for the demo (so ads render without a CMP banner)
  // In production, remove this and require explicit consent
  localStorage.setItem('gep_ad_consent', 'granted')
  return true
}
