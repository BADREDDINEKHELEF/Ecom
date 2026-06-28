import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { encryptField, decryptField, isEncrypted } from '@/lib/utils/crypto'

describe('crypto - encryptField / decryptField', () => {
  const TEST_KEY = 'a'.repeat(64) // 64 hex chars = 32 bytes

  beforeEach(() => {
    vi.stubEnv('FIELD_ENCRYPTION_KEY', TEST_KEY)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('encrypts and decrypts a string round-trip', () => {
    const plaintext = 'my-secret-api-token'
    const encrypted = encryptField(plaintext)
    expect(encrypted).not.toBe(plaintext)
    const decrypted = decryptField(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it('produces different ciphertext each time (random IV)', () => {
    const plaintext = 'same-input'
    const a = encryptField(plaintext)
    const b = encryptField(plaintext)
    expect(a).not.toBe(b)
  })

  it('returns plaintext when no key is configured', () => {
    vi.stubEnv('FIELD_ENCRYPTION_KEY', '')
    const plaintext = 'visible-token'
    expect(encryptField(plaintext)).toBe(plaintext)
    expect(decryptField(plaintext)).toBe(plaintext)
  })

  it('returns plaintext if key is wrong length', () => {
    vi.stubEnv('FIELD_ENCRYPTION_KEY', 'tooshort')
    const plaintext = 'visible-token'
    expect(encryptField(plaintext)).toBe(plaintext)
  })

  it('decryptField returns plaintext for non-encrypted format', () => {
    const plaintext = 'just-a-plain-value'
    expect(decryptField(plaintext)).toBe(plaintext)
  })

  it('decryptField returns empty string if key is wrong', () => {
    const encrypted = encryptField('hello')
    vi.stubEnv('FIELD_ENCRYPTION_KEY', 'b'.repeat(64))
    const result = decryptField(encrypted)
    expect(result).toBe('')
  })
})

describe('isEncrypted', () => {
  const TEST_KEY = 'a'.repeat(64)

  beforeEach(() => {
    vi.stubEnv('FIELD_ENCRYPTION_KEY', TEST_KEY)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns true for encrypted values', () => {
    const encrypted = encryptField('test')
    expect(isEncrypted(encrypted)).toBe(true)
  })

  it('returns false for plaintext', () => {
    expect(isEncrypted('just-plain-text')).toBe(false)
  })

  it('returns false for strings with wrong segment lengths', () => {
    expect(isEncrypted('a:b:c')).toBe(false)
  })
})
