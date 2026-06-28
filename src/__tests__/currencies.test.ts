import { describe, it, expect } from 'vitest'
import {
  EXCHANGE_RATES,
  COUNTRY_LOCALE,
  DEFAULT_LOCALE,
  formatLocalPrice,
} from '@/lib/locale/currencies'

describe('EXCHANGE_RATES', () => {
  it('has DZD at rate 1', () => {
    expect(EXCHANGE_RATES.DZD).toBe(1)
  })

  it('has EUR less than 1 (DZD is weaker)', () => {
    expect(EXCHANGE_RATES.EUR).toBeLessThan(1)
    expect(EXCHANGE_RATES.EUR).toBeGreaterThan(0)
  })

  it('has USD less than 1', () => {
    expect(EXCHANGE_RATES.USD).toBeLessThan(1)
    expect(EXCHANGE_RATES.USD).toBeGreaterThan(0)
  })
})

describe('COUNTRY_LOCALE', () => {
  it('maps DZ to DZD and French', () => {
    expect(COUNTRY_LOCALE.DZ).toEqual({ currency: 'DZD', language: 'fr' })
  })

  it('maps SA to SAR and Arabic', () => {
    expect(COUNTRY_LOCALE.SA).toEqual({ currency: 'SAR', language: 'ar' })
  })

  it('maps US to USD and English', () => {
    expect(COUNTRY_LOCALE.US).toEqual({ currency: 'USD', language: 'en' })
  })
})

describe('DEFAULT_LOCALE', () => {
  it('defaults to Algeria', () => {
    expect(DEFAULT_LOCALE.country).toBe('DZ')
    expect(DEFAULT_LOCALE.currency).toBe('DZD')
    expect(DEFAULT_LOCALE.language).toBe('fr')
  })
})

describe('formatLocalPrice', () => {
  it('formats DZD with no decimals', () => {
    const result = formatLocalPrice(1000, 'DZD')
    expect(result).toContain('1')
    expect(result).toContain('000')
  })

  it('converts to EUR using exchange rate', () => {
    const result = formatLocalPrice(10000, 'EUR')
    // 10000 * 0.0068 = 68 EUR
    expect(result).toContain('68')
  })

  it('falls back to rate 1 for unknown currency', () => {
    const result = formatLocalPrice(500, 'XYZ')
    expect(result).toContain('500')
  })
})
