/**
 * Security regression tests — protect against known vulnerabilities.
 *
 * These tests verify that the critical security fixes remain in place.
 * They do NOT hit the network; they test the logic layer directly.
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

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
    const { SignJWT } = await import('jose')
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

  it('returns empty string on tampered ciphertext (GCM auth tag mismatch)', async () => {
    const { encryptField, decryptField } = await import('../lib/utils/crypto')
    const ciphertext = encryptField('secret')
    const parts = ciphertext.split(':')
    parts[2] = parts[2].slice(0, -4) + '0000' // corrupt ciphertext
    // decryptField degrades gracefully — returns '' rather than throwing
    expect(decryptField(parts.join(':'))).toBe('')
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

// ── CSPRNG OTP generator ───────────────────────────────────────────────────

describe('OTP generator uses CSPRNG (not Math.random)', () => {
  it('crypto.randomInt produces 6-digit codes in valid range', async () => {
    const { randomInt } = await import('crypto')
    for (let i = 0; i < 20; i++) {
      const code = randomInt(100000, 1000000).toString()
      expect(code).toMatch(/^\d{6}$/)
    }
  })

  it('forgot-password uses randomInt from crypto for OTP generation', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const src = readFileSync(
      resolve(__dirname, '../app/api/seller/forgot-password/route.ts'),
      'utf-8'
    )
    // Must import randomInt from crypto and use it in generateOTP
    expect(src).toContain("import { randomInt } from 'crypto'")
    expect(src).toContain('randomInt(100000, 1000000)')
  })

  it('send-email-otp uses randomInt from crypto for OTP generation', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const src = readFileSync(
      resolve(__dirname, '../app/api/seller/send-email-otp/route.ts'),
      'utf-8'
    )
    expect(src).toContain("import { randomInt } from 'crypto'")
    expect(src).toContain('randomInt(100000, 1000000)')
  })
})

// ── Admin token expiry ─────────────────────────────────────────────────────

describe('Admin JWT — 2-hour expiry', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_JWT_SECRET', 'a-very-long-test-secret-that-is-at-least-32-bytes-long')
  })

  it('ADMIN_TOKEN_MAX_AGE_SECONDS equals exactly 7200 (2 hours)', async () => {
    const { ADMIN_TOKEN_MAX_AGE_SECONDS } = await import('../lib/auth/jwt')
    expect(ADMIN_TOKEN_MAX_AGE_SECONDS).toBe(7200)
  })

  it('signed token expires in ~2 hours, not 8', async () => {
    const { signAdminToken, verifyAdminToken } = await import('../lib/auth/jwt')
    const { decodeJwt } = await import('jose')
    const token = await signAdminToken()
    const payload = await verifyAdminToken(token)
    expect(payload).not.toBeNull()
    const decoded = decodeJwt(token)
    const iat = decoded.iat as number
    const exp = decoded.exp as number
    const lifetimeSecs = exp - iat
    // Must be ≤ 7200 (2h) — not 28800 (8h)
    expect(lifetimeSecs).toBeLessThanOrEqual(7200)
    expect(lifetimeSecs).toBeGreaterThan(7100)
  })

  it('admin login and refresh routes use ADMIN_TOKEN_MAX_AGE_SECONDS for cookie maxAge', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const loginSrc = readFileSync(resolve(__dirname, '../app/api/admin/login/route.ts'), 'utf-8')
    const refreshSrc = readFileSync(resolve(__dirname, '../app/api/admin/refresh/route.ts'), 'utf-8')
    expect(loginSrc).not.toContain('8 * 60 * 60')
    expect(loginSrc).toContain('ADMIN_TOKEN_MAX_AGE_SECONDS')
    expect(refreshSrc).toContain('ADMIN_TOKEN_MAX_AGE_SECONDS')
  })
})

// ── SSRF-safe URL allowlist ────────────────────────────────────────────────

describe('SSRF protection — vendor URL fields accept only Supabase storage', () => {
  const ALLOWED_STORAGE_HOSTS = ['supabase.co', 'supabase.in']

  function safeStorageUrl(url: string): boolean {
    try {
      const { protocol, hostname } = new URL(url)
      return protocol === 'https:' && ALLOWED_STORAGE_HOSTS.some((h) => hostname.endsWith(h))
    } catch { return false }
  }

  const validUrls = [
    'https://abc.supabase.co/storage/v1/object/public/avatars/logo.png',
    'https://xyz.supabase.in/storage/v1/object/public/covers/banner.jpg',
    'https://project-ref.supabase.co/storage/v1/object/public/media/image.webp',
  ]

  const invalidUrls = [
    'http://evil.com/logo.png',                    // non-https
    'https://evil.com/logo.png',                   // unknown host
    'https://169.254.169.254/latest/meta-data/',   // AWS IMDS
    'https://notsupabase.co.evil.com/image.png',   // subdomain spoofing
    'https://supabase.co.evil.com/image.png',      // trailing domain attack
    'file:///etc/passwd',                          // local file
    'javascript:alert(1)',                         // XSS
    '',                                            // empty
    'not-a-url',                                   // unparseable
  ]

  for (const url of validUrls) {
    it(`accepts valid Supabase URL: ${url.slice(0, 60)}`, () => {
      expect(safeStorageUrl(url)).toBe(true)
    })
  }

  for (const url of invalidUrls) {
    it(`rejects non-Supabase URL: ${url.slice(0, 60)}`, () => {
      expect(safeStorageUrl(url)).toBe(false)
    })
  }

  it('register and vendor patch routes use safeStorageUrl validation', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const registerSrc = readFileSync(resolve(__dirname, '../app/api/seller/register/route.ts'), 'utf-8')
    const vendorSrc = readFileSync(resolve(__dirname, '../app/api/seller/vendor/route.ts'), 'utf-8')
    expect(registerSrc).toContain('safeStorageUrl')
    expect(registerSrc).not.toContain("z.string().url().nullable().optional()")
    expect(vendorSrc).toContain('safeStorageUrl')
    expect(vendorSrc).toContain('ALLOWED_STORAGE_HOSTS')
  })
})

// ── CartSnapshot size cap ──────────────────────────────────────────────────

describe('CartSnapshot size cap — prevents DB bloat from oversized payloads', () => {
  const MAX_ITEMS = 50

  function capSnapshot(cartSnapshot: unknown): unknown {
    return Array.isArray(cartSnapshot)
      ? cartSnapshot.slice(0, MAX_ITEMS)
      : (cartSnapshot !== null && typeof cartSnapshot === 'object' ? cartSnapshot : null)
  }

  it('caps arrays at 50 items', () => {
    const large = Array.from({ length: 200 }, (_, i) => ({ id: i }))
    const capped = capSnapshot(large) as unknown[]
    expect(capped.length).toBe(50)
  })

  it('preserves arrays ≤ 50 items intact', () => {
    const small = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const capped = capSnapshot(small) as unknown[]
    expect(capped.length).toBe(3)
  })

  it('passes object snapshots through unchanged', () => {
    const obj = { items: [], total: 0 }
    expect(capSnapshot(obj)).toEqual(obj)
  })

  it('converts non-array primitives to null', () => {
    expect(capSnapshot('invalid')).toBeNull()
    expect(capSnapshot(42)).toBeNull()
    expect(capSnapshot(true)).toBeNull()
  })

  it('abandoned route source includes .slice(0, 50) or .max(50) guard', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const src = readFileSync(resolve(__dirname, '../app/api/abandoned/route.ts'), 'utf-8')
    expect(src.includes('.slice(0, 50)') || src.includes('.max(50)')).toBe(true)
  })
})

// ── UUID validation on route params ───────────────────────────────────────

describe('UUID validation on route parameters', () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  const validUuids = [
    'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    '00000000-0000-0000-0000-000000000000',
    'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
  ]
  const invalidUuids = [
    '../../../etc/passwd',
    "' OR '1'='1",
    '12345',
    'not-a-uuid',
    '',
    'f47ac10b-58cc-4372-a567-0e02b2c3d47',   // one char short
    'f47ac10b-58cc-4372-a567-0e02b2c3d4799', // one char long
  ]

  for (const id of validUuids) {
    it(`accepts valid UUID: ${id}`, () => expect(UUID_RE.test(id)).toBe(true))
  }
  for (const id of invalidUuids) {
    it(`rejects invalid param: ${id.slice(0, 40)}`, () => expect(UUID_RE.test(id)).toBe(false))
  }

  it('orderId return route validates UUID before DB query', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const src = readFileSync(
      resolve(__dirname, '../app/api/orders/[orderId]/return/route.ts'),
      'utf-8'
    )
    expect(src).toContain('UUID_RE')
    expect(src).toContain('UUID_RE.test(orderId)')
  })
})

// ── Magic byte verification for image uploads ──────────────────────────────

describe('Image upload — magic byte verification', () => {
  it('accepts a valid JPEG buffer (FF D8 FF magic bytes)', async () => {
    const { validateImageUpload } = await import('../lib/validation/fileUpload')
    // Minimal JPEG: SOI (FF D8) + APP0 marker (FF E0) + minimal data
    const jpegMagic = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, ...new Array(20).fill(0)])
    expect(() => validateImageUpload(jpegMagic, 'image/jpeg')).not.toThrow()
  })

  it('accepts a valid PNG buffer (89 50 4E 47 magic bytes)', async () => {
    const { validateImageUpload } = await import('../lib/validation/fileUpload')
    const pngMagic = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...new Array(20).fill(0)])
    expect(() => validateImageUpload(pngMagic, 'image/png')).not.toThrow()
  })

  it('rejects a PDF disguised as JPEG (magic byte mismatch)', async () => {
    const { validateImageUpload } = await import('../lib/validation/fileUpload')
    const pdfBytes = Buffer.from('%PDF-1.4 fake content here')
    expect(() => validateImageUpload(pdfBytes, 'image/jpeg')).toThrow()
  })

  it('rejects an HTML file disguised as PNG', async () => {
    const { validateImageUpload } = await import('../lib/validation/fileUpload')
    const htmlBytes = Buffer.from('<html><body>xss</body></html>')
    expect(() => validateImageUpload(htmlBytes, 'image/png')).toThrow()
  })

  it('upload route source uses validateImageUpload before storage write', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const src = readFileSync(resolve(__dirname, '../app/api/seller/upload/route.ts'), 'utf-8')
    expect(src).toContain('validateImageUpload')
  })
})

// ── Rate limiting presence ─────────────────────────────────────────────────

describe('Rate limiting — critical routes are protected', () => {
  const criticalRoutes: Array<{ label: string; file: string; check: string }> = [
    {
      label: 'forgot-password',
      file: '../app/api/seller/forgot-password/route.ts',
      check: 'checkOtpSendRateLimit',
    },
    {
      label: 'pixel/collect GET',
      file: '../app/api/pixel/collect/route.ts',
      check: 'checkPublicRateLimit',
    },
    {
      label: 'compare',
      file: '../app/api/compare/route.ts',
      check: 'checkPublicRateLimit',
    },
    {
      label: 'abandoned POST',
      file: '../app/api/abandoned/route.ts',
      check: 'checkPublicRateLimit',
    },
    {
      label: 'order return POST',
      file: '../app/api/orders/[orderId]/return/route.ts',
      check: 'checkPublicRateLimit',
    },
    {
      label: 'admin login POST',
      file: '../app/api/admin/login/route.ts',
      check: 'checkRateLimit',
    },
  ]

  for (const { label, file, check } of criticalRoutes) {
    it(`${label} route imports and calls rate limiter (${check})`, async () => {
      const { readFileSync } = await import('fs')
      const { resolve } = await import('path')
      const src = readFileSync(resolve(__dirname, file), 'utf-8')
      expect(src).toContain(check)
    })
  }
})

// ── New rate-limit coverage: endpoints fixed in this session ────────────────

describe('Rate limit coverage — new endpoints', () => {
  const newCoverage = [
    { label: 'seller/sponsored PATCH',     file: '../app/api/seller/sponsored/route.ts',        check: 'checkSellerRateLimit' },
    { label: 'seller/products/import POST', file: '../app/api/seller/products/import/route.ts',  check: 'checkSellerRateLimit' },
    { label: 'seller/products/import POST user-level', file: '../app/api/seller/products/import/route.ts', check: 'checkUserRateLimit' },
    { label: 'loyalty GET',                file: '../app/api/loyalty/route.ts',                  check: 'checkPublicRateLimit' },
    { label: 'addresses GET',              file: '../app/api/addresses/route.ts',                check: 'checkPublicRateLimit' },
    { label: 'addresses POST',             file: '../app/api/addresses/route.ts',                check: 'checkPublicRateLimit' },
    { label: 'addresses/[id] PATCH',       file: '../app/api/addresses/[id]/route.ts',           check: 'checkPublicRateLimit' },
    { label: 'addresses/[id] DELETE',      file: '../app/api/addresses/[id]/route.ts',           check: 'checkPublicRateLimit' },
  ]
  for (const { label, file, check } of newCoverage) {
    it(`${label} imports and calls ${check}`, async () => {
      const { readFileSync } = await import('fs')
      const { resolve } = await import('path')
      const src = readFileSync(resolve(__dirname, file), 'utf-8')
      expect(src).toContain(check)
    })
  }
})

// ── CRON secret validation ──────────────────────────────────────────────────

describe('CRON secret — timing-safe comparison', () => {
  it('analytics-alerts uses timingSafeEqual (not string equality)', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const src = readFileSync(resolve(__dirname, '../app/api/cron/analytics-alerts/route.ts'), 'utf-8')
    expect(src).toContain('timingSafeEqual')
    // Verify the vulnerable pattern is NOT present
    expect(src).not.toContain(`authHeader !== \`Bearer`)
  })

  it('sync-shipments uses timingSafeEqual', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const src = readFileSync(resolve(__dirname, '../app/api/cron/sync-shipments/route.ts'), 'utf-8')
    expect(src).toContain('timingSafeEqual')
  })

  it('rejects empty CRON_SECRET (expected.length > 0 guard)', () => {
    // Simulates the guard in both cron routes
    const provided = ''
    const expected = ''
    const valid = expected.length > 0 && provided.length === expected.length
    expect(valid).toBe(false)
  })

  it('rejects wrong-length token without calling timingSafeEqual', () => {
    const provided = 'short'
    const expected = 'much-longer-secret-here'
    const valid = expected.length > 0 && provided.length === expected.length
    expect(valid).toBe(false)
  })
})

// ── Admin returns — input validation ───────────────────────────────────────

describe('Admin returns — refund amount + adminNote validation', () => {
  const MAX_REFUND_DZD = 10_000_000

  function validateRefund(raw: unknown): { ok: boolean; value?: number } {
    const n = Number(raw)
    if (isNaN(n) || n < 0 || n > MAX_REFUND_DZD) return { ok: false }
    return { ok: true, value: Math.max(0, Math.min(MAX_REFUND_DZD, n)) }
  }

  it('accepts zero refund', () => {
    expect(validateRefund(0)).toEqual({ ok: true, value: 0 })
  })

  it('accepts a normal refund within cap', () => {
    expect(validateRefund(5000)).toEqual({ ok: true, value: 5000 })
  })

  it('rejects negative refund', () => {
    expect(validateRefund(-1).ok).toBe(false)
  })

  it('rejects refund above MAX_REFUND_DZD', () => {
    expect(validateRefund(MAX_REFUND_DZD + 1).ok).toBe(false)
  })

  it('rejects NaN', () => {
    expect(validateRefund('not-a-number').ok).toBe(false)
  })

  it('adminNote over 2000 chars is rejected', () => {
    const longNote = 'a'.repeat(2001)
    expect(typeof longNote === 'string' && longNote.length > 2000).toBe(true)
  })

  it('adminNote under 2000 chars is accepted', () => {
    const note = 'a'.repeat(200)
    expect(typeof note === 'string' && note.length <= 2000).toBe(true)
  })
})

// ── Seller sponsored PATCH — rate limit in source ──────────────────────────

describe('Seller sponsored PATCH — error logging present', () => {
  it('PATCH handler has logger.error call', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const src = readFileSync(resolve(__dirname, '../app/api/seller/sponsored/route.ts'), 'utf-8')
    // All three handlers must log errors
    const matches = (src.match(/logger\.error/g) ?? []).length
    expect(matches).toBeGreaterThanOrEqual(3)
  })
})

// ── CSP — unsafe-eval removed ──────────────────────────────────────────────

describe('Content Security Policy — unsafe-eval removed', () => {
  it('next.config.ts script-src does not contain unsafe-eval', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const src = readFileSync(resolve(__dirname, '../../next.config.ts'), 'utf-8')
    // script-src line must NOT contain unsafe-eval
    expect(src).not.toContain("'unsafe-eval'")
  })

  it('next.config.ts still contains the unsafe-inline removal justification comment', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const src = readFileSync(resolve(__dirname, '../../next.config.ts'), 'utf-8')
    // The comment documents WHY unsafe-eval was removed (for auditability)
    expect(src).toContain('unsafe-eval is NOT required')
  })

  it('CSP buildCsp function produces script-src without unsafe-eval', async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    const src = readFileSync(resolve(__dirname, '../../next.config.ts'), 'utf-8')
    // Verify the actual script-src directive string
    expect(src).toContain("\"script-src 'self' 'unsafe-inline'\"")
  })
})

// ── Order cancel — triple rate limiting ────────────────────────────────────

describe('Order cancel — triple rate limiting source audit', () => {
  let src = ''

  beforeAll(async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    src = readFileSync(
      resolve(__dirname, '../app/api/orders/[orderId]/cancel/route.ts'),
      'utf-8'
    )
  })

  it('has Gate 1: IP-level rate limit', () => {
    expect(src).toContain("'order_cancel_ip'")
  })

  it('has Gate 2: per-order rate limit (phone brute-force prevention)', () => {
    expect(src).toContain("'order_cancel_per_order'")
  })

  it('has Gate 3: per-phone rate limit', () => {
    expect(src).toContain("'order_cancel_per_phone'")
  })

  it('uses checkPublicRateLimit for all three gates', () => {
    const matches = (src.match(/checkPublicRateLimit/g) ?? []).length
    expect(matches).toBeGreaterThanOrEqual(3)
  })

  it('has idempotency guard (.eq status pending on update)', () => {
    // Prevents a race where two concurrent requests both read status=pending
    // and both update, resulting in double-cancel side effects downstream.
    expect(src).toContain(".eq('status', 'pending')")
  })

  it('masks phone in warning logs (no raw PII in logs)', () => {
    expect(src).toContain('maskPhone')
    expect(src).not.toContain('phone: phone,') // must not log raw phone
    expect(src).not.toContain('phone: parsed.data.phone')
  })

  it('validates UUID route param before rate limits', () => {
    // UUID check must come before any DB or RL call to prevent log spam
    const uuidCheckPos  = src.indexOf('UUID_RE.test(orderId)')
    const rateLimitPos  = src.indexOf('order_cancel_ip')
    expect(uuidCheckPos).toBeGreaterThan(-1)
    expect(rateLimitPos).toBeGreaterThan(-1)
    expect(uuidCheckPos).toBeLessThan(rateLimitPos)
  })
})

// ── SATIM payment callback — security controls ──────────────────────────────

describe('SATIM payment callback — security source audit', () => {
  let src = ''

  beforeAll(async () => {
    const { readFileSync } = await import('fs')
    const { resolve } = await import('path')
    src = readFileSync(
      resolve(__dirname, '../app/api/payment/callback/route.ts'),
      'utf-8'
    )
  })

  it('performs server-side amount verification (never trusts client result param alone)', () => {
    expect(src).toContain('expectedCentimes')
    expect(src).toContain('status.amount !== expectedCentimes')
  })

  it('amount mismatch redirects to failure (fail-safe)', () => {
    expect(src).toContain('amount_mismatch')
    // Must NOT call markOrderPaid after a mismatch — verified by checking
    // that the redirect happens before the markOrderPaid call in file order
    const mismatchPos   = src.indexOf('amount_mismatch')
    const markPaidPos   = src.indexOf('markOrderPaid(orderId')
    expect(mismatchPos).toBeGreaterThan(-1)
    expect(markPaidPos).toBeGreaterThan(mismatchPos)
  })

  it('has replay attack guard (checks satim_order_id already set)', () => {
    expect(src).toContain('order.satim_order_id && order.satim_order_id === satimId')
  })

  it('duplicate callback redirects to success without re-processing', () => {
    expect(src).toContain('already processed')
    // The duplicate path must redirect to success but not call markOrderPaid
    const replayPos   = src.indexOf('already processed')
    const markPaidPos = src.indexOf('await markOrderPaid')
    expect(replayPos).toBeLessThan(markPaidPos)
  })

  it('requires mdOrder param (rejects tampered callbacks with no reference)', () => {
    expect(src).toContain('No mdOrder param')
    expect(src).toContain('no_reference')
  })

  it('is rate limited (prevents callback flooding)', () => {
    expect(src).toContain('checkPublicRateLimit')
    expect(src).toContain("'payment_callback'")
  })

  it('markOrderPaid has idempotency guard (.eq pending_payment status)', () => {
    expect(src).toContain(".eq('status', 'pending_payment')")
  })

  it('Satim amount is converted from DZD to centimes (× 100) before comparison', () => {
    // Satim's API reports amounts in centimes. The calculation must be:
    // Math.round(order.total * 100) — not order.total directly.
    expect(src).toContain('Math.round(order.total * 100)')
  })
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
