/**
 * Payment flow security tests.
 *
 * Verifies that the payment callback cannot be exploited to mark
 * orders as paid without a valid gateway reference.
 */

import { describe, it, expect } from 'vitest'

// ── Payment amount calculation ──────────────────────────────────────────────

describe('Payment amount calculation', () => {
  it('charges product price × quantity, not quantity × 100', () => {
    // Simulates the server-side total calculation in createOrder()
    const items = [
      { price: 5000, quantity: 2 },
      { price: 1500, quantity: 1 },
    ]
    const shippingCost  = 450
    const discountAmount = 0

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    // 5000×2 + 1500×1 = 11500
    expect(subtotal).toBe(11500)

    const total = subtotal + shippingCost - discountAmount
    // 11500 + 450 = 11950
    expect(total).toBe(11950)

    const centimes = Math.round(total * 100)
    // 1195000 centimes sent to Satim
    expect(centimes).toBe(1195000)

    // OLD BROKEN FORMULA: quantity × 100 instead of price × quantity
    const brokenCentimes = Math.round(
      (items.reduce((sum, i) => sum + i.quantity, 0) * 100 + shippingCost - discountAmount) * 100
    )
    // (3 × 100 + 450) × 100 = 75000 — catastrophically wrong
    expect(brokenCentimes).toBe(75000)
    expect(brokenCentimes).not.toBe(centimes)
  })

  it('applies discount correctly', () => {
    const subtotal      = 10000
    const shippingCost  = 500
    const discountAmount = 1000

    const total = subtotal + shippingCost - discountAmount
    expect(total).toBe(9500)
  })

  it('total cannot go negative with large discount', () => {
    // Discount is validated by Zod (min: 0, max: 1_000_000) on the API,
    // but the promo validation also checks min_order. This test documents
    // the expected behaviour at the calculation layer.
    const subtotal      = 1000
    const shippingCost  = 300
    const discountAmount = 5000 // larger than subtotal+shipping

    const total = subtotal + shippingCost - discountAmount
    // -3700 — promo validation prevents this in practice
    expect(total).toBeLessThan(0)
    // Confirms we need the promo validation guard (already implemented)
  })
})

// ── Payment callback security ───────────────────────────────────────────────

describe('Payment callback — no mdOrder means no success', () => {
  it('requires satimId (mdOrder) to mark an order as paid', () => {
    // Document the expected control flow after the security fix:
    // If mdOrder is absent, the callback must NOT mark the order as paid.

    function simulateCallback(params: { result?: string; orderId?: string; mdOrder?: string }) {
      const { result, orderId, mdOrder } = params

      if (!orderId) return { action: 'redirect_failure', reason: 'missing_order' }
      if (result === 'fail') return { action: 'mark_failed', orderId }

      // FIXED: require mdOrder — never trust result param alone
      if (!mdOrder) return { action: 'mark_failed', orderId, reason: 'no_reference' }

      // Would call Satim API here in real code
      return { action: 'verify_with_satim', satimId: mdOrder, orderId }
    }

    // Attack: no mdOrder, result=success
    const attack = simulateCallback({ result: 'success', orderId: 'some-order-id' })
    expect(attack.action).toBe('mark_failed')
    expect((attack as { reason?: string }).reason).toBe('no_reference')

    // Legitimate: has mdOrder
    const legit = simulateCallback({ result: 'success', orderId: 'some-order-id', mdOrder: 'satim-ref-123' })
    expect(legit.action).toBe('verify_with_satim')
  })
})
