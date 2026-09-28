// Trust Score — shadow mode (computed but not acted upon for MVP per Phase 1 plan).
// Chapter 4 of the spec: 5 sub-scores (Traffic / Content / Ad / Spam / Account).
// Each backed by named signals. MVP uses deterministic mock signals for demonstration.
import { db } from '@/lib/db'

type SignalInput = {
  // Synchronous edge signals (mocked)
  botScore: number          // 0-100, higher = more bot-like
  // Page-content signals
  flaggedKeywords: number  // count of flagged words on page
  // Ad-risk signals
  adClickVelocity: number  // ad clicks per pageview
  repeatedIpClicks: number // distinct IPs clicking ads repeatedly
  // Spam signals
  accountAgeDays: number
  urlShareVelocity: number  // shares per day across social platforms
  duplicateContent: boolean // content fingerprint matches another page
  // Account history
  priorSuspensions: number
  verified: boolean
}

export type TrustScoreBreakdown = {
  trafficQuality: number
  contentRisk: number
  adRisk: number
  spamRisk: number
  composite: number
  signals: SignalInput
}

export function computeScoreForPage(input: SignalInput): TrustScoreBreakdown {
  // Traffic Quality (0-100, higher = better)
  const trafficQuality = Math.max(0, Math.min(100, 100 - input.botScore))

  // Content Risk (0-100, higher = worse)
  const contentRisk = Math.min(100, input.flaggedKeywords * 15)

  // Ad Risk (0-100, higher = worse)
  const adRiskBase = Math.min(100, input.adClickVelocity * 20)
  const adRiskRepeat = Math.min(100, input.repeatedIpClicks * 10)
  const adRisk = Math.min(100, Math.max(adRiskBase, adRiskRepeat))

  // Spam Risk (0-100, higher = worse)
  const agePenalty = Math.max(0, 30 - input.accountAgeDays)  // new accounts penalized
  const sharePenalty = Math.min(60, input.urlShareVelocity * 8)
  const dupPenalty = input.duplicateContent ? 40 : 0
  const spamRisk = Math.min(100, agePenalty + sharePenalty + dupPenalty)

  // Composite (weighted per spec section 4.2)
  const composite = Math.round(
    trafficQuality * 0.35 +
    (100 - contentRisk) * 0.20 +
    (100 - adRisk) * 0.25 +
    (100 - spamRisk) * 0.15 +
    (input.verified ? 5 : 0) +
    (Math.max(0, 5 - input.priorSuspensions) * 0.05 * 100) / 100
  )

  return {
    trafficQuality,
    contentRisk,
    adRisk,
    spamRisk,
    composite: Math.max(0, Math.min(100, composite)),
    signals: input,
  }
}

// Mock signal generator for MVP. In production this is fed by Cloudflare Bot Mgmt,
// FingerprintJS, in-house click-fraud pipeline, content classifier, etc.
export function mockSignalsForPage(pageId: string, accountAgeDays: number): SignalInput {
  // Deterministic mock based on pageId hash so scores are stable across calls
  const seed = pageId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const rand = (n: number) => ((seed * 9301 + n * 49297) % 233280) / 233280
  return {
    botScore: Math.round(rand(1) * 30),  // 0-30, mostly low
    flaggedKeywords: Math.floor(rand(2) * 4),
    adClickVelocity: Math.round(rand(3) * 3 * 100) / 100,
    repeatedIpClicks: Math.floor(rand(4) * 5),
    accountAgeDays,
    urlShareVelocity: Math.floor(rand(5) * 8),
    duplicateContent: rand(6) > 0.85,
    priorSuspensions: 0,
    verified: accountAgeDays > 7,
  }
}

export async function recomputeTrustScoreForPage(pageId: string): Promise<TrustScoreBreakdown> {
  const page = await db.specialPage.findUnique({
    where: { id: pageId },
    include: { owner: true },
  })
  if (!page) throw new Error('Page not found')

  const accountAgeDays = Math.floor(
    (Date.now() - page.owner.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  )
  const input = mockSignalsForPage(pageId, accountAgeDays)
  const result = computeScoreForPage(input)

  await db.trustScore.create({
    data: {
      pageId,
      trafficQuality: result.trafficQuality,
      contentRisk: result.contentRisk,
      adRisk: result.adRisk,
      spamRisk: result.spamRisk,
      composite: result.composite,
      signalBreakdown: JSON.stringify(result.signals),
    },
  })

  return result
}

// Returns the most recent trust score for a page, or null if never computed.
export async function latestTrustScore(pageId: string) {
  return db.trustScore.findFirst({
    where: { pageId },
    orderBy: { computedAt: 'desc' },
  })
}
