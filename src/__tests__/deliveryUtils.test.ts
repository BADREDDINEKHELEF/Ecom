import { describe, it, expect } from 'vitest'
import { splitName, extractRates, findWilayaRow, normalizeAlgiersPhone } from '@/lib/delivery/utils'

describe('splitName', () => {
  it('splits a two-part name', () => {
    expect(splitName('Ahmed Khelef')).toEqual({ firstname: 'Ahmed', familyname: 'Khelef' })
  })

  it('splits a multi-part name (last parts are family name)', () => {
    expect(splitName('Mohamed Ben Ali')).toEqual({ firstname: 'Mohamed', familyname: 'Ben Ali' })
  })

  it('uses single name for both fields when only one word', () => {
    expect(splitName('Karim')).toEqual({ firstname: 'Karim', familyname: 'Karim' })
  })

  it('trims whitespace', () => {
    expect(splitName('  Ali  Baba  ')).toEqual({ firstname: 'Ali', familyname: 'Baba' })
  })
})

describe('extractRates', () => {
  it('extracts home_fee', () => {
    expect(extractRates({ home_fee: 600 })).toEqual({ homeDelivery: 600 })
  })

  it('extracts tarif_a_domicile and tarif_stopdesk', () => {
    expect(extractRates({ tarif_a_domicile: 500, tarif_stopdesk: 300 })).toEqual({
      homeDelivery: 500,
      deskDelivery: 300,
    })
  })

  it('returns null for null input', () => {
    expect(extractRates(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(extractRates(undefined)).toBeNull()
  })

  it('returns null when no home delivery key found', () => {
    expect(extractRates({ unrelated: 100 })).toBeNull()
  })

  it('handles string values by converting to number', () => {
    expect(extractRates({ home_fee: '800', desk_fee: '400' })).toEqual({
      homeDelivery: 800,
      deskDelivery: 400,
    })
  })

  it('omits deskDelivery if not present', () => {
    const result = extractRates({ tarif: 700 })
    expect(result).toEqual({ homeDelivery: 700 })
    expect(result).not.toHaveProperty('deskDelivery')
  })
})

describe('findWilayaRow', () => {
  it('finds a row by wilaya name in array', () => {
    const data = [
      { wilaya: 'Alger', home_fee: 400 },
      { wilaya: 'Oran', home_fee: 600 },
    ]
    const row = findWilayaRow(data, 'Oran')
    expect(row).toEqual({ wilaya: 'Oran', home_fee: 600 })
  })

  it('finds by wilaya_name field', () => {
    const data = [{ wilaya_name: 'Blida', fee: 500 }]
    expect(findWilayaRow(data, 'Blida')).toEqual({ wilaya_name: 'Blida', fee: 500 })
  })

  it('case-insensitive match', () => {
    const data = [{ wilaya: 'ALGER', home_fee: 400 }]
    expect(findWilayaRow(data, 'alger')).toEqual({ wilaya: 'ALGER', home_fee: 400 })
  })

  it('returns first row if no exact match found', () => {
    const data = [{ wilaya: 'Setif', fee: 700 }]
    expect(findWilayaRow(data, 'Unknown')).toEqual({ wilaya: 'Setif', fee: 700 })
  })

  it('handles { data: [...] } wrapper', () => {
    const wrapped = { data: [{ wilaya: 'Oran', fee: 600 }] }
    expect(findWilayaRow(wrapped, 'Oran')).toEqual({ wilaya: 'Oran', fee: 600 })
  })

  it('handles { results: [...] } wrapper', () => {
    const wrapped = { results: [{ name: 'Tizi', fee: 550 }] }
    expect(findWilayaRow(wrapped, 'Tizi')).toEqual({ name: 'Tizi', fee: 550 })
  })

  it('returns null for null data', () => {
    expect(findWilayaRow(null, 'Alger')).toBeNull()
  })
})

describe('normalizeAlgiersPhone', () => {
  it('normalizes international to local format', () => {
    expect(normalizeAlgiersPhone('+213551234567')).toBe('0551234567')
  })

  it('keeps local format unchanged', () => {
    expect(normalizeAlgiersPhone('0551234567')).toBe('0551234567')
  })
})
