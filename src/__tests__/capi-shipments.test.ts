import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { fireTikTokPurchase } from '@/lib/analytics/server'

// Mock rate limiting
vi.mock('@/lib/auth/rateLimit', () => ({
  checkSellerRateLimit: () => Promise.resolve({ allowed: true }),
  checkUserDualRateLimit: () => Promise.resolve({ allowed: true }),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock dispatchShipment and dispatchGetRate
const mockDispatchShipment = vi.fn().mockResolvedValue({
  tracking: 'TRK123',
  labelUrl: 'http://label',
  requiresManual: false,
})
const mockDispatchGetRate = vi.fn().mockResolvedValue({
  homeDelivery: 450,
  provider: 'yalidine',
})

vi.mock('@/lib/delivery/dispatch', () => ({
  dispatchShipment: (...args: unknown[]) => mockDispatchShipment(...args),
  dispatchGetRate: (...args: unknown[]) => mockDispatchGetRate(...args),
  normalizeProviderStatus: (raw: unknown) => String(raw),
}))

// Mock server helpers
vi.mock('@/lib/supabase/server', () => ({
  copyCookies: (_response: Response, result: Response) => result,
}))

// Mock vendor auth — the route now delegates auth/permission to requireVendorPermission
vi.mock('@/lib/auth/vendorAuth', () => ({
  requireVendorPermission: () => Promise.resolve({
    ctx: { user: { id: 'u-123' }, vendor: { id: 'v-123' }, role: 'owner' },
  }),
}))

// Mock vendor helpers
vi.mock('@/lib/supabase/vendors', () => ({
  getVendorDeliveryConfig: () => Promise.resolve({
    vendor_id: 'v-123',
    default_provider: 'yalidine',
    yalidine_api_id: 'api-id',
    yalidine_api_token: 'api-token',
  }),
}))

// Mock mutation queries
const mockCreateShipment = vi.fn().mockResolvedValue({ id: 'ship-123' })
const mockUpdateShippingInfo = vi.fn().mockResolvedValue(null)
const mockUpdateOrderStatus = vi.fn().mockResolvedValue(null)

vi.mock('@/lib/supabase/queries', () => ({
  createShipment: (...args: unknown[]) => mockCreateShipment(...args),
  updateShippingInfo: (...args: unknown[]) => mockUpdateShippingInfo(...args),
  updateOrderStatus: (...args: unknown[]) => mockUpdateOrderStatus(...args),
  getVendorDeliveryConfig: () => Promise.resolve({
    vendor_id: 'v-123',
    default_provider: 'yalidine',
    yalidine_api_id: 'api-id',
    yalidine_api_token: 'api-token',
  }),
}))

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}))

describe('TikTok CAPI and Seller Shipments Product List Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockFrom.mockReset()
    mockDispatchShipment.mockReset()
    mockDispatchGetRate.mockReset()
    mockCreateShipment.mockReset()
    mockUpdateShippingInfo.mockReset()
    mockUpdateOrderStatus.mockReset()
  })

  it('fireTikTokPurchase formats, anonymizes IP, and includes User Agent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    global.fetch = fetchMock

    await fireTikTokPurchase({
      pixelId: 'tt-123',
      accessToken: 'tok-123',
      orderId: 'order-abc',
      total: 1500,
      items: [{ id: 'p-1', name: 'Item 1', price: 1500, quantity: 1 }],
      email: 'buyer@example.com',
      phone: '0555123456',
      clientIp: '197.112.56.78',
      clientUserAgent: 'Mozilla/5.0 (Windows NT 10.0)',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://business-api.tiktok.com/open_api/v1.3/event/track/')
    expect(init.method).toBe('POST')
    expect(init.headers['Access-Token']).toBe('tok-123')

    const body = JSON.parse(init.body)
    expect(body.pixel_code).toBe('tt-123')
    expect(body.events[0].event).toBe('CompletePayment')
    expect(body.events[0].event_id).toBe('order-abc')
    
    // Check that IP is forwarded raw
    expect(body.events[0].user.ip).toBe('197.112.56.78')
    expect(body.events[0].user.user_agent).toBe('Mozilla/5.0 (Windows NT 10.0)')
  })

  it('POST /api/seller/shipments retrieves order items and passes formatted product list to dispatchShipment', async () => {
    mockDispatchShipment.mockResolvedValue({
      tracking: 'TRK123',
      labelUrl: 'http://label',
      requiresManual: false,
    })
    mockDispatchGetRate.mockResolvedValue({
      homeDelivery: 450,
      provider: 'yalidine',
    })

    const mockOrderItems = [
      { product_name: 'Product A', quantity: 2 },
      { product_name: 'Product B', quantity: 1 },
    ]

    mockFrom.mockImplementation((table) => {
      if (table === 'orders') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: {
                  full_name: 'Recipient Name',
                  phone: '0555000000',
                  wilaya: 'Alger',
                  city: 'Bab Ezzouar',
                  address: '123 Street',
                  total: 5000,
                  status: 'confirmed',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'order_items') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: mockOrderItems, error: null }),
            }),
          }),
        }
      }
      if (table === 'shipments') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    const { POST } = await import('../app/api/seller/shipments/route')
    const req = new NextRequest('http://localhost/api/seller/shipments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: '46849a65-5154-4ef8-a0e2-e1d93c14c577',
        provider: 'yalidine',
        autoCreate: true,
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    // Verify that dispatchShipment was called with correct items
    expect(mockDispatchShipment).toHaveBeenCalledTimes(1)
    const [providerArg, inputArg] = mockDispatchShipment.mock.calls[0]
    expect(providerArg).toBe('yalidine')
    expect(inputArg.fullName).toBe('Recipient Name')
    expect(inputArg.items).toBe('Product A x 2, Product B x 1')

    // Verify that the delivery_cost from API is written to shipment
    expect(mockCreateShipment).toHaveBeenCalledTimes(1)
    const [createArg] = mockCreateShipment.mock.calls[0]
    expect(createArg.delivery_cost).toBe(450)
  })
})
