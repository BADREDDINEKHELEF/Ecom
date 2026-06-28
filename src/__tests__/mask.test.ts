import { describe, it, expect } from 'vitest'
import { maskPhone, maskEmail } from '@/lib/utils/mask'

describe('maskPhone', () => {
  it('masks a standard 10-digit phone', () => {
    expect(maskPhone('0551234567')).toBe('0551****67')
  })

  it('masks a phone with international prefix', () => {
    expect(maskPhone('+213551234567')).toBe('2135****67')
  })

  it('strips spaces/dashes before masking', () => {
    expect(maskPhone('05 51 23 45 67')).toBe('0551****67')
  })

  it('returns empty string for null', () => {
    expect(maskPhone(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(maskPhone(undefined)).toBe('')
  })

  it('returns *** for very short numbers', () => {
    expect(maskPhone('123')).toBe('***')
  })
})

describe('maskEmail', () => {
  it('masks a standard email', () => {
    expect(maskEmail('user@example.com')).toBe('us***@example.com')
  })

  it('masks a short local part', () => {
    expect(maskEmail('ab@test.dz')).toBe('ab***@test.dz')
  })

  it('returns empty string for null', () => {
    expect(maskEmail(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(maskEmail(undefined)).toBe('')
  })

  it('returns *** for email without @', () => {
    expect(maskEmail('noemail')).toBe('***')
  })
})
