import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest'
import { deliveryFetch } from '@/lib/delivery/client'
import { splitName, extractRates, normalizeAlgiersPhone, findWilayaRow } from '@/lib/delivery/utils'

// Import providers to verify mapping works end-to-end
import { yalidineCreateShipmentWithCreds, yalidineGetRateWithCreds } from '@/lib/delivery/yalidine'
import { zrCreateShipmentWithToken, zrGetRateWithToken } from '@/lib/delivery/zrexpress'
import { maystroCreateShipmentWithToken, maystroGetRateWithToken } from '@/lib/delivery/maystro'
import { procolisCreateShipmentWithToken, procolisGetRateWithToken } from '@/lib/delivery/procolis'
import { colivraisonCreateShipmentWithToken, colivraisonGetRateWithToken } from '@/lib/delivery/colivraison'
import { rexCreateShipmentWithToken, rexGetRateWithToken } from '@/lib/delivery/rex'
import { yassirCreateShipmentWithKey } from '@/lib/delivery/yassir'
import { ecomCreateShipmentWithToken, ecomGetRateWithToken } from '@/lib/delivery/ecom'
import { apecCreateShipmentWithCreds, apecGetRateWithCreds } from '@/lib/delivery/apec'

describe('deliveryFetch client tests', () => {
  let fetchSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves directly on 200 OK', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as Response)

    const res = await deliveryFetch('https://example.com/api', {}, 5000)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('retries transient 5xx errors and eventually succeeds', async () => {
    fetchSpy
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok' }),
      } as Response)

    const res = await deliveryFetch('https://example.com/api', {
      maxRetries: 3,
      initialDelayMs: 1,
      backoffFactor: 2,
    }, 5000)

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('ok')
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it('stops retrying and returns response when max retries exceeded', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 503,
    } as Response)

    const res = await deliveryFetch('https://example.com/api', {
      maxRetries: 3,
      initialDelayMs: 1,
      backoffFactor: 2,
    }, 5000)

    expect(res.status).toBe(503)
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it('retries on network error / timeout and eventually throws after exhausting retries', async () => {
    fetchSpy.mockRejectedValue(new Error('Network failure'))

    await expect(
      deliveryFetch('https://example.com/api', {
        maxRetries: 3,
        initialDelayMs: 1,
        backoffFactor: 2,
      }, 5000)
    ).rejects.toThrow('Network failure')

    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })
})

describe('Delivery utility tests', () => {
  it('splits full name into first and family name', () => {
    expect(splitName('John Doe')).toEqual({ firstname: 'John', familyname: 'Doe' })
    expect(splitName('John Middle Doe')).toEqual({ firstname: 'John', familyname: 'Middle Doe' })
    expect(splitName('SingleName')).toEqual({ firstname: 'SingleName', familyname: 'SingleName' })
    expect(splitName('  Spaces  Around  ')).toEqual({ firstname: 'Spaces', familyname: 'Around' })
  })

  it('normalizes Algerian phone numbers', () => {
    expect(normalizeAlgiersPhone('+213 551 23 45 67')).toBe('0551234567')
    expect(normalizeAlgiersPhone('213661234567')).toBe('0661234567')
    expect(normalizeAlgiersPhone('0771234567')).toBe('0771234567')
    expect(normalizeAlgiersPhone('0551-234-567')).toBe('0551234567')
  })

  it('extracts home and stop-desk rates', () => {
    const rawRates = {
      tarif_a_domicile: '500',
      tarif_stopdesk: '300',
    }
    expect(extractRates(rawRates)).toEqual({ homeDelivery: 500, deskDelivery: 300 })

    const alternativeRates = {
      domicile: 600,
      bureau: 400,
    }
    expect(extractRates(alternativeRates)).toEqual({ homeDelivery: 600, deskDelivery: 400 })

    const onlyHomeRates = {
      price: 450,
    }
    expect(extractRates(onlyHomeRates)).toEqual({ homeDelivery: 450 })

    expect(extractRates(null)).toBeNull()
    expect(extractRates({})).toBeNull()
  })

  it('finds correct wilaya row in flat objects or arrays', () => {
    // 1. Flat object
    const flat = { home_fee: 500 }
    expect(findWilayaRow(flat, 'Alger')).toEqual(flat)

    // 2. Data array containing the target wilaya
    const dataArray = {
      data: [
        { wilaya_name: 'Oran', home_fee: 600 },
        { wilaya: 'Alger', home_fee: 400 },
        { name: 'Blida', home_fee: 300 }
      ]
    }
    expect(findWilayaRow(dataArray, 'Alger')).toEqual({ wilaya: 'Alger', home_fee: 400 })
    expect(findWilayaRow(dataArray, 'oran')).toEqual({ wilaya_name: 'Oran', home_fee: 600 })
    expect(findWilayaRow(dataArray, '  BLIDA  ')).toEqual({ name: 'Blida', home_fee: 300 })

    // 3. Results array format
    const resultsArray = {
      results: [
        { to_wilaya_name: 'Tipaza', home_fee: 450 }
      ]
    }
    expect(findWilayaRow(resultsArray, 'Tipaza')).toEqual({ to_wilaya_name: 'Tipaza', home_fee: 450 })

    // 4. Return null if not found (avoid silently defaulting to the first row)
    expect(findWilayaRow(dataArray, 'UnknownWilaya')).toBeNull()
  })
})

describe('E2E Provider Payload Mapping', () => {
  let fetchSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('yalidine shipment creation maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        tracking: 'YAL123456',
        label: 'https://yalidine.app/labels/YAL123456.pdf',
      }),
    } as Response)

    const res = await yalidineCreateShipmentWithCreds(
      {
        orderId: 'order-1',
        fullName: 'Client Name',
        phone: '0551234567',
        address: '123 St',
        city: 'Alger',
        wilaya: 'Alger',
        total: 1500,
        isStopDesk: false,
      },
      'apiId',
      'apiToken'
    )

    expect(res).toEqual({
      tracking: 'YAL123456',
      labelUrl: 'https://yalidine.app/labels/YAL123456.pdf',
    })
  })

  it('yalidine rate fetch maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ home_fee: 600, desk_fee: 400 }],
      }),
    } as Response)

    const res = await yalidineGetRateWithCreds('Alger', 'apiId', 'apiToken')
    expect(res).toEqual({
      homeDelivery: 600,
      deskDelivery: 400,
    })
  })

  it('zr shipment creation maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        codsv: 'ZR123456',
      }),
    } as Response)

    const res = await zrCreateShipmentWithToken(
      {
        orderId: 'order-1',
        fullName: 'Client Name',
        phone: '0551234567',
        address: '123 St',
        city: 'Alger',
        wilaya: 'Alger',
        total: 1500,
      },
      'token'
    )

    expect(res).toEqual({ tracking: 'ZR123456' })
  })

  it('zr rate fetch maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [{ domicile_fee: 550, stop_desk_fee: 350 }],
    } as Response)

    const res = await zrGetRateWithToken('Alger', 'token')
    expect(res).toEqual({ homeDelivery: 550, deskDelivery: 350 })
  })

  it('maystro shipment creation maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        tracking_code: 'MAY123',
        label_url: 'https://maystro.com/label.pdf',
      }),
    } as Response)

    const res = await maystroCreateShipmentWithToken(
      {
        orderId: 'order-1',
        fullName: 'Client Name',
        phone: '0551234567',
        address: '123 St',
        city: 'Alger',
        wilaya: 'Alger',
        total: 1500,
      },
      'token'
    )

    expect(res).toEqual({
      tracking: 'MAY123',
      labelUrl: 'https://maystro.com/label.pdf',
    })
  })

  it('maystro rate fetch maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        results: [{ home_delivery_fee: 700, desk_delivery_fee: 500 }],
      }),
    } as Response)

    const res = await maystroGetRateWithToken('Alger', 'token')
    expect(res).toEqual({ homeDelivery: 700, deskDelivery: 500 })
  })

  it('procolis shipment creation maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        Colis: [{ code_suivi: 'PRO123', bon_livraison: 'https://procolis.com/bon.pdf' }],
      }),
    } as Response)

    const res = await procolisCreateShipmentWithToken(
      {
        orderId: 'order-1',
        fullName: 'Client Name',
        phone: '0551234567',
        address: '123 St',
        city: 'Alger',
        wilaya: 'Alger',
        total: 1500,
      },
      'token'
    )

    expect(res).toEqual({
      tracking: 'PRO123',
      labelUrl: 'https://procolis.com/bon.pdf',
    })
  })

  it('procolis rate fetch maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        home_fee: 650,
        desk_fee: 450,
      }),
    } as Response)

    const res = await procolisGetRateWithToken('Alger', 'token')
    expect(res).toEqual({ homeDelivery: 650, deskDelivery: 450 })
  })

  it('colivraison shipment creation maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        tracking_code: 'COL123',
        bon_url: 'https://colivraison.com/bon.pdf',
      }),
    } as Response)

    const res = await colivraisonCreateShipmentWithToken(
      {
        orderId: 'order-1',
        fullName: 'Client Name',
        phone: '0551234567',
        address: '123 St',
        city: 'Alger',
        wilaya: 'Alger',
        total: 1500,
      },
      'token'
    )

    expect(res).toEqual({
      tracking: 'COL123',
      labelUrl: 'https://colivraison.com/bon.pdf',
    })
  })

  it('colivraison rate fetch maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ home_fee: 600, stop_desk_fee: 400 }],
      }),
    } as Response)

    const res = await colivraisonGetRateWithToken('Alger', 'token')
    expect(res).toEqual({ homeDelivery: 600, deskDelivery: 400 })
  })

  it('rex shipment creation maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        tracking_code: 'REX123',
        label_url: 'https://rex.com/label.pdf',
      }),
    } as Response)

    const res = await rexCreateShipmentWithToken(
      {
        orderId: 'order-1',
        fullName: 'Client Name',
        phone: '0551234567',
        address: '123 St',
        city: 'Alger',
        wilaya: 'Alger',
        total: 1500,
      },
      'token'
    )

    expect(res).toEqual({
      tracking: 'REX123',
      labelUrl: 'https://rex.com/label.pdf',
    })
  })

  it('rex rate fetch maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ price: 580, stop_desk_fee: 380 }],
      }),
    } as Response)

    const res = await rexGetRateWithToken('Alger', 'token')
    expect(res).toEqual({ homeDelivery: 580, deskDelivery: 380 })
  })

  it('yassir shipment creation maps response', async () => {
    process.env.YASSIR_SENDER_NAME = 'Sender'
    process.env.YASSIR_SENDER_PHONE = '0551234567'
    process.env.YASSIR_SENDER_ADDRESS = 'Address'

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        tracking_number: 'YAS123',
      }),
    } as Response)

    const res = await yassirCreateShipmentWithKey(
      {
        orderId: 'order-1',
        fullName: 'Client Name',
        phone: '0551234567',
        address: '123 St',
        city: 'Alger',
        wilaya: 'Alger',
        total: 1500,
      },
      'apiKey'
    )

    expect(res).toEqual({
      tracking: 'YAS123',
      labelUrl: undefined,
    })
  })

  it('ecom shipment creation maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        tracking: 'ECO123',
      }),
    } as Response)

    const res = await ecomCreateShipmentWithToken(
      {
        orderId: 'order-1',
        fullName: 'Client Name',
        phone: '0551234567',
        address: '123 St',
        city: 'Alger',
        wilaya: 'Alger',
        total: 1500,
      },
      'key',
      'token'
    )

    expect(res).toEqual({
      tracking: 'ECO123',
      labelUrl: undefined,
    })
  })

  it('ecom rate fetch maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ wilaya: 'Alger', home_fee: 550, desk_fee: 350 }],
      }),
    } as Response)

    const res = await ecomGetRateWithToken('Alger', 'key', 'token')
    expect(res).toEqual({ homeDelivery: 550, deskDelivery: 350 })
  })

  it('apec shipment creation maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        tracking: 'APC123',
      }),
    } as Response)

    const res = await apecCreateShipmentWithCreds(
      {
        orderId: 'order-1',
        fullName: 'Client Name',
        phone: '0551234567',
        address: '123 St',
        city: 'Alger',
        wilaya: 'Alger',
        total: 1500,
      },
      'apiId',
      'apiToken'
    )

    expect(res).toEqual({
      tracking: 'APC123',
      labelUrl: undefined,
    })
  })

  it('apec rate fetch maps response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [{ home_fee: 590, desk_fee: 390 }],
      }),
    } as Response)

    const res = await apecGetRateWithCreds('Alger', 'apiId', 'apiToken')
    expect(res).toEqual({ homeDelivery: 590, deskDelivery: 390 })
  })
})
