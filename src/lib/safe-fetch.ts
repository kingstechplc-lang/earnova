/**
 * safeFetch — wraps fetch() with graceful error handling.
 *
 * Why this exists: Next.js dev server briefly drops fetch requests during hot
 * reloads, causing "Failed to fetch" TypeErrors that crash the page because
 * the rejection isn't caught. This helper:
 *   1. Catches network errors and returns a typed error result instead of throwing.
 *   2. Catches non-2xx responses and surfaces the server's error message.
 *   3. Always parses JSON safely (returns null on parse failure).
 *
 * Usage:
 *   const result = await safeFetch<MyType>('/api/foo')
 *   if (result.error) {
 *     setError(result.error); return
 *   }
 *   setData(result.data)
 */

export type SafeFetchResult<T> =
  | { data: T; error: null; status: number }
  | { data: null; error: string; status: number }

export async function safeFetch<T = any>(
  input: string | URL,
  init?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(input, init)

    // Try to parse JSON body (may fail on empty/non-JSON responses)
    let body: any = null
    try {
      body = await res.json()
    } catch {
      // Non-JSON response (e.g. 204 No Content) — leave body as null
    }

    if (!res.ok) {
      const error =
        (body && typeof body === 'object' && 'error' in body && String(body.error)) ||
        `Request failed with status ${res.status}`
      return { data: null, error, status: res.status }
    }

    return { data: body as T, error: null, status: res.status }
  } catch (err: any) {
    // Network error, CORS, dev server mid-reload, etc.
    return {
      data: null,
      error: err?.message || 'Network error — please check your connection and try again.',
      status: 0,
    }
  }
}

/**
 * fetchAllSettled — runs multiple safeFetch calls in parallel and never rejects.
 * Returns per-call results so partial failures don't kill the whole batch.
 */
export async function fetchAllSettled<T extends readonly any[]>(
  ...calls: { url: string; init?: RequestInit }[]
): Promise<{ -readonly [K in keyof T]: SafeFetchResult<any> }>
export async function fetchAllSettled(
  ...calls: { url: string; init?: RequestInit }[]
): Promise<SafeFetchResult<any>[]>
export async function fetchAllSettled(
  ...calls: { url: string; init?: RequestInit }[]
): Promise<SafeFetchResult<any>[]> {
  return Promise.all(calls.map((c) => safeFetch(c.url, c.init)))
}
