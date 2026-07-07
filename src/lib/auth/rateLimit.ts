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
import { logger } from '@/lib/logger'

interface RateLimitResult {
  allowed:           boolean
  retryAfterSeconds: number
}

// ── Upstash Limiters (lazy-initialised) ────────────────────────────────────

function stripQuotes(s: string): string {
  return s.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
}

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
      url:   stripQuotes(process.env.UPSTASH_REDIS_REST_URL!),
      token: stripQuotes(process.env.UPSTASH_REDIS_REST_TOKEN!),
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


function evictStale(namespace: string): void {
  const store = getStore(namespace)
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now - entry.windowStart > 30 * 60 * 1000) store.delete(key)
  }
}

function checkInMemory(
  namespace: string,
  key: string,
  maxAttempts: number,
  windowMs: number
): RateLimitResult {
  evictStale(namespace)
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

function isProductionWithoutRedis(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env.NODE_ENV === 'production' &&
    (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)
  )
}

function resetInMemory(namespace: string, key: string): void {
  evictStale(namespace)
  getStore(namespace).delete(key)
}

// ── Unified check helper ────────────────────────────────────────────────────

async function check(
  namespace: string,
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  if (isProductionWithoutRedis()) {
    // In production without shared Redis the in-memory store is unsafe across
    // serverless instances. Fail closed rather than give a false sense of
    // security. Admins can explicitly opt out by setting
    // ALLOW_IN_MEMORY_RATE_LIMIT=true only if they run a single instance.
    if (process.env.ALLOW_IN_MEMORY_RATE_LIMIT !== 'true') {
      logger.error('[rateLimit] production rate limiting disabled: UPSTASH_REDIS_REST_URL/TOKEN missing')
      return { allowed: false, retryAfterSeconds: 60 }
    }
  }

  const result = isUpstashConfigured()
    ? await checkUpstash(namespace, key, maxRequests, windowSeconds)
    : checkInMemory(namespace, key, maxRequests, windowSeconds * 1000)
  if (!result.allowed) {
    logger.warn('[rateLimit] limit reached', {
      namespace,
      key: key.slice(0, 40),
      retryAfterSeconds: result.retryAfterSeconds,
    })
  }
  return result
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Admin login: 5 attempts / 15 min per IP */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  return check('admin_login', ip, 5, 15 * 60)
}

export async function resetRateLimit(ip: string): Promise<void> {
  resetInMemory('admin_login', ip)
  if (isUpstashConfigured()) {
    try {
      // DEL the sliding-window key so a successful login fully restores the
      // attempt budget in Redis, matching the in-memory reset above.
      await getRedis().del(`rl:admin_login:${ip}`)
    } catch (err) {
      logger.warn('[rateLimit] resetRateLimit: Redis DEL failed', { err })
    }
  }
}

/** Public endpoints: 30 requests / 1 min per IP */
export async function checkPublicRateLimit(ip: string, namespace: string): Promise<RateLimitResult> {
  return check(namespace, ip, 30, 60)
}

/** Gift card validate: 5 requests / 10 min per IP (prevents brute-force) */
export async function checkGiftCardRateLimit(ip: string): Promise<RateLimitResult> {
  return check('giftcard_validate', ip, 5, 10 * 60)
}

/** Gift card per-code: 10 attempts / 30 min per code (blocks enumeration even with IP rotation) */
export async function checkGiftCardCodeRateLimit(code: string): Promise<RateLimitResult> {
  return check('giftcard_per_code', `code:${code}`, 10, 30 * 60)
}

/** Checkout: 10 orders / 10 min per IP (prevents order flooding) */
export async function checkCheckoutRateLimit(ip: string): Promise<RateLimitResult> {
  return check('checkout', ip, 10, 10 * 60)
}

/** Geocode: 5 requests / 1 min per IP (Nominatim fair-use policy) */
export async function checkGeocodeRateLimit(ip: string): Promise<RateLimitResult> {
  return check('geocode', ip, 5, 60)
}

/** OTP send: 5 per 15 min per IP, 3 per hour per phone number */
export async function checkOtpSendRateLimit(ip: string, phone: string): Promise<RateLimitResult> {
  const byIp    = await check('otp_send_ip',    ip,                           5, 15 * 60)
  if (!byIp.allowed) return byIp
  const byPhone = await check('otp_send_phone', phone.trim().toLowerCase(),   3, 60 * 60)
  return byPhone
}

/** OTP verify: 10 attempts per 15 min per phone/email (brute-force guard) */
export async function checkOtpVerifyRateLimit(phone: string): Promise<RateLimitResult> {
  return check('otp_verify', phone.trim().toLowerCase(), 10, 15 * 60)
}

/** OTP verify from the registration frontend step: more lenient because the
 *  user may typo the code a few times before the final /register call. */
export async function checkOtpVerifyFrontendRateLimit(phone: string): Promise<RateLimitResult> {
  return check('otp_verify_frontend', phone.trim().toLowerCase(), 30, 15 * 60)
}

/**
 * Seller authenticated endpoints.
 * Default: 60 requests / 1 min per IP. Override for expensive operations.
 */
export async function checkSellerRateLimit(
  ip: string,
  namespace: string,
  maxRequests = 60,
  windowSeconds = 60
): Promise<RateLimitResult> {
  return check(`seller_${namespace}`, ip, maxRequests, windowSeconds)
}

/**
 * Admin panel API endpoints (called after JWT verification).
 * Default: 120 reads / 1 min per IP; pass 30 for writes.
 */
export async function checkAdminApiRateLimit(
  ip: string,
  namespace: string,
  maxRequests = 120,
  windowSeconds = 60
): Promise<RateLimitResult> {
  return check(`admin_${namespace}`, ip, maxRequests, windowSeconds)
}

/**
 * Admin TOTP setup endpoint: 3 per hour per IP (one-time setup, very restrictive).
 */
export async function checkTotpSetupRateLimit(ip: string): Promise<RateLimitResult> {
  return check('admin_totp_setup', ip, 3, 60 * 60)
}

// ── User-level (account-scoped) rate limits ─────────────────────────────────
// These run AFTER authentication, keyed on the verified user ID rather than IP.
// Purpose: prevent one compromised or misbehaving account from exhausting shared
// resources regardless of IP rotation or shared-IP (corporate NAT) scenarios.

/**
 * Per-user sustained rate limit.
 * Call after getUser() — uses user.id as the rate-limit key.
 */
export async function checkUserRateLimit(
  userId: string,
  namespace: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  return check(`u_${namespace}`, `uid:${userId}`, maxRequests, windowSeconds)
}

export interface BurstSustainedLimits {
  /** Short burst: high max, short window — absorbs legitimate spikes */
  burstMax:            number
  burstWindowSecs:     number
  /** Sustained: lower max, longer window — prevents prolonged exhaustion */
  sustainedMax:        number
  sustainedWindowSecs: number
}

/**
 * Per-user dual (burst + sustained) rate limit.
 * Both windows must pass for the request to proceed.
 * Example: 5 uploads/2 min (burst) + 20 uploads/hour (sustained).
 */
export async function checkUserDualRateLimit(
  userId: string,
  namespace: string,
  limits: BurstSustainedLimits
): Promise<RateLimitResult> {
  const burst = await check(
    `u_${namespace}_burst`,
    `uid:${userId}`,
    limits.burstMax,
    limits.burstWindowSecs
  )
  if (!burst.allowed) return burst
  return check(
    `u_${namespace}_sustained`,
    `uid:${userId}`,
    limits.sustainedMax,
    limits.sustainedWindowSecs
  )
}
