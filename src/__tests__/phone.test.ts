import { describe, it, expect } from 'vitest'
import {
  ALGERIAN_PHONE_REGEX,
  isValidAlgerianPhone,
  normalizePhone,
  formatPhone,
} from '@/lib/validation/phone'

describe('ALGERIAN_PHONE_REGEX', () => {
  it('accepts local Djezzy/Mobilis/Ooredoo (05x/06x/07x)', () => {
    expect(ALGERIAN_PHONE_REGEX.test('0551234567')).toBe(true)
    expect(ALGERIAN_PHONE_REGEX.test('0661234567')).toBe(true)
    expect(ALGERIAN_PHONE_REGEX.test('0771234567')).toBe(true)
  })

  it('accepts international with +213 prefix', () => {
    expect(ALGERIAN_PHONE_REGEX.test('+213551234567')).toBe(true)
    expect(ALGERIAN_PHONE_REGEX.test('+213661234567')).toBe(true)
  })

  it('accepts international without + prefix', () => {
    expect(ALGERIAN_PHONE_REGEX.test('213551234567')).toBe(true)
  })

  it('rejects landlines (02x, 03x)', () => {
    expect(ALGERIAN_PHONE_REGEX.test('021234567')).toBe(false)
    expect(ALGERIAN_PHONE_REGEX.test('031234567')).toBe(false)
  })

  it('rejects 04x numbers (unused range)', () => {
    expect(ALGERIAN_PHONE_REGEX.test('0412345678')).toBe(false)
  })

  it('rejects too-short numbers', () => {
    expect(ALGERIAN_PHONE_REGEX.test('055123456')).toBe(false)  // 9 digits
  })

  it('rejects too-long numbers', () => {
    expect(ALGERIAN_PHONE_REGEX.test('05512345678')).toBe(false) // 11 digits
  })

  it('rejects empty string', () => {
    expect(ALGERIAN_PHONE_REGEX.test('')).toBe(false)
  })
})

describe('isValidAlgerianPhone', () => {
  it('accepts numbers with spaces/dashes stripped', () => {
    expect(isValidAlgerianPhone('05 51 23 45 67')).toBe(true)
    expect(isValidAlgerianPhone('0551-234-567')).toBe(true)
    expect(isValidAlgerianPhone('(0551) 234567')).toBe(true)
  })

  it('accepts clean valid numbers', () => {
    expect(isValidAlgerianPhone('0551234567')).toBe(true)
    expect(isValidAlgerianPhone('+213551234567')).toBe(true)
  })

  it('rejects invalid numbers after stripping', () => {
    expect(isValidAlgerianPhone('123456789')).toBe(false)
    expect(isValidAlgerianPhone('abc')).toBe(false)
    expect(isValidAlgerianPhone('')).toBe(false)
  })
})

describe('normalizePhone', () => {
  it('converts +213 prefix to local 0', () => {
    expect(normalizePhone('+213551234567')).toBe('0551234567')
  })

  it('converts 213 prefix (no +) to local 0', () => {
    expect(normalizePhone('213551234567')).toBe('0551234567')
  })

  it('leaves local format unchanged', () => {
    expect(normalizePhone('0551234567')).toBe('0551234567')
  })

  it('strips spaces, dashes, dots, parens, plus signs', () => {
    expect(normalizePhone('+213 55 123 45 67')).toBe('0551234567')
    expect(normalizePhone('0551-234-567')).toBe('0551234567')
  })
})

describe('formatPhone', () => {
  it('formats 10-digit local number with spaces', () => {
    expect(formatPhone('0551234567')).toBe('05 51 23 45 67')
  })

  it('formats after normalizing +213 prefix', () => {
    expect(formatPhone('+213551234567')).toBe('05 51 23 45 67')
  })

  it('returns original if not 10 digits after normalizing', () => {
    expect(formatPhone('badphone')).toBe('badphone')
  })
})
