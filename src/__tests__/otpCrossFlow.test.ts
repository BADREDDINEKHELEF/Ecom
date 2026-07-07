/**
 * OTP cross-flow replay prevention.
 *
 * Verifies that an OTP issued for one purpose cannot be replayed in another
 * flow (registration vs password reset).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { hashOtp } from '@/lib/auth/otp'

vi.mock('@/lib/auth/rateLimit', () => ({
  checkOtpSendRateLimit: () => Promise.resolve({ allowed: true }),
  checkOtpVerifyRateLimit: () => Promise.resolve({ allowed: true }),
  checkOtpVerifyFrontendRateLimit: () => Promise.resolve({ allowed: true }),
  checkSellerRateLimit: () => Promise.resolve({ allowed: true }),
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

function makeReq(url: string, body: Record<string, unknown>): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('OTP cross-flow replay prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReset()
    mockCreateUser.mockReset()
    mockUpdateUserById.mockReset()
  })

  it('password-reset flow rejects a registration OTP', async () => {
    const otp = '123456'
    const email = 'user@example.com'

    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockReturnThis()
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
      maybeSingle: mockMaybeSingle,
    })

    mockFrom.mockImplementation((table) => {
      if (table === 'password_reset_otps') return { select: mockSelect }
      return {}
    })

    const { POST } = await import('../app/api/seller/verify-otp/route')
    const res = await POST(makeReq('http://localhost/api/seller/verify-otp', {
      email,
      otp,
      newPassword: 'new-secure-password-123',
    }))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/invalide|expiré/i)

    // The verify-otp route must have filtered by purpose='password_reset'.
    const purposeCalls = mockEq.mock.calls.filter((call) => call[0] === 'purpose' && call[1] === 'password_reset')
    expect(purposeCalls.length).toBeGreaterThan(0)
  })

  it('registration flow rejects a password-reset OTP', async () => {
    const otp = '654321'
    const email = 'register@example.com'

    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockReturnThis()
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
      maybeSingle: mockMaybeSingle,
    })

    mockFrom.mockImplementation((table) => {
      if (table === 'password_reset_otps') return { select: mockSelect }
      return {}
    })

    const { POST } = await import('../app/api/seller/register/route')
    const res = await POST(makeReq('http://localhost/api/seller/register', {
      store_name: 'Test Store',
      store_slug: 'test-store',
      email,
      password: 'secure-pass-123',
      otp,
    }))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/invalide|Aucun code/i)

    // The register route must have filtered by purpose='registration'.
    const purposeCalls = mockEq.mock.calls.filter((call) => call[0] === 'purpose' && call[1] === 'registration')
    expect(purposeCalls.length).toBeGreaterThan(0)
  })
})
