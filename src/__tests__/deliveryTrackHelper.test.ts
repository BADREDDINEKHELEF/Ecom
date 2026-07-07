import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest'
import { dispatchTrack } from '@/lib/delivery/dispatch'

describe('dispatchTrack carrier response parser tests', () => {
  let fetchSpy: MockInstance

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('yalidine tracking maps nested response correctly', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        total: 1,
        data: [
          {
            tracking: 'YAL123456',
            status: 'Livré',
            status_detail: 'Livré au client final',
          }
        ]
      }),
    } as Response)

    const res = await dispatchTrack('yalidine', 'YAL123456', {
      yalidine_api_id: 'test-id',
      yalidine_api_token: 'test-tk',
    })

    expect(res).toEqual({
      status: 'delivered',
      detail: 'Livré au client final',
    })
  })

  it('apec tracking maps nested response correctly', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            tracking: 'APEC98765',
            status: 'En transit',
            status_detail: 'En transit vers centre de tri',
          }
        ]
      }),
    } as Response)

    const res = await dispatchTrack('apec', 'APEC98765', {
      apec_api_id: 'test-id',
      apec_api_token: 'test-tk',
    })

    expect(res).toEqual({
      status: 'in_transit',
      detail: 'En transit vers centre de tri',
    })
  })

  it('procolis tracking maps Colis nested response correctly', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        Colis: [
          {
            Statut: 'Echec',
          }
        ]
      }),
    } as Response)

    const res = await dispatchTrack('procolis', 'PROCOLIS111', {
      procolis_token: 'test-token',
    })

    expect(res).toEqual({
      status: 'failed',
      detail: 'Echec',
    })
  })

  it('zr tracking maps direct response correctly', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        Etat: 'Prêt à expédier',
      }),
    } as Response)

    const res = await dispatchTrack('zr', 'ZR222', {
      zr_token: 'test-token',
    })

    expect(res).toEqual({
      status: 'pending',
      detail: 'Prêt à expédier',
    })
  })
})
