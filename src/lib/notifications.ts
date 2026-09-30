// Notification helper — creates notifications + respects user preferences.
//
// Per spec section 15 (NOTIFICATION SYSTEM):
//   - Support in-app + email where appropriate
//   - Do not send duplicate notifications
//   - User can configure preferences per type
//
// This helper is imported by all the social API routes (follow, react, comment,
// save) so they can fire notifications atomically alongside their main action.
import { db } from '@/lib/db'
import type { NotificationType } from '@prisma/client'

/**
 * Create a notification for a user, respecting their preferences.
 *
 * @param userId    — recipient
 * @param type      — notification type
 * @param title     — pre-rendered title (e.g. "Kingsley liked your post")
 * @param opts      — optional: actorId, entityId, entityType, body
 *
 * Behavior:
 *   - If the user has disabled in-app notifications for this type, skip.
 *   - If actorId === userId (self-action), skip (don't notify yourself).
 *   - Otherwise, insert a Notification row.
 *
 * Email delivery is handled by a separate background job (Phase 6+) — this
 * helper only creates the in-app notification row.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  opts?: {
    actorId?: string
    entityId?: string
    entityType?: string
    body?: string
  }
): Promise<void> {
  // Don't notify yourself for your own actions
  if (opts?.actorId && opts.actorId === userId) return

  // Check user preferences (auto-create defaults if missing)
  const pref = await getOrCreatePreference(userId, type)
  if (!pref.inAppEnabled) return

  await db.notification.create({
    data: {
      userId,
      type,
      actorId: opts?.actorId || null,
      entityId: opts?.entityId || null,
      entityType: opts?.entityType || null,
      title,
      body: opts?.body || null,
    },
  })
}

/**
 * Get or create a user's notification preference for a type.
 * Defaults: inAppEnabled=true, emailEnabled=false.
 */
async function getOrCreatePreference(userId: string, type: NotificationType) {
  const existing = await db.notificationPreference.findUnique({
    where: { userId_type: { userId, type } },
  })
  if (existing) return existing

  return db.notificationPreference.create({
    data: { userId, type, inAppEnabled: true, emailEnabled: false },
  })
}
