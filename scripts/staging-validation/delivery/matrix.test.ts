import { describe, it, expect } from 'vitest'
import { normalizeProviderStatus } from '@/lib/delivery/dispatch'

describe('Delivery Matrix Provider Status Mapping', () => {
  const statusMappings = [
    { raw: 'livre', expected: 'delivered' },
    { raw: 'retourne', expected: 'returned' },
    { raw: 'en_cours_de_livraison', expected: 'out_for_delivery' },
    { raw: 'en_transit', expected: 'in_transit' },
    { raw: 'ramasse', expected: 'picked_up' },
    { raw: 'echoue', expected: 'failed' },
    { raw: 'annule', expected: 'cancelled' },
    { raw: 'pret_a_expedier', expected: 'pending' },
    { raw: 'unknown_raw_state', expected: 'unknown' },
  ]

  for (const { raw, expected } of statusMappings) {
    it(`maps raw provider status "${raw}" to normalized "${expected}"`, () => {
      expect(normalizeProviderStatus(raw)).toBe(expected)
    })
  }
})
