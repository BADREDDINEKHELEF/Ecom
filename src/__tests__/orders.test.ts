import { describe, it, expect } from 'vitest'

// ── Order status transition rules (mirrors seller/orders route) ───────────────

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

const SELLER_ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['shipped',   'cancelled'],
  shipped:   ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return SELLER_ALLOWED_TRANSITIONS[from].includes(to)
}

describe('Order status transitions', () => {
  it('pending → confirmed is allowed', () => {
    expect(canTransition('pending', 'confirmed')).toBe(true)
  })

  it('pending → cancelled is allowed', () => {
    expect(canTransition('pending', 'cancelled')).toBe(true)
  })

  it('confirmed → shipped is allowed', () => {
    expect(canTransition('confirmed', 'shipped')).toBe(true)
  })

  it('shipped → delivered is allowed', () => {
    expect(canTransition('shipped', 'delivered')).toBe(true)
  })

  it('shipped → cancelled is allowed', () => {
    expect(canTransition('shipped', 'cancelled')).toBe(true)
  })

  it('pending → shipped is NOT allowed (must go through confirmed)', () => {
    expect(canTransition('pending', 'shipped')).toBe(false)
  })

  it('pending → delivered is NOT allowed', () => {
    expect(canTransition('pending', 'delivered')).toBe(false)
  })

  it('delivered → cancelled is NOT allowed (terminal state)', () => {
    expect(canTransition('delivered', 'cancelled')).toBe(false)
  })

  it('cancelled → confirmed is NOT allowed (terminal state)', () => {
    expect(canTransition('cancelled', 'confirmed')).toBe(false)
  })

  it('delivered → shipped is NOT allowed (no going back)', () => {
    expect(canTransition('delivered', 'shipped')).toBe(false)
  })
})

// ── Total calculation ────────────────────────────────────────────────────────

interface OrderItem { price: number; quantity: number }

function calculateTotal(items: OrderItem[], shippingCost: number, discountAmount: number): number {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  return subtotal + shippingCost - discountAmount
}

describe('Order total calculation', () => {
  it('sums item price × quantity correctly', () => {
    const items = [{ price: 2500, quantity: 2 }, { price: 1000, quantity: 3 }]
    expect(calculateTotal(items, 0, 0)).toBe(8000) // 5000 + 3000
  })

  it('adds shipping cost', () => {
    const items = [{ price: 5000, quantity: 1 }]
    expect(calculateTotal(items, 450, 0)).toBe(5450)
  })

  it('subtracts discount', () => {
    const items = [{ price: 10000, quantity: 1 }]
    expect(calculateTotal(items, 500, 1000)).toBe(9500)
  })

  it('handles zero shipping and zero discount', () => {
    const items = [{ price: 3000, quantity: 1 }]
    expect(calculateTotal(items, 0, 0)).toBe(3000)
  })

  it('Satim centimes = total × 100 (integer)', () => {
    const items = [{ price: 5000, quantity: 2 }, { price: 1500, quantity: 1 }]
    const total = calculateTotal(items, 450, 0) // 11950 DZD
    const centimes = Math.round(total * 100)
    expect(centimes).toBe(1195000)
  })

  it('single-item quantity=1 does NOT produce quantity×100 (regression guard)', () => {
    const items = [{ price: 4500, quantity: 1 }]
    const total = calculateTotal(items, 300, 0) // 4800
    const centimes = Math.round(total * 100)
    expect(centimes).toBe(480000)
    // The old broken formula: quantity * 100 = 100 centimes = 1 DZD
    expect(centimes).not.toBe(100)
  })
})

// ── Stock check guard (mirrors createOrder logic) ────────────────────────────

interface StockItem { productId: string; available: number; requested: number }

function checkStock(items: StockItem[]): { ok: boolean; failed?: string } {
  for (const item of items) {
    if (item.requested > item.available) {
      return { ok: false, failed: item.productId }
    }
  }
  return { ok: true }
}

describe('Stock validation', () => {
  it('passes when all items are in stock', () => {
    const items = [
      { productId: 'p1', available: 10, requested: 2 },
      { productId: 'p2', available: 5,  requested: 5 },
    ]
    expect(checkStock(items)).toEqual({ ok: true })
  })

  it('fails when any item exceeds available stock', () => {
    const items = [
      { productId: 'p1', available: 10, requested: 2 },
      { productId: 'p2', available: 3,  requested: 5 },
    ]
    const result = checkStock(items)
    expect(result.ok).toBe(false)
    expect(result.failed).toBe('p2')
  })

  it('passes at exact stock boundary (requested === available)', () => {
    const items = [{ productId: 'p1', available: 3, requested: 3 }]
    expect(checkStock(items)).toEqual({ ok: true })
  })

  it('fails when requested is one more than available', () => {
    const items = [{ productId: 'p1', available: 3, requested: 4 }]
    expect(checkStock(items).ok).toBe(false)
  })

  it('passes for empty cart (edge case)', () => {
    expect(checkStock([])).toEqual({ ok: true })
  })
})

// ── Shipping cost resolution logic (mirrors resolveShippingCost) ─────────────

interface LiveRates { homeDelivery: number; deskDelivery: number | null }

function mockResolveShippingCost(
  isStopDesk: boolean,
  rates: LiveRates,
  staticCost: number
): number {
  const deliveryRate = (isStopDesk && rates.deskDelivery != null) ? rates.deskDelivery : rates.homeDelivery
  return deliveryRate ?? staticCost
}

describe('Shipping cost resolution', () => {
  const rates = { homeDelivery: 500, deskDelivery: 300 }

  it('resolves to desk rate if isStopDesk is true and desk rate is available', () => {
    expect(mockResolveShippingCost(true, rates, 450)).toBe(300)
  })

  it('resolves to home rate if isStopDesk is false', () => {
    expect(mockResolveShippingCost(false, rates, 450)).toBe(500)
  })

  it('falls back to home rate if isStopDesk is true but desk rate is null', () => {
    const ratesNoDesk = { homeDelivery: 500, deskDelivery: null }
    expect(mockResolveShippingCost(true, ratesNoDesk, 450)).toBe(500)
  })
})

describe('Shipping cost resolution with deliveryType', () => {
  const rates = { homeDelivery: 500, deskDelivery: 300 }

  it('resolves homeDelivery for "home" type', () => {
    const isStopDesk = false // derived from "home"
    expect(mockResolveShippingCost(isStopDesk, rates, 450)).toBe(500)
  })

  it('resolves homeDelivery for "office" type', () => {
    const isStopDesk = false // derived from "office"
    expect(mockResolveShippingCost(isStopDesk, rates, 450)).toBe(500)
  })

  it('resolves deskDelivery for "stop_desk" type', () => {
    const isStopDesk = true // derived from "stop_desk"
    expect(mockResolveShippingCost(isStopDesk, rates, 450)).toBe(300)
  })
})


