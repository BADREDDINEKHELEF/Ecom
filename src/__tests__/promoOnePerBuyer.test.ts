/**
 * Promo code one-per-buyer enforcement tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))

describe('validatePromoCode — one per buyer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReset()
  })

  const promo = {
    id: 'promo-1',
    code: 'ONCE',
    discount_type: 'fixed' as const,
    discount_value: 500,
    min_order: 0,
    max_uses: null,
    uses_count: 0,
    expires_at: null,
    is_active: true,
    one_per_buyer: true,
    created_at: new Date().toISOString(),
  }

  function buildChain(finalValue: unknown) {
    const chain: Record<string, unknown> = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(finalValue),
      single: vi.fn().mockResolvedValue(finalValue),
    }
    return chain
  }

  it('rejects the code for an authenticated user who already used it', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'promo_codes') return buildChain({ data: promo, error: null })
      if (table === 'orders') return buildChain({ data: { id: 'order-used' }, error: null })
      return {}
    })

    const { validatePromoCode } = await import('../lib/supabase/promo')
    const result = await validatePromoCode('ONCE', 1000, 'user-123')
    expect(result).toEqual({ valid: false, message: 'already_used' })
  })

  it('rejects the code for a guest whose phone already used it', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'promo_codes') return buildChain({ data: promo, error: null })
      if (table === 'orders') return buildChain({ data: { id: 'order-guest-phone' }, error: null })
      return {}
    })

    const { validatePromoCode } = await import('../lib/supabase/promo')
    const result = await validatePromoCode('ONCE', 1000, undefined, '+213551234567')
    expect(result).toEqual({ valid: false, message: 'already_used' })
  })

  it('rejects the code for a guest whose email already used it', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'promo_codes') return buildChain({ data: promo, error: null })
      if (table === 'orders') return buildChain({ data: { id: 'order-guest-email' }, error: null })
      return {}
    })

    const { validatePromoCode } = await import('../lib/supabase/promo')
    const result = await validatePromoCode('ONCE', 1000, undefined, undefined, 'guest@example.com')
    expect(result).toEqual({ valid: false, message: 'already_used' })
  })

  it('accepts the code when the buyer has not used it before', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'promo_codes') return buildChain({ data: promo, error: null })
      if (table === 'orders') return buildChain({ data: null, error: null })
      return {}
    })

    const { validatePromoCode } = await import('../lib/supabase/promo')
    const result = await validatePromoCode('ONCE', 1000, 'user-456', '+213551234567', 'guest@example.com')
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.discountAmount).toBe(500)
    }
  })
})
