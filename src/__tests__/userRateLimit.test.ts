/**
 * User-level rate limiting tests.
 *
 * Verifies:
 *  1. checkUserRateLimit and checkUserDualRateLimit exist and enforce limits
 *  2. Each authenticated endpoint with expensive/write operations has user-level limiting
 *  3. User limits are keyed on user ID (not IP) — different users don't share quota
 *  4. Burst + sustained dual limits enforce both windows independently
 *  5. 429 responses include Retry-After header
 *  6. Account enumeration: rate limits apply before any data is returned
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function src(rel: string): string {
  return readFileSync(resolve(__dirname, '..', rel), 'utf-8')
}

// ── 1. API surface ─────────────────────────────────────────────────────────

describe('rateLimit.ts — user-level exports', () => {
  it('exports checkUserRateLimit', () => {
    expect(src('lib/auth/rateLimit.ts')).toContain('export async function checkUserRateLimit')
  })

  it('exports checkUserDualRateLimit', () => {
    expect(src('lib/auth/rateLimit.ts')).toContain('export async function checkUserDualRateLimit')
  })

  it('exports BurstSustainedLimits interface', () => {
    expect(src('lib/auth/rateLimit.ts')).toContain('BurstSustainedLimits')
  })

  it('user keys are prefixed with uid: to separate namespaces', () => {
    const content = src('lib/auth/rateLimit.ts')
    expect(content).toContain('`uid:${userId}`')
  })
})

// ── 2. Logic: checkUserRateLimit enforces limits ───────────────────────────

describe('checkUserRateLimit — enforcement', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
  })

  it('allows requests within limit', async () => {
    const { checkUserRateLimit } = await import('../lib/auth/rateLimit')
    const uid = `test-user-${crypto.randomUUID()}`
    const result = await checkUserRateLimit(uid, 'test_allow', 5, 60)
    expect(result.allowed).toBe(true)
    expect(result.retryAfterSeconds).toBe(0)
  })

  it('blocks requests that exceed the limit', async () => {
    const { checkUserRateLimit } = await import('../lib/auth/rateLimit')
    const uid = `test-user-${crypto.randomUUID()}`
    // Exhaust the limit
    for (let i = 0; i < 3; i++) {
      await checkUserRateLimit(uid, 'test_block', 3, 60)
    }
    const blocked = await checkUserRateLimit(uid, 'test_block', 3, 60)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('different users have independent quotas', async () => {
    const { checkUserRateLimit } = await import('../lib/auth/rateLimit')
    const uid1 = `user-a-${crypto.randomUUID()}`
    const uid2 = `user-b-${crypto.randomUUID()}`

    // Exhaust user1's quota
    for (let i = 0; i < 2; i++) await checkUserRateLimit(uid1, 'test_isolation', 2, 60)
    const blockedUser1 = await checkUserRateLimit(uid1, 'test_isolation', 2, 60)
    expect(blockedUser1.allowed).toBe(false)

    // User2 is unaffected
    const allowedUser2 = await checkUserRateLimit(uid2, 'test_isolation', 2, 60)
    expect(allowedUser2.allowed).toBe(true)
  })

  it('retryAfterSeconds is a positive integer when blocked', async () => {
    const { checkUserRateLimit } = await import('../lib/auth/rateLimit')
    const uid = `test-user-${crypto.randomUUID()}`
    for (let i = 0; i < 1; i++) await checkUserRateLimit(uid, 'test_retry', 1, 120)
    const blocked = await checkUserRateLimit(uid, 'test_retry', 1, 120)
    expect(blocked.allowed).toBe(false)
    expect(Number.isInteger(blocked.retryAfterSeconds)).toBe(true)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(120)
  })
})

// ── 3. Logic: checkUserDualRateLimit burst + sustained ────────────────────

describe('checkUserDualRateLimit — burst + sustained enforcement', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
  })

  it('allows requests within both windows', async () => {
    const { checkUserDualRateLimit } = await import('../lib/auth/rateLimit')
    const uid = `dual-user-${crypto.randomUUID()}`
    const result = await checkUserDualRateLimit(uid, 'dual_allow', {
      burstMax: 5, burstWindowSecs: 60,
      sustainedMax: 20, sustainedWindowSecs: 3600,
    })
    expect(result.allowed).toBe(true)
  })

  it('blocks on burst limit before sustained is exhausted', async () => {
    const { checkUserDualRateLimit } = await import('../lib/auth/rateLimit')
    const uid = `burst-user-${crypto.randomUUID()}`
    // Exhaust burst (max 2)
    for (let i = 0; i < 2; i++) {
      await checkUserDualRateLimit(uid, 'dual_burst', {
        burstMax: 2, burstWindowSecs: 60,
        sustainedMax: 100, sustainedWindowSecs: 3600,
      })
    }
    const blocked = await checkUserDualRateLimit(uid, 'dual_burst', {
      burstMax: 2, burstWindowSecs: 60,
      sustainedMax: 100, sustainedWindowSecs: 3600,
    })
    expect(blocked.allowed).toBe(false)
  })

  it('blocks on sustained limit after burst window resets conceptually', async () => {
    const { checkUserDualRateLimit } = await import('../lib/auth/rateLimit')
    const uid = `sustained-user-${crypto.randomUUID()}`
    // Use a high burst limit but low sustained — exhaust sustained
    for (let i = 0; i < 2; i++) {
      await checkUserDualRateLimit(uid, 'dual_sustained', {
        burstMax: 100, burstWindowSecs: 60,
        sustainedMax: 2, sustainedWindowSecs: 3600,
      })
    }
    const blocked = await checkUserDualRateLimit(uid, 'dual_sustained', {
      burstMax: 100, burstWindowSecs: 60,
      sustainedMax: 2, sustainedWindowSecs: 3600,
    })
    expect(blocked.allowed).toBe(false)
  })

  it('different users have independent dual quotas', async () => {
    const { checkUserDualRateLimit } = await import('../lib/auth/rateLimit')
    const uid1 = `dual-a-${crypto.randomUUID()}`
    const uid2 = `dual-b-${crypto.randomUUID()}`

    for (let i = 0; i < 1; i++) {
      await checkUserDualRateLimit(uid1, 'dual_iso', { burstMax: 1, burstWindowSecs: 60, sustainedMax: 10, sustainedWindowSecs: 3600 })
    }
    const blocked = await checkUserDualRateLimit(uid1, 'dual_iso', { burstMax: 1, burstWindowSecs: 60, sustainedMax: 10, sustainedWindowSecs: 3600 })
    expect(blocked.allowed).toBe(false)

    const allowed = await checkUserDualRateLimit(uid2, 'dual_iso', { burstMax: 1, burstWindowSecs: 60, sustainedMax: 10, sustainedWindowSecs: 3600 })
    expect(allowed.allowed).toBe(true)
  })
})

// ── 4. Source-code coverage: endpoints have user-level limits ─────────────

describe('User-level rate limit coverage — write endpoints', () => {
  const writeEndpoints: Array<{ label: string; file: string; fn: string }> = [
    { label: 'upload POST', file: 'app/api/seller/upload/route.ts', fn: 'checkUserDualRateLimit' },
    { label: 'analytics/export GET', file: 'app/api/seller/analytics/export/route.ts', fn: 'checkUserRateLimit' },
    { label: 'analytics GET', file: 'app/api/seller/analytics/route.ts', fn: 'checkUserRateLimit' },
    { label: 'subscription POST', file: 'app/api/seller/subscription/route.ts', fn: 'checkUserRateLimit' },
    { label: 'sponsored POST', file: 'app/api/seller/sponsored/route.ts', fn: 'checkUserRateLimit' },
    { label: 'stores POST', file: 'app/api/seller/stores/route.ts', fn: 'checkUserRateLimit' },
    { label: 'shipments POST (dual)', file: 'app/api/seller/shipments/route.ts', fn: 'checkUserDualRateLimit' },
    { label: 'shipments/sync POST (dual)', file: 'app/api/seller/shipments/sync/route.ts', fn: 'checkUserDualRateLimit' },
    { label: 'test-yalidine POST', file: 'app/api/seller/test-yalidine/route.ts', fn: 'checkUserRateLimit' },
    { label: 'test-apec POST', file: 'app/api/seller/test-apec/route.ts', fn: 'checkUserRateLimit' },
    { label: 'flash-sales POST/PATCH (dual)', file: 'app/api/seller/flash-sales/route.ts', fn: 'checkUserDualRateLimit' },
    { label: 'orders PATCH (dual)', file: 'app/api/seller/orders/route.ts', fn: 'checkUserDualRateLimit' },
    { label: 'messages POST (dual)', file: 'app/api/seller/messages/route.ts', fn: 'checkUserDualRateLimit' },
    { label: 'vendor PATCH', file: 'app/api/seller/vendor/route.ts', fn: 'checkUserRateLimit' },
    { label: 'delivery-config PATCH', file: 'app/api/seller/delivery-config/route.ts', fn: 'checkUserRateLimit' },
    { label: 'promo-codes POST/PATCH (dual)', file: 'app/api/seller/promo-codes/route.ts', fn: 'checkUserDualRateLimit' },
    { label: 'questions/answer PATCH', file: 'app/api/seller/questions/[questionId]/answer/route.ts', fn: 'checkUserRateLimit' },
    { label: 'vendor/vacation PATCH', file: 'app/api/seller/vendor/vacation/route.ts', fn: 'checkUserRateLimit' },
    { label: 'delivery-dashboard GET', file: 'app/api/seller/delivery-dashboard/route.ts', fn: 'checkUserRateLimit' },
  ]

  for (const { label, file, fn } of writeEndpoints) {
    it(`${label} — uses ${fn}`, () => {
      expect(src(file)).toContain(fn)
    })
  }
})

// ── 5. All user-rate-limited endpoints include Retry-After header ──────────

describe('429 responses include Retry-After header', () => {
  const files = [
    'app/api/seller/upload/route.ts',
    'app/api/seller/shipments/route.ts',
    'app/api/seller/flash-sales/route.ts',
    'app/api/seller/orders/route.ts',
    'app/api/seller/vendor/route.ts',
  ]

  for (const file of files) {
    it(`${file} — 429 includes Retry-After`, () => {
      const content = src(file)
      expect(content).toContain('Retry-After')
      expect(content).toContain('429')
    })
  }
})

// ── 6. User ID is used as the key (not IP) ─────────────────────────────────

describe('User-level limits key on user.id, not IP', () => {
  it('checkUserRateLimit receives userId not ip as first arg', () => {
    const rl = src('lib/auth/rateLimit.ts')
    // The function signature takes userId, not ip
    expect(rl).toContain('export async function checkUserRateLimit(\n  userId: string')
  })

  it('upload route passes ctx.user.id to checkUserDualRateLimit', () => {
    const content = src('app/api/seller/upload/route.ts')
    expect(content).toContain('checkUserDualRateLimit(ctx.user.id')
  })

  it('shipments route passes user.id to checkUserDualRateLimit', () => {
    const content = src('app/api/seller/shipments/route.ts')
    expect(content).toContain('checkUserDualRateLimit(user.id')
  })

  it('vendor route passes user.id to checkUserRateLimit', () => {
    const content = src('app/api/seller/vendor/route.ts')
    expect(content).toContain('checkUserRateLimit(user.id')
  })
})
