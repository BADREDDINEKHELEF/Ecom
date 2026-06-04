/**
 * Rate limiting module.
 *
 * Default: in-memory sliding window — works for development and single-instance
 * deployments. Resets on cold start (Vercel serverless), which means the window
 * is weakened on platforms that spin up many instances.
 *
 * For production on Vercel / any serverless platform:
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your env vars
 * and install: npm i @upstash/ratelimit @upstash/redis
 * Then switch the adapter below to the Upstash implementation.
 *
 * The interface is the same — only the backing store changes.
 */

interface RateLimitResult {
  allowed:            boolean
  retryAfterSeconds:  number
}

// ── In-Memory Implementation ────────────────────────────────────────────────
// Safe for single-process Node.js (e.g. self-hosted, Railway, Render).
// Not safe for stateless serverless (each cold start = fresh state).

interface WindowEntry {
  count:       number
  windowStart: number
}

const stores = new Map<string, Map<string, WindowEntry>>()

function getStore(namespace: string): Map<string, WindowEntry> {
  if (!stores.has(namespace)) stores.set(namespace, new Map())
  return stores.get(namespace)!
}

function checkInMemory(
  namespace: string,
  key: string,
  maxAttempts: number,
  windowMs: number
): RateLimitResult {
  const store = getStore(namespace)
  const now   = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  if (entry.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((entry.windowStart + windowMs - now) / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  entry.count++
  return { allowed: true, retryAfterSeconds: 0 }
}

function resetInMemory(namespace: string, key: string): void {
  getStore(namespace).delete(key)
}

// ── Cleanup: prevent unbounded memory growth ────────────────────────────────
// Evict entries older than their window every 10 minutes.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [, store] of stores) {
      for (const [key, entry] of store) {
        // Keep a generous 30-minute buffer before eviction
        if (now - entry.windowStart > 30 * 60 * 1000) {
          store.delete(key)
        }
      }
    }
  }, 10 * 60 * 1000)
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Admin login: 5 attempts / 15 min per IP */
export function checkRateLimit(ip: string): RateLimitResult {
  return checkInMemory('admin_login', ip, 5, 15 * 60 * 1000)
}

export function resetRateLimit(ip: string): void {
  resetInMemory('admin_login', ip)
}

/** Public endpoints: 30 requests / 1 min per IP */
export function checkPublicRateLimit(ip: string, namespace: string): RateLimitResult {
  return checkInMemory(namespace, ip, 30, 60 * 1000)
}

/** Checkout: 10 orders / 10 min per IP (prevents order flooding) */
export function checkCheckoutRateLimit(ip: string): RateLimitResult {
  return checkInMemory('checkout', ip, 10, 10 * 60 * 1000)
}

/**
 * Geocode requests: 5 per minute per IP.
 * Nominatim usage policy requires reasonable rate limiting.
 */
export function checkGeocodeRateLimit(ip: string): RateLimitResult {
  return checkInMemory('geocode', ip, 5, 60 * 1000)
}
