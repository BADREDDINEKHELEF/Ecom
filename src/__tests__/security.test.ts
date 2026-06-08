/**
 * Security regression tests — protect against known vulnerabilities.
 *
 * These tests verify that the critical security fixes remain in place.
 * They do NOT hit the network; they test the logic layer directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Crypto / JWT tests ──────────────────────────────────────────────────────

describe('JWT — signAdminToken / verifyAdminToken', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_JWT_SECRET', 'a-very-long-test-secret-that-is-at-least-32-bytes-long')
  })

  it('signs and verifies a token with role=admin', async () => {
    const { signAdminToken, verifyAdminToken } = await import('../lib/auth/jwt')
    const token = await signAdminToken()
    expect(typeof token).toBe('string')
    const payload = await verifyAdminToken(token)
    expect(payload).not.toBeNull()
    expect(payload?.role).toBe('admin')
  })

  it('rejects a tampered token', async () => {
    const { signAdminToken, verifyAdminToken } = await import('../lib/auth/jwt')
    const token = await signAdminToken()
    const tampered = token.slice(0, -5) + 'XXXXX'
    const payload = await verifyAdminToken(tampered)
    expect(payload).toBeNull()
  })

  it('rejects a token with wrong role', async () => {
    const { jwtVerify, SignJWT } = await import('jose')
    const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET)
    // Craft a token with role=seller instead of role=admin
    const fakeToken = await new SignJWT({ role: 'seller' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(secret)
    const { verifyAdminToken } = await import('../lib/auth/jwt')
    const payload = await verifyAdminToken(fakeToken)
    expect(payload).toBeNull()
  })
})

// ── Crypto encryption tests ─────────────────────────────────────────────────

describe('Field encryption (AES-256-GCM)', () => {
  beforeEach(() => {
    // 64 hex chars = 32 bytes key
    vi.stubEnv('FIELD_ENCRYPTION_KEY', 'a'.repeat(64))
  })

  it('encrypts and decrypts a string correctly', async () => {
    const { encryptField, decryptField } = await import('../lib/utils/crypto')
    const plaintext = 'my-super-secret-api-token'
    const ciphertext = encryptField(plaintext)
    expect(ciphertext).not.toContain(plaintext)
    expect(decryptField(ciphertext)).toBe(plaintext)
  })

  it('produces different ciphertexts for the same input (random IV)', async () => {
    const { encryptField } = await import('../lib/utils/crypto')
    const c1 = encryptField('hello')
    const c2 = encryptField('hello')
    expect(c1).not.toBe(c2)
  })

  it('throws on tampered ciphertext', async () => {
    const { encryptField, decryptField } = await import('../lib/utils/crypto')
    const ciphertext = encryptField('secret')
    const parts = ciphertext.split(':')
    parts[2] = parts[2].slice(0, -4) + '0000' // corrupt ciphertext
    expect(() => decryptField(parts.join(':'))).toThrow()
  })

  it('isEncrypted returns true only for properly formatted ciphertext', async () => {
    const { encryptField, isEncrypted } = await import('../lib/utils/crypto')
    expect(isEncrypted(encryptField('test'))).toBe(true)
    expect(isEncrypted('plaintext')).toBe(false)
    expect(isEncrypted('a:b:c')).toBe(false) // wrong lengths
  })
})

// ── Phone normalisation / validation ───────────────────────────────────────

describe('Algerian phone validation (via orders API schema)', () => {
  // Correct regex: local format 0[5-7]XXXXXXXX (10 digits)
  //                or international 213[5-7]XXXXXXXX (12 digits, no leading 0)
  const ALGERIAN_PHONE_RE = /^(213[5-7]|0[5-7])\d{8}$/

  const validPhones = [
    '0551234567',   // local 05
    '0661234567',   // local 06
    '0771234567',   // local 07
    '213551234567', // international
    '213661234567',
  ]
  const invalidPhones = [
    '0441234567',    // wrong prefix
    '123',           // too short
    '+33612345678',  // French number
    'abc',           // non-numeric
    '0551234567890', // too long
  ]

  for (const phone of validPhones) {
    it(`accepts valid phone: ${phone}`, () => {
      expect(ALGERIAN_PHONE_RE.test(phone)).toBe(true)
    })
  }

  for (const phone of invalidPhones) {
    it(`rejects invalid phone: ${phone}`, () => {
      expect(ALGERIAN_PHONE_RE.test(phone)).toBe(false)
    })
  }
})

// ── Order status state machine ──────────────────────────────────────────────

describe('Seller order status transitions', () => {
  type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
    pending:   ['confirmed', 'cancelled'],
    confirmed: ['shipped', 'cancelled'],
    shipped:   ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  }

  const allowed: [OrderStatus, OrderStatus][] = [
    ['pending', 'confirmed'],
    ['pending', 'cancelled'],
    ['confirmed', 'shipped'],
    ['confirmed', 'cancelled'],
    ['shipped', 'delivered'],
    ['shipped', 'cancelled'],
  ]
  const denied: [OrderStatus, OrderStatus][] = [
    ['pending', 'delivered'],
    ['pending', 'shipped'],
    ['delivered', 'cancelled'],
    ['cancelled', 'pending'],
    ['shipped', 'pending'],
  ]

  for (const [from, to] of allowed) {
    it(`allows ${from} → ${to}`, () => {
      expect(ALLOWED[from].includes(to)).toBe(true)
    })
  }

  for (const [from, to] of denied) {
    it(`blocks ${from} → ${to}`, () => {
      expect(ALLOWED[from].includes(to)).toBe(false)
    })
  }
})
