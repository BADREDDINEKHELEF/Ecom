import { describe, it, expect } from 'vitest'
import { hashOtp, verifyOtpHash } from '@/lib/auth/otp'

describe('OTP hashing', () => {
  it('hashOtp produces a salt:hash format', () => {
    const hashed = hashOtp('123456')
    expect(hashed).toContain(':')
    const parts = hashed.split(':')
    expect(parts).toHaveLength(2)
    expect(parts[0].length).toBe(32) // 16 bytes hex = 32 chars
    expect(parts[1].length).toBe(128) // 64 bytes hex = 128 chars
  })

  it('same OTP produces different hashes (random salt)', () => {
    const a = hashOtp('999999')
    const b = hashOtp('999999')
    expect(a).not.toBe(b)
  })

  it('verifyOtpHash returns true for correct OTP', () => {
    const otp = '654321'
    const hashed = hashOtp(otp)
    expect(verifyOtpHash(otp, hashed)).toBe(true)
  })

  it('verifyOtpHash returns false for wrong OTP', () => {
    const hashed = hashOtp('123456')
    expect(verifyOtpHash('000000', hashed)).toBe(false)
  })

  it('verifyOtpHash returns false for empty stored value', () => {
    expect(verifyOtpHash('123456', '')).toBe(false)
  })

  it('verifyOtpHash returns false for invalid stored format', () => {
    expect(verifyOtpHash('123456', 'no-colon-here')).toBe(false)
  })
})
