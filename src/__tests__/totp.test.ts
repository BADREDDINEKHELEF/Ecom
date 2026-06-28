import { describe, it, expect, vi, afterEach } from 'vitest'
import { createHmac } from 'crypto'
import { generateTotpSecret, verifyTotp, verifyTotpGetCounter } from '@/lib/auth/totp'

describe('TOTP', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  describe('generateTotpSecret', () => {
    it('generates a 20-character base32 secret', () => {
      const secret = generateTotpSecret()
      expect(secret).toHaveLength(20)
      expect(secret).toMatch(/^[A-Z2-7]+$/)
    })

    it('generates unique secrets', () => {
      const a = generateTotpSecret()
      const b = generateTotpSecret()
      expect(a).not.toBe(b)
    })
  })

  describe('verifyTotp', () => {
    it('returns false for empty token', () => {
      const secret = generateTotpSecret()
      expect(verifyTotp('', secret)).toBe(false)
    })

    it('returns false for wrong token', () => {
      const secret = generateTotpSecret()
      expect(verifyTotp('000000', secret)).toBe(false)
    })

    it('verifies a token generated for the current time window', () => {
      const secret = 'JBSWY3DPEHPK3PXP' // well-known test secret
      
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))
      
      // The counter at this time: floor(1735689600 / 30)
      const counter = Math.floor(1735689600 / 30)
      
      // Manually compute TOTP
      function base32Decode(encoded: string): Buffer {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
        let bits = 0, value = 0
        const output: number[] = []
        for (const char of encoded.toUpperCase()) {
          const idx = chars.indexOf(char)
          if (idx === -1) continue
          value = (value << 5) | idx
          bits += 5
          if (bits >= 8) { output.push((value >>> (bits - 8)) & 0xff); bits -= 8 }
        }
        return Buffer.from(output)
      }
      
      const key = base32Decode(secret)
      const buf = Buffer.alloc(8)
      buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
      buf.writeUInt32BE(counter >>> 0, 4)
      const hmac = createHmac('sha1', key).update(buf).digest()
      const offset = hmac[hmac.length - 1] & 0x0f
      const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3]
      const token = String(code % 1_000_000).padStart(6, '0')
      
      expect(verifyTotp(token, secret)).toBe(true)
    })
  })

  describe('verifyTotpGetCounter', () => {
    it('returns null for invalid token', () => {
      const secret = generateTotpSecret()
      expect(verifyTotpGetCounter('000000', secret)).toBeNull()
    })

    it('returns the counter value for a valid token', () => {
      const secret = 'JBSWY3DPEHPK3PXP'
      
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-01-01T00:00:00Z'))
      
      const counter = Math.floor(1735689600 / 30)
      
      function base32Decode(encoded: string): Buffer {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
        let bits = 0, value = 0
        const output: number[] = []
        for (const char of encoded.toUpperCase()) {
          const idx = chars.indexOf(char)
          if (idx === -1) continue
          value = (value << 5) | idx
          bits += 5
          if (bits >= 8) { output.push((value >>> (bits - 8)) & 0xff); bits -= 8 }
        }
        return Buffer.from(output)
      }
      
      const key = base32Decode(secret)
      const buf = Buffer.alloc(8)
      buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
      buf.writeUInt32BE(counter >>> 0, 4)
      const hmac = createHmac('sha1', key).update(buf).digest()
      const offset = hmac[hmac.length - 1] & 0x0f
      const code = ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) | (hmac[offset + 2] << 8) | hmac[offset + 3]
      const token = String(code % 1_000_000).padStart(6, '0')
      
      const result = verifyTotpGetCounter(token, secret)
      expect(result).toBe(counter)
    })
  })
})
