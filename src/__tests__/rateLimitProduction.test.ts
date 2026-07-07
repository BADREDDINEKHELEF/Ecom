/**
 * Rate limiting — production fail-closed and Redis-mode coverage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Ratelimit } from '@upstash/ratelimit'

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(function () {
    return { del: vi.fn().mockResolvedValue(1) }
  }),
}))

const limitFn = vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60000 })

vi.mock('@upstash/ratelimit', () => {
  const MockRatelimit = vi.fn().mockImplementation(function () {
    return { limit: limitFn }
  })
  ;(MockRatelimit as unknown as { slidingWindow: typeof vi.fn }).slidingWindow = vi.fn().mockReturnValue({})
  return { Ratelimit: MockRatelimit }
})

const mockedRatelimit = vi.mocked(Ratelimit)

describe('Rate limiting — production fail-closed', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    vi.stubEnv('ALLOW_IN_MEMORY_RATE_LIMIT', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('blocks all requests in production when Redis is not configured', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { checkPublicRateLimit } = await import('../lib/auth/rateLimit')
    const result = await checkPublicRateLimit('10.20.30.40', 'prod_fail_closed')
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('still blocks in production even if ALLOW_IN_MEMORY_RATE_LIMIT is not exactly "true"', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ALLOW_IN_MEMORY_RATE_LIMIT', 'yes')
    const { checkPublicRateLimit } = await import('../lib/auth/rateLimit')
    const result = await checkPublicRateLimit('10.20.30.41', 'prod_fail_closed2')
    expect(result.allowed).toBe(false)
  })

  it('allows in-memory mode in production only when explicitly opted in', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('ALLOW_IN_MEMORY_RATE_LIMIT', 'true')
    const { checkPublicRateLimit } = await import('../lib/auth/rateLimit')
    const result = await checkPublicRateLimit('10.20.30.42', 'prod_in_memory_allowed')
    expect(result.allowed).toBe(true)
  })
})

describe('Rate limiting — Redis mode', () => {
  beforeEach(() => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token')
    vi.stubEnv('NODE_ENV', 'test')
    limitFn.mockClear()
    limitFn.mockResolvedValue({ success: true, reset: Date.now() + 60000 })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('uses the Upstash Ratelimit instance when Redis env vars are set', async () => {
    vi.resetModules()
    const { checkPublicRateLimit } = await import('../lib/auth/rateLimit')
    const ip = '10.20.30.50'
    const result = await checkPublicRateLimit(ip, 'redis_ns')
    expect(result.allowed).toBe(true)
    expect(mockedRatelimit).toHaveBeenCalled()
    expect(limitFn).toHaveBeenCalledWith(ip)
  })

  it('blocks when the Upstash limiter reports success=false', async () => {
    vi.resetModules()
    limitFn.mockResolvedValueOnce({ success: false, reset: Date.now() + 30000 })
    const { checkPublicRateLimit } = await import('../lib/auth/rateLimit')
    const result = await checkPublicRateLimit('10.20.30.51', 'redis_block')
    expect(result.allowed).toBe(false)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })
})
