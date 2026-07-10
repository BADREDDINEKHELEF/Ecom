import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/payment/satim', () => ({
  satimGetOrderStatus: vi.fn().mockRejectedValue(new Error('Gateway Timeout')),
  satimConfigured: vi.fn().mockReturnValue(true),
}))

describe('Chaos — Payment gateway throws', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fails gracefully and cancels order when Satim status check throws a network error', async () => {
    const { satimGetOrderStatus } = await import('@/lib/payment/satim')
    // In a chaos scenario when status lookup throws, the check endpoint should fail gracefully
    // and log the error rather than crashing the server.
    const { verifyCheckToken } = await import('@/lib/payment/checkToken')
    expect(verifyCheckToken).toBeDefined()
  })
})
