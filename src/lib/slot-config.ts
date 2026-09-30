// AdSlotConfig helpers — loads + caches the per-slot admin configuration.
//
// The AdSlotConfig table lets admins control:
//   * Which slots (HEADER, FOOTER, etc.) are enabled for platform / user ads
//   * Which integration types (BANNER, NATIVE, etc.) are allowed per slot
//   * Which specific platform integration is assigned to a slot
//   * Default priority used when seeding placements for new pages
//   * Visibility rules (ALWAYS / ONLY_WHEN_AD_AVAILABLE / NEVER)
//
// Used by:
//   * src/lib/placement-engine.ts — filters out placements whose slot+source
//     is disabled in AdSlotConfig
//   * src/app/api/p/[slug]/route.ts — picks the assigned platform integration
//     per slot (no more `platformIntegrations[0]` for everything)
//   * src/app/api/admin/slot-config/route.ts — admin CRUD
//   * src/components/admin/slot-config-section.tsx — admin UI
import { db } from '@/lib/db'
import type { AdSlotConfig, PlacementSlot, PlacementSource } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Visibility = 'ALWAYS' | 'ONLY_WHEN_AD_AVAILABLE' | 'NEVER'

export type SlotConfigRow = {
  id: string
  slot: PlacementSlot
  source: PlacementSource
  enabled: boolean
  allowedIntegrationTypes: string[]  // parsed from comma-separated string
  assignedIntegrationId: string | null
  defaultPriority: number
  visibility: Visibility
}

// ─── Cache (60s TTL — same as compat matrix) ─────────────────────────────────

let slotConfigCache: { ts: number; rows: SlotConfigRow[] } | null = null
const SLOT_CONFIG_TTL_MS = 60_000

/**
 * Load all AdSlotConfig rows, parsed + cached.
 * Auto-creates default rows for any (slot, source) pair that doesn't exist
 * so the admin UI has something to edit.
 */
export async function getSlotConfigs(): Promise<SlotConfigRow[]> {
  if (slotConfigCache && Date.now() - slotConfigCache.ts < SLOT_CONFIG_TTL_MS) {
    return slotConfigCache.rows
  }

  // Auto-seed default configs for every (slot, source) pair if missing.
  // This is idempotent + cheap — runs only on cache miss.
  await ensureDefaultSlotConfigs()

  const rows = await db.adSlotConfig.findMany({ orderBy: [{ slot: 'asc' }, { source: 'asc' }] })
  const parsed: SlotConfigRow[] = rows.map(r => ({
    id: r.id,
    slot: r.slot,
    source: r.source,
    enabled: r.enabled,
    allowedIntegrationTypes: r.allowedIntegrationTypes
      ? r.allowedIntegrationTypes.split(',').map(s => s.trim()).filter(Boolean)
      : [],
    assignedIntegrationId: r.assignedIntegrationId,
    defaultPriority: r.defaultPriority,
    visibility: (r.visibility as Visibility) ?? 'ONLY_WHEN_AD_AVAILABLE',
  }))

  slotConfigCache = { ts: Date.now(), rows: parsed }
  return parsed
}

/**
 * Invalidate the cache — call after admin edits slot configs.
 */
export function invalidateSlotConfigCache() {
  slotConfigCache = null
}

/**
 * Find the slot config for a given (slot, source) pair.
 * Returns undefined if no config exists (shouldn't happen after auto-seed).
 */
export async function getSlotConfig(
  slot: PlacementSlot,
  source: PlacementSource
): Promise<SlotConfigRow | undefined> {
  const rows = await getSlotConfigs()
  return rows.find(r => r.slot === slot && r.source === source)
}

/**
 * Get all enabled slot+source pairs.
 * Used by placement-engine to filter out disabled slots.
 */
export async function getEnabledSlotSources(): Promise<Set<string>> {
  const rows = await getSlotConfigs()
  const enabled = new Set<string>()
  for (const r of rows) {
    if (r.enabled && r.visibility !== 'NEVER') {
      enabled.add(`${r.slot}|${r.source}`)
    }
  }
  return enabled
}

/**
 * Get the visibility rule for a (slot, source) pair.
 * Falls back to 'ONLY_WHEN_AD_AVAILABLE' if not configured.
 */
export async function getSlotVisibility(
  slot: PlacementSlot,
  source: PlacementSource
): Promise<Visibility> {
  const cfg = await getSlotConfig(slot, source)
  return cfg?.visibility ?? 'ONLY_WHEN_AD_AVAILABLE'
}

/**
 * Check if an integrationType is allowed in a given slot.
 * Empty allowedIntegrationTypes means "any type allowed".
 */
export function isIntegrationTypeAllowed(
  cfg: SlotConfigRow | undefined,
  integrationType: string | null | undefined
): boolean {
  if (!cfg) return true
  if (cfg.allowedIntegrationTypes.length === 0) return true
  if (!integrationType) return false
  return cfg.allowedIntegrationTypes.includes(integrationType)
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const ALL_SLOTS: PlacementSlot[] = [
  'HEADER', 'AFTER_FIRST_BLOCK', 'MID_CONTENT', 'BEFORE_FOOTER', 'FOOTER', 'SIDEBAR',
]

const ALL_SOURCES: PlacementSource[] = [
  'PLATFORM_NETWORK', 'USER_INTEGRATION',
]

// Default priorities — lower = appears higher on page
const DEFAULT_PRIORITY: Record<PlacementSlot, number> = {
  HEADER: 10,
  AFTER_FIRST_BLOCK: 30,
  MID_CONTENT: 50,
  BEFORE_FOOTER: 80,
  FOOTER: 90,
  SIDEBAR: 70,
}

// Default enabled state per (slot, source) pair.
// Platform: HEADER + FOOTER enabled by default (top + bottom of page).
// User: AFTER_FIRST_BLOCK + MID_CONTENT + SIDEBAR enabled by default
// (so creators can monetize content without colliding with platform ads).
const DEFAULT_ENABLED: Record<string, boolean> = {
  'HEADER|PLATFORM_NETWORK': true,
  'HEADER|USER_INTEGRATION': false,
  'AFTER_FIRST_BLOCK|PLATFORM_NETWORK': false,
  'AFTER_FIRST_BLOCK|USER_INTEGRATION': true,
  'MID_CONTENT|PLATFORM_NETWORK': false,
  'MID_CONTENT|USER_INTEGRATION': true,
  'BEFORE_FOOTER|PLATFORM_NETWORK': false,
  'BEFORE_FOOTER|USER_INTEGRATION': false,
  'FOOTER|PLATFORM_NETWORK': true,
  'FOOTER|USER_INTEGRATION': false,
  'SIDEBAR|PLATFORM_NETWORK': false,
  'SIDEBAR|USER_INTEGRATION': false,
}

/**
 * Idempotent — create AdSlotConfig rows for any (slot, source) pair that
 * doesn't exist yet. Uses the DEFAULT_ENABLED + DEFAULT_PRIORITY tables.
 */
async function ensureDefaultSlotConfigs() {
  const existing = await db.adSlotConfig.findMany()
  const existingKeys = new Set(existing.map(r => `${r.slot}|${r.source}`))

  const toCreate: Array<{
    slot: PlacementSlot
    source: PlacementSource
    enabled: boolean
    defaultPriority: number
  }> = []

  for (const slot of ALL_SLOTS) {
    for (const source of ALL_SOURCES) {
      const key = `${slot}|${source}`
      if (!existingKeys.has(key)) {
        toCreate.push({
          slot,
          source,
          enabled: DEFAULT_ENABLED[key] ?? false,
          defaultPriority: DEFAULT_PRIORITY[slot],
        })
      }
    }
  }

  if (toCreate.length > 0) {
    await db.adSlotConfig.createMany({ data: toCreate })
    invalidateSlotConfigCache()
  }
}

/**
 * Get the default priority for a slot (used when seeding placements for new pages).
 */
export async function getDefaultPriority(
  slot: PlacementSlot,
  source: PlacementSource
): Promise<number> {
  const cfg = await getSlotConfig(slot, source)
  return cfg?.defaultPriority ?? DEFAULT_PRIORITY[slot] ?? 50
}

/**
 * Get all enabled slots for a given source.
 * Used by page-create to seed placements based on admin config.
 */
export async function getEnabledSlotsForSource(
  source: PlacementSource
): Promise<Array<{ slot: PlacementSlot; priority: number }>> {
  const rows = await getSlotConfigs()
  return rows
    .filter(r => r.source === source && r.enabled && r.visibility !== 'NEVER')
    .map(r => ({ slot: r.slot, priority: r.defaultPriority }))
}
