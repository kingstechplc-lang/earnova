// POST /api/analytics/events — ingest analytics events (fire-and-forget from client)
//
// Per spec section 19 (TRAFFIC ANALYTICS) + section 60 (ANALYTICS SCALABILITY):
//   - Privacy-conscious: no PII stored (no email, no name, no IP)
//   - visitorId is a first-party anonymous ID (random cuid in localStorage)
//   - countryCode derived from GeoIP at the edge
//   - No tracking across sites
//
// This endpoint is unauthenticated (public visitors don't have sessions).
// It accepts a single event or a batch of events (for buffering on the client).
//
// Rate limiting: TODO — Phase 14 will add proper rate limiting. For MVP,
// the endpoint is open but event types are validated.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { AnalyticsEventType } from '@prisma/client'

const VALID_TYPES: AnalyticsEventType[] = [
  'PAGE_VIEW', 'POST_VIEW', 'LINK_CLICK', 'SHARE', 'FOLLOW',
  'REACTION', 'COMMENT', 'SAVE', 'AD_SLOT_VIEW', 'SESSION_START',
]

function detectDevice(userAgent: string | null): string {
  if (!userAgent) return 'unknown'
  const ua = userAgent.toLowerCase()
  if (/mobile|android|iphone|ipod|blackberry|opera mini/i.test(ua)) return 'mobile'
  if (/ipad|tablet|kindle|silk/i.test(ua)) return 'tablet'
  return 'desktop'
}

function detectBrowser(userAgent: string | null): string {
  if (!userAgent) return 'unknown'
  const ua = userAgent.toLowerCase()
  if (/edg\//.test(ua)) return 'edge'
  if (/opr\/|opera/.test(ua)) return 'opera'
  if (/chrome/.test(ua)) return 'chrome'
  if (/firefox/.test(ua)) return 'firefox'
  if (/safari/.test(ua)) return 'safari'
  return 'other'
}

type IncomingEvent = {
  type: string
  pageId?: string
  postId?: string
  visitorId?: string
  sessionId?: string
  referrer?: string
  campaign?: string
}

export async function POST(req: NextRequest) {
  let body: { events?: IncomingEvent[]; event?: IncomingEvent }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const events = body.events || (body.event ? [body.event] : [])
  if (!Array.isArray(events) || events.length === 0) {
    return NextResponse.json({ error: 'No events provided' }, { status: 400 })
  }
  if (events.length > 50) {
    return NextResponse.json({ error: 'Too many events (max 50 per request)' }, { status: 400 })
  }

  // Detect metadata from request headers (privacy-conscious — no IP stored)
  const userAgent = req.headers.get('user-agent')
  // Vercel provides the visitor's country via the x-vercel-ip-country header
  const countryCode = req.headers.get('x-vercel-ip-country') || null
  const deviceType = detectDevice(userAgent)
  const browser = detectBrowser(userAgent)

  // Validate + prepare events for insertion
  const rows: Array<{
    type: AnalyticsEventType
    pageId: string | null
    postId: string | null
    visitorId: string
    sessionId: string
    referrer: string | null
    countryCode: string | null
    deviceType: string | null
    browser: string | null
    campaign: string | null
  }> = []

  for (const ev of events) {
    if (!VALID_TYPES.includes(ev.type as AnalyticsEventType)) {
      continue // Skip invalid event types
    }
    // At least one of pageId/postId must be set (except SESSION_START)
    if (ev.type !== 'SESSION_START' && !ev.pageId && !ev.postId) {
      continue
    }

    rows.push({
      type: ev.type as AnalyticsEventType,
      pageId: ev.pageId || null,
      postId: ev.postId || null,
      visitorId: ev.visitorId || 'anonymous',
      sessionId: ev.sessionId || 'anonymous',
      referrer: ev.referrer || null,
      countryCode,
      deviceType,
      browser,
      campaign: ev.campaign || null,
    })
  }

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, ingested: 0 })
  }

  // Batch insert — fire-and-forget from the client's perspective
  try {
    await db.analyticsEvent.createMany({ data: rows })
  } catch (err) {
    // Silently fail — analytics is best-effort, don't break the visitor's experience
    console.error('[analytics] Event ingestion failed:', err)
    return NextResponse.json({ ok: false, error: 'Ingestion failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ingested: rows.length })
}
