import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

export function hashOtp(otp: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(otp, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyOtpHash(otp: string, stored: string): boolean {
  if (!stored || !stored.includes(':')) return false
  const [salt, expectedHex] = stored.split(':')
  if (!salt || !expectedHex) return false
  try {
    const computed = scryptSync(otp, salt, 64).toString('hex')
    const a = Buffer.from(computed)
    const b = Buffer.from(expectedHex)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}