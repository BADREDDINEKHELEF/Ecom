/**
 * Seller registration security tests.
 *
 * Covers duplicate email rejection, slug validation, and OTP expiry.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { validateStoreSlug } from '@/lib/validation/slug'
import { hashOtp } from '@/lib/auth/otp'

vi.mock('@/lib/auth/rateLimit', () => ({
  checkSellerRateLimit: () => Promise.resolve({ allowed: true }),
  checkOtpVerifyRateLimit: () => Promise.resolve({ allowed: true }),
}))

vi.mock('@/lib/notifications/email', () => ({
  sendEmail: () => Promise.resolve(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const mockFrom = vi.fn()
const mockCreateUser = vi.fn()
const mockUpdateUserById = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
    auth: {
      admin: {
        createUser: mockCreateUser,
        updateUserById: mockUpdateUserById,
      },
    },
  }),
}))

function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/seller/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  store_name: 'Test Store',
  store_slug: 'test-store',
  email: 'new@example.com',
  password: 'secure-pass-123',
  otp: '123456',
}

describe('Seller registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReset()
    mockCreateUser.mockReset()
    mockUpdateUserById.mockReset()
  })

  describe('slug validation', () => {
    it('rejects reserved slugs such as "admin"', async () => {
      const { POST } = await import('../app/api/seller/register/route')
      const res = await POST(makeReq({ ...validBody, store_slug: 'admin' }))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toMatch(/réservée/i)
    })

    it('rejects slugs with invalid format (double dash)', async () => {
      const { POST } = await import('../app/api/seller/register/route')
      const res = await POST(makeReq({ ...validBody, store_slug: 'test--store' }))
      expect(res.status).toBe(400)
    })

    it('rejects slugs with uppercase letters', async () => {
      const { POST } = await import('../app/api/seller/register/route')
      const res = await POST(makeReq({ ...validBody, store_slug: 'TestStore' }))
      expect(res.status).toBe(400)
    })

    it('validateStoreSlug accepts a valid slug and rejects reserved names', () => {
      expect(validateStoreSlug('my-store')).toEqual({ ok: true })
      expect(validateStoreSlug('admin')).toEqual({ ok: false, error: expect.stringMatching(/réservée/i) })
      expect(validateStoreSlug('my--store')).toEqual({ ok: false, error: expect.any(String) })
    })
  })

  describe('OTP expiry', () => {
    it('rejects an expired OTP before creating the auth user', async () => {
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'otp-1',
          otp_hash: 'salt:hash',
          expires_at: new Date(Date.now() - 60_000).toISOString(),
          used: false,
          purpose: 'registration',
        },
        error: null,
      })

      mockFrom.mockImplementation((table) => {
        if (table === 'password_reset_otps') {
          return {
            select: vi.fn().mockReturnValue({
              eq: mockEq,
              order: mockOrder,
              limit: mockLimit,
              maybeSingle: mockMaybeSingle,
            }),
          }
        }
        return {}
      })

      const { POST } = await import('../app/api/seller/register/route')
      const res = await POST(makeReq(validBody))
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toMatch(/expiré/i)
      expect(mockCreateUser).not.toHaveBeenCalled()
    })
  })

  describe('duplicate email', () => {
    it('returns 409 when the email is already registered in Supabase auth', async () => {
      const mockEq = vi.fn().mockReturnThis()
      const mockOrder = vi.fn().mockReturnThis()
      const mockLimit = vi.fn().mockReturnThis()
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'otp-2',
          otp_hash: hashOtp(validBody.otp),
          expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          used: false,
          purpose: 'registration',
        },
        error: null,
      })

      mockFrom.mockImplementation((table) => {
        if (table === 'password_reset_otps') {
          return {
            select: vi.fn().mockReturnValue({
              eq: mockEq,
              order: mockOrder,
              limit: mockLimit,
              maybeSingle: mockMaybeSingle,
            }),
          }
        }
        return {}
      })

      mockCreateUser.mockResolvedValue({
        user: null,
        error: { code: 'user_already_exists', message: 'User already registered' },
      })

      const { POST } = await import('../app/api/seller/register/route')
      const res = await POST(makeReq(validBody))
      expect(res.status).toBe(409)
      const json = await res.json()
      expect(json.error).toMatch(/déjà inscrit/i)
    })
  })
})
