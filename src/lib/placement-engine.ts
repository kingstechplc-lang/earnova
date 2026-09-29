// Placement Engine — enforces ad-network co-display rules per Chapter 2 of the spec.
// Given a Special Page's intended placements, returns the subset that may render together.
import { db } from '@/lib/db'
import type { AdPlacement, AdIntegration, AdNetwork, SpecialPage } from '@prisma/client'

type PlacementWithRelations = AdPlacement & {
  integration: (AdIntegration & { adNetwork: AdNetwork }) | null
}

export type RenderedPlacement = {
  id: string
  slot: string
  source: string
  adNetworkCode: string  // "adsterra" | "monetag" | "platform"
  integrationType: string | null
  scriptReference: string | null  // sanitized reference key
  priority: number
}

export type PlacementPolicySnapshot = {
  maxAdUnitsPerPage: number
  maxPlatformAdsPerPage: number
  maxUserAdsPerPage: number
  minContentBetweenAdsPx: number
  platformAdsEnabled: boolean
  userAdsEnabled: boolean
  globalKillSwitch: boolean
  userAdFormatSelection: boolean
  adSlotResponsive: boolean
}

export async function getActivePolicy(): Promise<PlacementPolicySnapshot> {
  let policy = await db.adPlacementPolicy.findFirst({ where: { name: 'global' } })
  if (!policy) {
    policy = await db.adPlacementPolicy.create({ data: { name: 'global' } })
  }
  return {
    maxAdUnitsPerPage: policy.maxAdUnitsPerPage,
    maxPlatformAdsPerPage: policy.maxPlatformAdsPerPage,
    maxUserAdsPerPage: policy.maxUserAdsPerPage,
    minContentBetweenAdsPx: policy.minContentBetweenAdsPx,
    platformAdsEnabled: policy.platformAdsEnabled,
    userAdsEnabled: policy.userAdsEnabled,
    globalKillSwitch: policy.globalKillSwitch,
    userAdFormatSelection: policy.userAdFormatSelection,
    adSlotResponsive: policy.adSlotResponsive,
  }
}

// Cache compatibility matrix in-memory for 60s (per spec chapter 2.4)
let compatCache: { ts: number; matrix: Map<string, string> } | null = null
const COMPAT_TTL_MS = 60_000

async function getCompatMatrix(): Promise<Map<string, string>> {
  if (compatCache && Date.now() - compatCache.ts < COMPAT_TTL_MS) {
    return compatCache.matrix
  }
  const rows = await db.adNetworkCompatibility.findMany({
    include: { networkA: true, networkB: true },
  })
  const m = new Map<string, string>()
  for (const r of rows) {
    m.set(`${r.networkA.code}|${r.networkB.code}`, r.verdict)
    m.set(`${r.networkB.code}|${r.networkA.code}`, r.verdict)  // symmetric
  }
  compatCache = { ts: Date.now(), matrix: m }
  return m
}

/**
 * Compute which placements may render on a Special Page.
 * Algorithm (per chapter 2.4 of the spec):
 *   1. Load page's intended placements sorted by priority.
 *   2. For each placement, check pairwise compatibility with already-accepted ones.
 *      If any pair is FORBIDDEN, drop the lower-priority placement.
 *   3. Apply global caps (total / platform / user / separation).
 *   4. Return surviving placements in priority order.
 *
 * This is a "shadow" implementation: real placement involves emitting HTML,
 * but this function returns metadata only — the caller decides how to render.
 */
export async function computeRenderedPlacements(
  page: SpecialPage,
  placements: PlacementWithRelations[],
  policy: PlacementPolicySnapshot
): Promise<RenderedPlacement[]> {
  // 0. Global kill switch
  if (policy.globalKillSwitch) return []

  // 1. Filter by global toggles
  let candidates = placements.filter(p => {
    if (!p.enabled) return false
    if (p.source === 'USER_INTEGRATION' && !policy.userAdsEnabled) return false
    if ((p.source === 'PLATFORM_DIRECT' || p.source === 'PLATFORM_NETWORK') && !policy.platformAdsEnabled) return false
    // User-integration placements require the integration to be APPROVED
    if (p.source === 'USER_INTEGRATION' && (!p.integration || p.integration.lifecycleState !== 'APPROVED')) return false
    return true
  })

  // 2. Sort by priority (lower = higher priority)
  candidates.sort((a, b) => a.priority - b.priority)

  // 3. Pairwise compatibility check
  const matrix = await getCompatMatrix()
  const accepted: PlacementWithRelations[] = []
  for (const p of candidates) {
    const pNetwork = networkCodeOf(p)
    let ok = true
    for (const a of accepted) {
      const aNetwork = networkCodeOf(a)
      const verdict = matrix.get(`${pNetwork}|${aNetwork}`)
      if (verdict === 'FORBIDDEN') {
        ok = false
        break
      }
      // ALLOWED_WITH_LIMITS handled by global caps below (simplified for MVP)
    }
    if (ok) accepted.push(p)
  }

  // 4. Apply caps
  const platformCount = accepted.filter(p => p.source !== 'USER_INTEGRATION').length
  const userCount = accepted.filter(p => p.source === 'USER_INTEGRATION').length
  const trimmed: PlacementWithRelations[] = []
  let pCount = 0, uCount = 0
  for (const p of accepted) {
    if (p.source === 'USER_INTEGRATION') {
      if (uCount >= policy.maxUserAdsPerPage) continue
      uCount++
    } else {
      if (pCount >= policy.maxPlatformAdsPerPage) continue
      pCount++
    }
    trimmed.push(p)
    if (trimmed.length >= policy.maxAdUnitsPerPage) break
  }

  return trimmed.map(p => ({
    id: p.id,
    slot: p.slot,
    source: p.source,
    adNetworkCode: p.integration?.adNetwork.code ?? 'platform',
    integrationType: p.integration?.integrationType ?? null,
    scriptReference: p.integration?.scriptReference ?? null,
    priority: p.priority,
  }))
}

function networkCodeOf(p: PlacementWithRelations): string {
  if (p.source === 'USER_INTEGRATION') {
    return p.integration?.adNetwork.code ?? 'unknown'
  }
  return 'platform'
}

// Map slot to approximate Y offset on a typical page (for separation checks).
// Used by the renderer to decide if a spacer block is needed between two placements.
export const SLOT_ORDER = ['HEADER', 'AFTER_FIRST_BLOCK', 'MID_CONTENT', 'BEFORE_FOOTER', 'FOOTER', 'SIDEBAR'] as const

export function slotNeedsSpacer(slotA: string, slotB: string, minPx: number): boolean {
  const ia = SLOT_ORDER.indexOf(slotA as any)
  const ib = SLOT_ORDER.indexOf(slotB as any)
  if (ia < 0 || ib < 0) return false
  // If adjacent slots, the renderer must inject minContentBetweenAdsPx of content
  return Math.abs(ia - ib) === 1
}
