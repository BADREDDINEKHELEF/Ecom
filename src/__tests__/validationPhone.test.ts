import { describe, it, expect } from 'vitest'
import { ALGERIAN_PHONE_REGEX, isValidAlgerianPhone, normalizePhone, formatPhone } from '@/lib/validation/phone'

describe('ALGERIAN_PHONE_REGEX', () => {
  it('matches local mobile numbers starting with 05', () => {
    expect(ALGERIAN_PHONE_REGEX.test('0551234567')).toBe(true)
  })

  it('matches local mobile numbers starting with 06', () => {
    expect(ALGERIAN_PHONE_REGEX.test('0661234567')).toBe(true)
  })

  it('matches local mobile numbers starting with 07', () => {
    expect(ALGERIAN_PHONE_REGEX.test('0771234567')).toBe(true)
  })

  it('matches international with +213', () => {
    expect(ALGERIAN_PHONE_REGEX.test('+213551234567')).toBe(true)
  })

  it('matches international without +', () => {
    expect(ALGERIAN_PHONE_REGEX.test('213551234567')).toBe(true)
  })

  it('rejects numbers starting with 04', () => {
    expect(ALGERIAN_PHONE_REGEX.test('0441234567')).toBe(false)
  })

  it('rejects landlines starting with 02', () => {
    expect(ALGERIAN_PHONE_REGEX.test('0211234567')).toBe(false)
  })

  it('rejects too-short numbers', () => {
    expect(ALGERIAN_PHONE_REGEX.test('055123')).toBe(false)
  })

  it('rejects too-long numbers', () => {
    expect(ALGERIAN_PHONE_REGEX.test('05512345678')).toBe(false)
  })
})

describe('isValidAlgerianPhone', () => {
  it('validates with spaces stripped', () => {
    expect(isValidAlgerianPhone('05 51 23 45 67')).toBe(true)
  })

  it('validates with dashes stripped', () => {
    expect(isValidAlgerianPhone('055-123-4567')).toBe(true)
  })

  it('rejects invalid numbers', () => {
    expect(isValidAlgerianPhone('0123456789')).toBe(false)
  })
})

describe('normalizePhone', () => {
  it('converts +213 to local 0', () => {
    expect(normalizePhone('+213551234567')).toBe('0551234567')
  })

  it('converts 213 (no +) to local 0', () => {
    expect(normalizePhone('213551234567')).toBe('0551234567')
  })

  it('leaves local format unchanged', () => {
    expect(normalizePhone('0551234567')).toBe('0551234567')
  })

  it('strips spaces, dashes, dots, parens', () => {
    expect(normalizePhone('05.51-23 45(67)')).toBe('0551234567')
  })
})

describe('formatPhone', () => {
  it('formats a 10-digit number with spaces', () => {
    expect(formatPhone('0551234567')).toBe('05 51 23 45 67')
  })

  it('normalizes +213 before formatting', () => {
    expect(formatPhone('+213551234567')).toBe('05 51 23 45 67')
  })

  it('returns original for non-10-digit after normalizing', () => {
    expect(formatPhone('12345')).toBe('12345')
  })
})
