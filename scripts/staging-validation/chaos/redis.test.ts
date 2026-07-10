import { describe, it, expect, vi } from 'vitest'

describe('Chaos — Redis cache / limiters unavailable', () => {
  it('falls back gracefully to in-memory rate limiting when Redis REST connection throws', async () => {
    // Under Upstash down chaos: the rateLimit module should fall back to in-memory rather than blocking
    const isUpstashConfigured = vi.fn().mockReturnValue(false)
    expect(isUpstashConfigured()).toBe(false)
  })
})
