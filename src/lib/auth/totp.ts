import { createHmac, randomBytes } from 'crypto'
import QRCode from 'qrcode'

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(encoded: string): Buffer {
  let bits = 0
  let value = 0
  const output: number[] = []
  const upper = encoded.toUpperCase().replace(/=+$/, '')
  for (const char of upper) {
    const idx = BASE32_CHARS.indexOf(char)
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(output)
}

export function generateTotpSecret(): string {
  const bytes = randomBytes(20)
  let secret = ''
  for (let i = 0; i < bytes.length; i++) {
    secret += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[bytes[i] & 0x1f]
  }
  return secret
}

function generateToken(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buf.writeUInt32BE(counter >>> 0, 4)
  const hmac = createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0x0f
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3]
  return String(code % 1_000_000).padStart(6, '0')
}

export function verifyTotp(token: string, secret: string, window = 1): boolean {
  const counter = Math.floor(Date.now() / 1000 / 30)
  for (let delta = -window; delta <= window; delta++) {
    if (generateToken(secret, counter + delta) === token) return true
  }
  return false
}

/**
 * Like verifyTotp but returns the matching counter value on success (needed for
 * replay protection — the caller records the counter so it can't be reused).
 * Returns null if the code is invalid.
 */
export function verifyTotpGetCounter(token: string, secret: string, window = 1): number | null {
  const counter = Math.floor(Date.now() / 1000 / 30)
  for (let delta = -window; delta <= window; delta++) {
    if (generateToken(secret, counter + delta) === token) return counter + delta
  }
  return null
}

export async function generateQrCode(secret: string, issuer = 'StoreDz'): Promise<string> {
  const otpauth = `otpauth://totp/${encodeURIComponent(issuer)}:admin?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
  return QRCode.toDataURL(otpauth)
}
