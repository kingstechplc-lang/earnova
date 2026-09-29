'use client'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Lock, Layers, Sparkles, User, Eye, AlertCircle, Loader2, ShieldOff } from 'lucide-react'

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
  // Format options for responsive sizing
  formatOptions?: {
    width?: number
    height?: number
    format?: string
  } | null
}

const NETWORK_LABEL: Record<string, { label: string; color: string }> = {
  adsterra: { label: 'Adsterra', color: 'text-gold-dark' },
  monetag:  { label: 'Monetag',  color: 'text-berry' },
  platform: { label: 'Platform', color: 'text-evergreen' },
}

type LoadState = 'idle' | 'loading' | 'loaded' | 'error' | 'blocked'

export function AdSlot({ placement, responsive = true }: { placement: Placement; responsive?: boolean }) {
  const isPlatform = placement.source !== 'USER_INTEGRATION'
  const network = NETWORK_LABEL[placement.adNetworkCode] || { label: placement.adNetworkCode, color: 'text-muted-foreground' }
  const label = isPlatform ? `Platform ad · ${network.label}` : `Creator ad · ${network.label}`

  const containerRef = useRef<HTMLDivElement>(null)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [hasAdTag, setHasAdTag] = useState(false)
  const [blockedReason, setBlockedReason] = useState<string>('')

  // Whether this ad has a real ad-network tag to inject
  const hasRealAd = placement.isLive && !!placement.adTagHtml

  // Compute responsive dimensions from formatOptions
  const fmt = placement.formatOptions
  const isBanner = placement.integrationType === 'BANNER'
  const hasDimensions = isBanner && fmt?.width && fmt?.height
  const slotStyle: React.CSSProperties = responsive && hasDimensions
    ? {
        maxWidth: `${fmt!.width}px`,
        minHeight: `${fmt!.height}px`,
        margin: '0 auto',
      }
    : {}
  const injectStyle: React.CSSProperties = responsive && hasDimensions
    ? { width: `${fmt!.width}px`, height: `${fmt!.height}px`, maxWidth: '100%' }
    : {}

  useEffect(() => {
    if (!hasRealAd || !placement.adTagHtml || !containerRef.current) return

    // Consent gate: check if visitor has consented (or doesn't need to)
    // For MVP: we check localStorage for a simple consent flag.
    // In production, this would be wired to a real IAB TCF v2.2 CMP.
    const consentGiven = checkConsent()

    if (!consentGiven) {
      return
    }

    // ---- Ad-blocker pre-check ----------------------------------------------
    // Ad blockers usually block requests to known ad-network CDN hostnames.
    // We do a quick beacon test: try to fetch a 1x1 pixel from the ad-network
    // CDN. If the request fails (network error / blocked), we know an ad
    // blocker is active and we can short-circuit to a friendly fallback
    // instead of letting Chrome show "This content is blocked".
    const scriptSrc = placement.adTagScriptSrc
    let abortCtrl: AbortController | null = null
    let fetchTimeoutHandle: ReturnType<typeof setTimeout> | null = null
    let loadTimeoutHandle: ReturnType<typeof setTimeout> | null = null
    const iframeInspectHandles: ReturnType<typeof setTimeout>[] = []
    let observer: MutationObserver | null = null
    let disposed = false

    const detectBlockAndInject = async () => {
      // 1) Pre-check: is the ad-network CDN reachable?
      let cdnBlocked = false
      if (scriptSrc) {
        try {
          abortCtrl = new AbortController()
          fetchTimeoutHandle = setTimeout(() => abortCtrl!.abort(), 3000)
          // Use mode:'no-cors' so the request goes through even without CORS
          // headers — we only care whether it succeeded or was blocked.
          await fetch(scriptSrc, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: abortCtrl.signal,
            // cache:'no-store' forces a real network roundtrip
            cache: 'no-store',
          })
          // In no-cors mode, an opaque response (type:'opaque') means success.
          // A thrown error means the request was blocked.
        } catch (err) {
          cdnBlocked = true
          console.warn(`[AdSlot] Ad-network CDN unreachable for ${scriptSrc}:`, err)
        } finally {
          if (fetchTimeoutHandle) clearTimeout(fetchTimeoutHandle)
        }
      }

      // 2) Also check for known ad-blocker "bait" element pattern
      //    Ad blockers remove/hide elements with class names like 'ad-slot',
      //    'adsbygoogle', etc. We can detect this by creating a bait element
      //    and seeing if it gets hidden.
      const baitBlocked = await checkAdBlockBait()

      if (disposed) return

      if (cdnBlocked || baitBlocked) {
        setBlockedReason(cdnBlocked
          ? 'The ad network CDN was blocked (likely by an ad blocker or network filter)'
          : 'An ad blocker appears to be filtering ad content'
        )
        setLoadState('blocked')
        return
      }

      // 3) Inject the ad-tag HTML
      setLoadState('loading')
      setHasAdTag(true)

      try {
        const container = containerRef.current
        if (!container) return
        container.innerHTML = ''

        // Parse the ad-tag HTML and inject scripts properly
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = placement.adTagHtml!

        const injectedScripts: HTMLScriptElement[] = []

        Array.from(tempDiv.children).forEach(child => {
          if (child.tagName.toLowerCase() === 'script') {
            const script = document.createElement('script')
            Array.from(child.attributes).forEach(attr => {
              script.setAttribute(attr.name, attr.value)
            })
            if (child.textContent) {
              script.textContent = child.textContent
            }
            script.onload = () => setLoadState(prev => prev === 'loading' ? 'loaded' : prev)
            script.onerror = () => setLoadState('error')
            container.appendChild(script)
            injectedScripts.push(script)
          } else {
            container.appendChild(child.cloneNode(true))
          }
        })

        // 4) Watch the container for Chrome injecting the "This content is
        //    blocked" message inside an iframe. When Chrome blocks an
        //    iframe (CSP / Safe Browsing / extension), it replaces the
        //    iframe's content with a chrome-error page that contains the
        //    text "This content is blocked". We detect this via a
        //    MutationObserver on the container's subtree.
        observer = new MutationObserver(mutations => {
          for (const m of mutations) {
            for (const node of m.addedNodes) {
              if (node.nodeType !== Node.ELEMENT_NODE) continue
              const el = node as Element
              // Check if the added node is an iframe showing Chrome's
              // "blocked content" error page (we can read its textContent
              // since same-origin Chrome error pages are inspectable).
              if (el.tagName === 'IFRAME') {
                // Give the iframe a moment to render its error page,
                // then inspect it.
                const iframe = el as HTMLIFrameElement
                const inspectHandle = setTimeout(() => {
                  if (disposed) return
                  try {
                    // cross-origin iframes throw on access — that's fine,
                    // we only care about same-origin error pages
                    const doc = iframe.contentDocument || iframe.contentWindow?.document
                    const text = doc?.body?.textContent || ''
                    if (text.includes('This content is blocked') ||
                        text.includes('Contact the site owner to fix the issue') ||
                        text.includes('ERR_BLOCKED') ||
                        text.includes('net::ERR_BLOCKED_BY_CLIENT')) {
                      setBlockedReason('The browser blocked the ad iframe (ad blocker, CSP, or Safe Browsing)')
                      setLoadState('blocked')
                    }
                  } catch {
                    // cross-origin — iframe loaded something; we leave the
                    // state as 'loading' and let the timeout catch it
                  }
                }, 500)
                iframeInspectHandles.push(inspectHandle)
              }
            }
          }
        })
        observer.observe(container, { childList: true, subtree: true })

        if (injectedScripts.length === 0) {
          setLoadState('loaded')
        } else {
          // Fallback timeout: if scripts haven't reported load after 6s,
          // mark as blocked (most likely an ad blocker silently dropped
          // the request without firing onerror).
          loadTimeoutHandle = setTimeout(() => {
            if (disposed) return
            setLoadState(prev => {
              if (prev === 'loading') {
                setBlockedReason('Ad request timed out — likely blocked by an ad blocker')
                return 'blocked'
              }
              return prev
            })
          }, 6000)
        }
      } catch (err) {
        console.error('Ad tag injection failed:', err)
        setLoadState('error')
      }
    }

    // Defer to avoid cascading renders in dev StrictMode
    const timerId = window.setTimeout(detectBlockAndInject, 0)

    return () => {
      disposed = true
      window.clearTimeout(timerId)
      if (fetchTimeoutHandle) clearTimeout(fetchTimeoutHandle)
      if (loadTimeoutHandle) clearTimeout(loadTimeoutHandle)
      iframeInspectHandles.forEach(h => clearTimeout(h))
      if (abortCtrl) abortCtrl.abort()
      if (observer) observer.disconnect()
    }
  }, [hasRealAd, placement.adTagHtml, placement.adTagScriptSrc])

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
      className={`group relative rounded-2xl overflow-hidden ${isPlatform ? 'ad-slot-platform' : 'ad-slot-user'} ${responsive && hasDimensions ? '' : 'w-full min-h-[100px] md:min-h-[120px]'}`}
      style={slotStyle}
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
            style={injectStyle}
            data-ad-injected="true"
          />
        )}

        {/* Loading state overlay */}
        {loadState === 'loading' && hasRealAd && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Blocked state — friendly fallback instead of Chrome's "This content is blocked" */}
        {loadState === 'blocked' && hasRealAd && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/95 backdrop-blur-sm px-4 text-center"
          >
            <ShieldOff className="h-5 w-5 text-amber-500" />
            <div className="text-xs font-semibold text-foreground/90">
              Ad blocked
            </div>
            <div className="text-[10px] text-muted-foreground/80 leading-relaxed max-w-[220px]">
              {blockedReason || 'Your browser or an ad blocker prevented this ad from loading.'}
            </div>
            <div className="text-[9px] text-muted-foreground/50 mt-1">
              Disable ad blocker for this site to support the creator
            </div>
          </motion.div>
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

/**
 * Detect ad blockers by injecting a "bait" element with class names that
 * ad blockers commonly filter (e.g., 'ad-slot', 'ads', 'adsbox'). If the
 * element is hidden via display:none / visibility:hidden / offsetHeight=0
 * after a brief delay, an ad blocker is active.
 *
 * Returns true if an ad blocker appears to be filtering our content.
 */
async function checkAdBlockBait(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false

  try {
    const bait = document.createElement('div')
    bait.className = 'ad-slot ads adsbox ad-placement pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text_ads_2 ads-ad'
    bait.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;'
    bait.innerHTML = '&nbsp;'
    document.body.appendChild(bait)

    // Give the browser one animation frame to apply any styles that an
    // ad-blocker extension may have injected via CSS rules.
    const isHidden = await new Promise<boolean>(resolve => {
      requestAnimationFrame(() => {
        const styles = window.getComputedStyle(bait)
        const hidden =
          bait.offsetParent === null ||
          bait.offsetHeight === 0 ||
          bait.offsetWidth === 0 ||
          styles.display === 'none' ||
          styles.visibility === 'hidden' ||
          styles.opacity === '0'
        resolve(hidden)
      })
    })

    document.body.removeChild(bait)
    return isHidden
  } catch {
    return false
  }
}
