import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/delivery/client', () => ({
  deliveryFetch: vi.fn().mockRejectedValue(new Error('Network offline')),
}))

describe('Chaos — Delivery provider throws / timeouts', () => {
  it('falls back to static shipping pricing if Yalidine quote API fails (network offline)', async () => {
    const { dispatchGetRate } = await import('@/lib/delivery/dispatch')
    
    // Injected mock throwing a network exception
    const mockCreds = { yalidine_api_id: 'bad-id', yalidine_api_token: 'bad-token' }
    const rate = await dispatchGetRate('yalidine', 'Alger', mockCreds, true)
    
    // Should fall back to null / static cost resolver gracefully
    expect(rate).toBeNull()
  })
})
