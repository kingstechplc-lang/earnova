// Client-side analytics tracking utility.
//
// Generates a persistent anonymous visitorId + sessionId (localStorage),
// and provides a fire-and-forget `track()` function that POSTs events to
// /api/analytics/events.
//
// Per spec section 80 (PRIVACY):
//   - No PII stored or sent (no email, no name, no IP)
//   - visitorId is a random cuid, not derived from any personal data
//   - Sessions expire after 30 min of inactivity
//
// Usage:
//   import { track, trackPageView, trackPostView } from '@/lib/analytics-client'
//   trackPageView('page-id-here')
//   trackPostView('post-id-here')
//   track('SHARE', { postId: 'post-id', campaign: 'whatsapp' })

const VISITOR_ID_KEY = 'earnova_visitor_id'
const SESSION_ID_KEY = 'earnova_session_id'
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const QUEUE_KEY = 'earnova_analytics_queue'

function generateId(): string {
  // Simple random ID (not a true cuid, but unique enough for analytics)
  return 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10)
}

function getVisitorId(): string {
  if (typeof window === 'undefined') return 'ssr'
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY)
    if (!id) {
      id = generateId()
      localStorage.setItem(VISITOR_ID_KEY, id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  try {
    const now = Date.now()
    const stored = sessionStorage.getItem(SESSION_ID_KEY)
    const storedTime = sessionStorage.getItem(SESSION_ID_KEY + '_ts')

    if (stored && storedTime && now - parseInt(storedTime, 10) < SESSION_TIMEOUT_MS) {
      // Session still active — refresh the timestamp
      sessionStorage.setItem(SESSION_ID_KEY + '_ts', now.toString())
      return stored
    }

    // Start a new session
    const newId = 's_' + now.toString(36) + '_' + Math.random().toString(36).slice(2, 8)
    sessionStorage.setItem(SESSION_ID_KEY, newId)
    sessionStorage.setItem(SESSION_ID_KEY + '_ts', now.toString())
    return newId
  } catch {
    return 'unknown'
  }
}

type TrackEvent = {
  type: string
  pageId?: string
  postId?: string
  campaign?: string
}

// Queue events in memory + flush periodically (batch sending for performance)
const eventQueue: Array<TrackEvent & { visitorId: string; sessionId: string; referrer: string; timestamp: string }> = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushQueue()
  }, 2000) // Flush every 2 seconds
}

async function flushQueue() {
  if (eventQueue.length === 0) return
  const events = eventQueue.splice(0, eventQueue.length)
  try {
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true, // Don't abort on page unload
    })
  } catch {
    // Silently fail — analytics is best-effort
    // Re-queue the events (up to a limit) for the next flush
    if (eventQueue.length < 100) {
      eventQueue.unshift(...events.slice(0, 10)) // Re-queue max 10
    }
  }
}

/**
 * Track an analytics event. Fire-and-forget — does not throw on failure.
 */
export function track(type: string, opts?: { pageId?: string; postId?: string; campaign?: string }) {
  if (typeof window === 'undefined') return // SSR guard

  const event: TrackEvent & { visitorId: string; sessionId: string; referrer: string; timestamp: string } = {
    type,
    pageId: opts?.pageId,
    postId: opts?.postId,
    campaign: opts?.campaign,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    referrer: document.referrer || 'direct',
    timestamp: new Date().toISOString(),
  }

  eventQueue.push(event)

  // If the queue is getting large, flush immediately
  if (eventQueue.length >= 10) {
    flushQueue()
  } else {
    scheduleFlush()
  }
}

/** Convenience: track a page view */
export function trackPageView(pageId: string, campaign?: string) {
  track('PAGE_VIEW', { pageId, campaign })
}

/** Convenience: track a post view */
export function trackPostView(postId: string, campaign?: string) {
  track('POST_VIEW', { postId, campaign })
}

/** Flush on page unload (best-effort via sendBeacon fallback) */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0) {
      // Use sendBeacon for reliable delivery on unload
      const events = eventQueue.splice(0, eventQueue.length)
      const visitorId = getVisitorId()
      const sessionId = getSessionId()
      const payload = JSON.stringify({
        events: events.map(e => ({
          ...e,
          visitorId,
          sessionId,
          referrer: document.referrer || 'direct',
        })),
      })
      try {
        navigator.sendBeacon('/api/analytics/events', payload)
      } catch {
        // Fallback: fetch with keepalive
        fetch('/api/analytics/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {})
      }
    }
  })
}
