import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signAdminToken, verifyAdminToken, decodeAdminToken, ADMIN_TOKEN_MAX_AGE_SECONDS } from '@/lib/auth/jwt'

describe('JWT admin tokens', () => {
  const TEST_SECRET = 'a-very-secure-jwt-secret-that-is-long-enough'

  beforeEach(() => {
    vi.stubEnv('ADMIN_JWT_SECRET', TEST_SECRET)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('ADMIN_TOKEN_MAX_AGE_SECONDS is 2 hours', () => {
    expect(ADMIN_TOKEN_MAX_AGE_SECONDS).toBe(7200)
  })

  it('signs and verifies a token round-trip', async () => {
    const token = await signAdminToken()
    const payload = await verifyAdminToken(token)
    expect(payload).not.toBeNull()
    expect(payload!.role).toBe('admin')
    expect(payload!.jti).toBeDefined()
  })

  it('uses the provided JTI', async () => {
    const jti = 'custom-jti-123'
    const token = await signAdminToken(jti)
    const payload = await verifyAdminToken(token)
    expect(payload!.jti).toBe(jti)
  })

  it('verifyAdminToken returns null for invalid token', async () => {
    const result = await verifyAdminToken('garbage-token')
    expect(result).toBeNull()
  })

  it('verifyAdminToken returns null for token signed with different secret', async () => {
    const token = await signAdminToken()
    vi.stubEnv('ADMIN_JWT_SECRET', 'different-secret-that-is-long-enough')
    const result = await verifyAdminToken(token)
    expect(result).toBeNull()
  })

  it('signAdminToken throws if secret is missing', async () => {
    vi.stubEnv('ADMIN_JWT_SECRET', '')
    await expect(signAdminToken()).rejects.toThrow()
  })

  describe('decodeAdminToken', () => {
    it('decodes a valid token without verifying', async () => {
      const token = await signAdminToken('test-jti')
      const payload = decodeAdminToken(token)
      expect(payload).not.toBeNull()
      expect(payload!.jti).toBe('test-jti')
      expect(payload!.role).toBe('admin')
    })

    it('returns null for garbage token', () => {
      expect(decodeAdminToken('not.a.valid.jwt')).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(decodeAdminToken('')).toBeNull()
    })
  })
})
