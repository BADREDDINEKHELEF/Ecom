/**
 * Rate limiting — dual-mode: Upstash Redis (production) or in-memory (dev).
 *
 * HOW IT WORKS:
 *   If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, the module
 *   uses @upstash/ratelimit with a sliding-window algorithm backed by Redis.
 *   This is shared across all serverless instances so cold-start resets are
 *   not an issue.
 *
 *   Without those env vars (local dev / single-process deployments) it falls
 *   back to an in-memory sliding window. The in-memory store resets on cold
 *   starts, so it is NOT safe for production on Vercel / multi-instance hosts.
 *
 * SETUP (production):
 *   1. Create a free Redis database at upstash.com
 *   2. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel env vars
 *   Done — no code changes needed.
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis }     from '@upstash/redis'

interface RateLimitResult {
  allowed:           boolean
  retryAfterSeconds: number
}

// ── Upstash Limiters (lazy-initialised) ────────────────────────────────────

let upstashAvailable: boolean | null = null

function isUpstashConfigured(): boolean {
  if (upstashAvailable !== null) return upstashAvailable
  upstashAvailable =
    Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
    Boolean(process.env.UPSTASH_REDIS_REST_TOKEN)
  return upstashAvailable
}

let _redis: Redis | null = null
function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return _redis
}

// One Ratelimit instance per namespace — created on first use
const upstashLimiters = new Map<string, Ratelimit>()

function getUpstashLimiter(namespace: string, maxRequests: number, windowSeconds: number): Ratelimit {
  const key = `${namespace}:${maxRequests}:${windowSeconds}`
  if (!upstashLimiters.has(key)) {
    upstashLimiters.set(key, new Ratelimit({
      redis:     getRedis(),
      limiter:   Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
      prefix:    `rl:${namespace}`,
      analytics: false,
    }))
  }
  return upstashLimiters.get(key)!
}

async function checkUpstash(
  namespace: string,
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(namespace, maxRequests, windowSeconds)
  const result  = await limiter.limit(key)
  return {
    allowed:           result.success,
    retryAfterSeconds: result.success ? 0 : Math.ceil((result.reset - Date.now()) / 1000),
  }
}

// ── In-Memory Fallback ──────────────────────────────────────────────────────

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

// Evict stale in-memory entries every 10 minutes (prevents unbounded growth)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [, store] of stores) {
      for (const [key, entry] of store) {
        if (now - entry.windowStart > 30 * 60 * 1000) store.delete(key)
      }
    }
  }, 10 * 60 * 1000)
}

// ── Unified check helper ────────────────────────────────────────────────────

async function check(
  namespace: string,
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (isUpstashConfigured()) {
    return checkUpstash(namespace, key, maxRequests, windowSeconds)
  }
  return checkInMemory(namespace, key, maxRequests, windowSeconds * 1000)
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Admin login: 5 attempts / 15 min per IP */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  return check('admin_login', ip, 5, 15 * 60)
}

export function resetRateLimit(ip: string): void {
  resetInMemory('admin_login', ip)
  // Upstash: no explicit reset needed — window expires naturally.
  // On login success the 5-attempt budget effectively doesn't matter.
}

/** Public endpoints: 30 requests / 1 min per IP */
export async function checkPublicRateLimit(ip: string, namespace: string): Promise<RateLimitResult> {
  return check(namespace, ip, 30, 60)
}

/** Checkout: 10 orders / 10 min per IP (prevents order flooding) */
export async function checkCheckoutRateLimit(ip: string): Promise<RateLimitResult> {
  return check('checkout', ip, 10, 10 * 60)
}

/** Geocode: 5 requests / 1 min per IP (Nominatim fair-use policy) */
export async function checkGeocodeRateLimit(ip: string): Promise<RateLimitResult> {
  return check('geocode', ip, 5, 60)
}
