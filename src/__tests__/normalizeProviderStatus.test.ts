import { describe, it, expect, vi, afterEach } from 'vitest'
import { normalizeProviderStatus } from '@/lib/delivery/dispatch'

describe('normalizeProviderStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps "delivered" to delivered', () => {
    expect(normalizeProviderStatus('delivered')).toBe('delivered')
  })

  it('maps French "livré" to delivered', () => {
    expect(normalizeProviderStatus('livré')).toBe('delivered')
  })

  it('maps numeric "4" to delivered', () => {
    expect(normalizeProviderStatus('4')).toBe('delivered')
  })

  it('maps "returned" to returned', () => {
    expect(normalizeProviderStatus('returned')).toBe('returned')
  })

  it('maps "retour" to returned', () => {
    expect(normalizeProviderStatus('retour')).toBe('returned')
  })

  it('maps numeric "5" to returned', () => {
    expect(normalizeProviderStatus('5')).toBe('returned')
  })

  it('maps "out_for_delivery" to out_for_delivery', () => {
    expect(normalizeProviderStatus('out_for_delivery')).toBe('out_for_delivery')
  })

  it('maps "en_livraison" to out_for_delivery', () => {
    expect(normalizeProviderStatus('en livraison')).toBe('out_for_delivery')
  })

  it('maps "in_transit" to in_transit', () => {
    expect(normalizeProviderStatus('in_transit')).toBe('in_transit')
  })

  it('maps "dispatched" to in_transit', () => {
    expect(normalizeProviderStatus('dispatched')).toBe('in_transit')
  })

  it('maps "picked_up" to picked_up', () => {
    expect(normalizeProviderStatus('picked_up')).toBe('picked_up')
  })

  it('maps "ramassé" to picked_up', () => {
    expect(normalizeProviderStatus('ramassé')).toBe('picked_up')
  })

  it('maps "failed" to failed', () => {
    expect(normalizeProviderStatus('failed')).toBe('failed')
  })

  it('maps "cancelled" to cancelled', () => {
    expect(normalizeProviderStatus('cancelled')).toBe('cancelled')
  })

  it('maps "annulé" to cancelled', () => {
    expect(normalizeProviderStatus('annulé')).toBe('cancelled')
  })

  it('maps "pending" to pending', () => {
    expect(normalizeProviderStatus('pending')).toBe('pending')
  })

  it('maps "created" to pending', () => {
    expect(normalizeProviderStatus('created')).toBe('pending')
  })

  it('maps numeric "0" to pending', () => {
    expect(normalizeProviderStatus('0')).toBe('pending')
  })

  it('maps unknown status to in_transit with a warning', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(normalizeProviderStatus('something_new')).toBe('in_transit')
    expect(console.warn).toHaveBeenCalled()
  })

  it('handles null/undefined gracefully', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(normalizeProviderStatus(null)).toBe('in_transit')
    expect(normalizeProviderStatus(undefined)).toBe('in_transit')
  })
})
