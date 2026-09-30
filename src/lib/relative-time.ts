/**
 * relativeTime — formats an ISO date string as a short relative-time label.
 *
 * Examples:
 *   "just now", "12s ago", "5m ago", "3h ago", "2d ago", "Jan 4", "Dec 12, 2024"
 *
 * Returns the most appropriate granularity based on the elapsed duration.
 */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const now = Date.now()
  const diffMs = Math.max(0, now - then)
  const sec = Math.floor(diffMs / 1000)
  if (sec < 30) return 'just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  // Beyond a week, show a calendar-style date.
  const d = new Date(iso)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString(undefined, sameYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' }
  )
}
