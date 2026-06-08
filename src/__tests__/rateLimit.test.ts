/**
 * Unit tests — rate limiting module (in-memory fallback path).
 * These run without any external dependencies.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Force in-memory mode for tests (no Upstash env vars)
vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')

// Re-import after stubbing env so the module sees the empty vars
const { checkRateLimit, checkPublicRateLimit, checkCheckoutRateLimit, resetRateLimit } =
  await import('../lib/auth/rateLimit')

describe('Rate Limiting — in-memory', () => {
  // Use a unique IP per test to avoid cross-test contamination
  const makeIp = () => `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`

  describe('checkRateLimit (admin login: 5/15min)', () => {
    it('allows the first 5 attempts', async () => {
      const ip = makeIp()
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(ip)
        expect(result.allowed).toBe(true)
      }
    })

    it('blocks the 6th attempt', async () => {
      const ip = makeIp()
      for (let i = 0; i < 5; i++) await checkRateLimit(ip)
      const blocked = await checkRateLimit(ip)
      expect(blocked.allowed).toBe(false)
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
    })

    it('resets after resetRateLimit()', async () => {
      const ip = makeIp()
      for (let i = 0; i < 5; i++) await checkRateLimit(ip)
      resetRateLimit(ip)
      const result = await checkRateLimit(ip)
      expect(result.allowed).toBe(true)
    })
  })

  describe('checkPublicRateLimit (30/min)', () => {
    it('allows up to 30 requests per namespace', async () => {
      const ip = makeIp()
      for (let i = 0; i < 30; i++) {
        const result = await checkPublicRateLimit(ip, 'test_ns')
        expect(result.allowed).toBe(true)
      }
    })

    it('blocks the 31st request', async () => {
      const ip = makeIp()
      for (let i = 0; i < 30; i++) await checkPublicRateLimit(ip, 'test_ns2')
      const blocked = await checkPublicRateLimit(ip, 'test_ns2')
      expect(blocked.allowed).toBe(false)
    })

    it('namespaces are independent', async () => {
      const ip = makeIp()
      // Fill one namespace
      for (let i = 0; i < 30; i++) await checkPublicRateLimit(ip, 'ns_a')
      // Different namespace should still be open
      const result = await checkPublicRateLimit(ip, 'ns_b')
      expect(result.allowed).toBe(true)
    })
  })

  describe('checkCheckoutRateLimit (10/10min)', () => {
    it('allows exactly 10 checkout attempts', async () => {
      const ip = makeIp()
      for (let i = 0; i < 10; i++) {
        const result = await checkCheckoutRateLimit(ip)
        expect(result.allowed).toBe(true)
      }
    })

    it('blocks the 11th checkout attempt', async () => {
      const ip = makeIp()
      for (let i = 0; i < 10; i++) await checkCheckoutRateLimit(ip)
      const blocked = await checkCheckoutRateLimit(ip)
      expect(blocked.allowed).toBe(false)
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
    })
  })
})
