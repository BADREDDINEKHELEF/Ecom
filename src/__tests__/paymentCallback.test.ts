/**
 * Payment callback security tests.
 *
 * Covers amount mismatch rejection, idempotency, and financial ledger writes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac, randomUUID } from 'crypto'

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/notifications/email', () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/notifications/whatsapp', () => ({
  notifyOrderConfirmed: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/payment/satim', () => ({
  satimGetOrderStatus: vi.fn(),
  satimConfirmOrder: vi.fn().mockResolvedValue(undefined),
}))

const recordFinancialTransaction = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/supabase/orders', () => ({
  recordFinancialTransaction,
}))

const mockFrom = vi.fn()
const updateCalls: unknown[] = []

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}))

function makeMockFrom(order: Record<string, unknown>) {
  updateCalls.length = 0
  const orderSelectSingle = { data: order, error: null }
  mockFrom.mockImplementation((table: string) => {
    if (table === 'orders') {
      const chain: Record<string, unknown> = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue(orderSelectSingle),
        single: vi.fn().mockResolvedValue(orderSelectSingle),
        select: vi.fn().mockReturnThis(),
        update: vi.fn().mockImplementation((values: unknown) => {
          updateCalls.push(values)
          return chain
        }),
      }
      return chain
    }
    if (table === 'order_items') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
        }),
      }
    }
    return {}
  })
}

function signSatimCallback(params: Record<string, string>, secret: string): string {
  const entries = Object.entries(params).filter(([k]) => k !== 'checksum')
  entries.sort(([a], [b]) => a.localeCompare(b))
  const canonical = new URLSearchParams(entries).toString()
  return createHmac('sha256', secret).update(canonical).digest('hex')
}

function makeCallbackUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams(params)
  return `http://localhost/api/payment/callback?${qs.toString()}`
}

describe('Payment callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('SATIM_SHARED_SECRET', 'shared-secret-for-tests')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.example.com')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
  })

  it('rejects a callback when the reconciled amount does not match the order total', async () => {
    const { GET } = await import('../app/api/payment/callback/route')
    const { satimGetOrderStatus } = await import('@/lib/payment/satim')

    const order = {
      id: '11111111-1111-1111-1111-111111111111',
      status: 'pending_payment',
      payment_status: 'pending_payment',
      total: 5000,
      payment_method: 'satim',
      satim_order_id: null,
      email: null,
      full_name: 'Buyer',
      wilaya: 'Alger',
      is_stopdesk: false,
      stop_desk_cause: null,
    }
    makeMockFrom(order)

    vi.mocked(satimGetOrderStatus).mockResolvedValue({
      orderStatus: 2,
      orderNumber: '11111111-1111-1111-1111-111111111111',
      amount: 499900, // 4999.00 DZD vs expected 500000 centimes
      currency: '012',
    })

    const params = {
      orderId: '11111111-1111-1111-1111-111111111111',
      mdOrder: 'deadbeef-1234-1234-1234-1234567890ab',
      result: 'success',
    }
    const checksum = signSatimCallback(params, 'shared-secret-for-tests')
    const res = await GET(new Request(makeCallbackUrl({ ...params, checksum })) as unknown as import('next/server').NextRequest)

    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('amount_mismatch')

    expect(updateCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'processing_payment' }),
        expect.objectContaining({ status: 'cancelled', payment_status: 'failed' }),
      ]),
    )
    expect(recordFinancialTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: '11111111-1111-1111-1111-111111111111',
        amount: 5000,
        statusAfter: 'cancelled',
        paymentStatusAfter: 'failed',
        paymentMethod: 'satim',
        reason: 'Amount mismatch',
      }),
    )
  })

  it('idempotently redirects to success when the order is already confirmed and paid', async () => {
    const { GET } = await import('../app/api/payment/callback/route')

    const order = {
      id: '22222222-2222-2222-2222-222222222222',
      status: 'confirmed',
      payment_status: 'paid',
      total: 2500,
      payment_method: 'satim',
      satim_order_id: 'cafebabe-1234-1234-1234-1234567890ab',
      email: null,
      full_name: 'Buyer',
      wilaya: 'Alger',
      is_stopdesk: false,
      stop_desk_cause: null,
    }
    makeMockFrom(order)

    const params = {
      orderId: '22222222-2222-2222-2222-222222222222',
      mdOrder: 'cafebabe-1234-1234-1234-1234567890ab',
      result: 'success',
    }
    const checksum = signSatimCallback(params, 'shared-secret-for-tests')
    const res = await GET(new Request(makeCallbackUrl({ ...params, checksum })) as unknown as import('next/server').NextRequest)

    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/payment/success')
    expect(location).not.toContain('amount_mismatch')

    // No status mutation and no ledger write for a duplicate callback.
    expect(updateCalls.length).toBe(0)
    expect(recordFinancialTransaction).not.toHaveBeenCalled()
  })

  it('records a financial transaction when a Satim callback confirms payment', async () => {
    const { GET } = await import('../app/api/payment/callback/route')
    const { satimGetOrderStatus, satimConfirmOrder } = await import('@/lib/payment/satim')

    const order = {
      id: '33333333-3333-3333-3333-333333333333',
      status: 'pending_payment',
      payment_status: 'pending_payment',
      total: 1200,
      payment_method: 'satim',
      satim_order_id: null,
      email: null,
      full_name: 'Buyer',
      wilaya: 'Alger',
      is_stopdesk: false,
      stop_desk_cause: null,
    }
    makeMockFrom(order)

    vi.mocked(satimGetOrderStatus).mockResolvedValue({
      orderStatus: 2,
      orderNumber: '33333333-3333-3333-3333-333333333333',
      amount: 120000, // 1200.00 DZD
      currency: '012',
    })

    const params = {
      orderId: '33333333-3333-3333-3333-333333333333',
      mdOrder: 'baadf00d-1234-1234-1234-1234567890ab',
      result: 'success',
    }
    const checksum = signSatimCallback(params, 'shared-secret-for-tests')
    const res = await GET(new Request(makeCallbackUrl({ ...params, checksum })) as unknown as import('next/server').NextRequest)

    expect(res.status).toBe(307)
    const location = res.headers.get('location') ?? ''
    expect(location).toContain('/payment/success')

    expect(updateCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'processing_payment' }),
        expect.objectContaining({ status: 'confirmed', payment_status: 'paid', satim_order_id: 'baadf00d-1234-1234-1234-1234567890ab' }),
      ]),
    )
    expect(satimConfirmOrder).toHaveBeenCalledWith('baadf00d-1234-1234-1234-1234567890ab')
    expect(recordFinancialTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: '33333333-3333-3333-3333-333333333333',
        amount: 1200,
        statusAfter: 'confirmed',
        paymentStatusAfter: 'paid',
        paymentMethod: 'satim',
        gatewayRef: 'baadf00d-1234-1234-1234-1234567890ab',
        reason: 'Payment confirmed via Satim callback',
      }),
    )
  })
})
