import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock local dependencies of the API routes to prevent real SMTP or network calls
vi.mock('@/lib/auth/rateLimit', () => ({
  checkOtpSendRateLimit: () => Promise.resolve({ allowed: true }),
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

// Define top-level mock functions that we can customize inside each test
const mockFrom = vi.fn()
const mockUpdateUserById = vi.fn()
const mockListUsers = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
    auth: {
      admin: {
        updateUserById: mockUpdateUserById,
        listUsers: mockListUsers,
      },
    },
  }),
}))

describe('OTP Fallback and Case Insensitivity Queries', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockFrom.mockReset()
    mockUpdateUserById.mockReset()
    mockListUsers.mockReset()
  })

  // Helper to construct a request
  function makeReq(url: string, body: any): NextRequest {
    return new NextRequest(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('forgot-password uses case-insensitive ilike for vendors query', async () => {
    const mockIlike = vi.fn().mockReturnThis()
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'v-1' }, error: null })
    const mockSelect = vi.fn().mockReturnValue({ ilike: mockIlike, maybeSingle: mockMaybeSingle })
    const mockDelete = vi.fn().mockReturnThis()
    const mockOr = vi.fn().mockResolvedValue({ error: null })
    const mockInsert = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table) => {
      if (table === 'vendors') {
        return { select: mockSelect }
      }
      if (table === 'password_reset_otps') {
        return { delete: mockDelete, or: mockOr, insert: mockInsert }
      }
      return {}
    })

    mockDelete.mockReturnValue({ or: mockOr })

    const { POST } = await import('../app/api/seller/forgot-password/route')
    const req = makeReq('http://localhost/api/seller/forgot-password', { email: 'MixedCase@example.com' })
    const res = await POST(req)
    expect(res.status).toBe(200)

    // Check that we queried 'vendors' table
    expect(mockFrom).toHaveBeenCalledWith('vendors')
    // Check that it was a case-insensitive query on email
    expect(mockIlike).toHaveBeenCalledWith('email', 'mixedcase@example.com')
  })

  it('send-email-otp writes to both columns and falls back if email column is missing', async () => {
    const mockInsert = vi.fn()
      // First insert fails with 42703 (undefined column email)
      .mockResolvedValueOnce({ error: { code: '42703', message: 'column "email" does not exist' } })
      // Second insert succeeds
      .mockResolvedValueOnce({ error: null })

    const mockDelete = vi.fn().mockReturnThis()
    const mockOr = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table) => {
      if (table === 'password_reset_otps') {
        return { delete: mockDelete, insert: mockInsert }
      }
      return {}
    })
    mockDelete.mockReturnValue({ or: mockOr })

    const { POST } = await import('../app/api/seller/send-email-otp/route')
    const req = makeReq('http://localhost/api/seller/send-email-otp', { email: 'user@example.com' })
    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockInsert).toHaveBeenCalledTimes(2)
    // First try with both columns
    expect(mockInsert.mock.calls[0][0]).toEqual({
      phone: 'user@example.com',
      email: 'user@example.com',
      otp: expect.any(String),
      expires_at: expect.any(String),
    })
    // Second try fallback with phone only
    expect(mockInsert.mock.calls[1][0]).toEqual({
      phone: 'user@example.com',
      otp: expect.any(String),
      expires_at: expect.any(String),
    })
  })

  it('verify-otp falls back to phone query if email query returns no records', async () => {
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockReturnThis()
    const mockMaybeSingle = vi.fn()
      // First call (querying email column on password_reset_otps) -> no record
      .mockResolvedValueOnce({ data: null, error: null })
      // Second call (fallback: querying phone column on password_reset_otps) -> valid record
      .mockResolvedValueOnce({
        data: { id: 'otp-1', otp: '123456', expires_at: new Date(Date.now() + 60000).toISOString(), used: false },
        error: null,
      })
      // Third call (querying email on vendors) -> returns vendor
      .mockResolvedValueOnce({ data: { user_id: 'u-1' }, error: null })

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
      maybeSingle: mockMaybeSingle,
    })

    const mockIlike = vi.fn().mockReturnValue({
      maybeSingle: mockMaybeSingle,
    })

    const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

    mockFrom.mockImplementation((table) => {
      if (table === 'password_reset_otps') {
        return { select: mockSelect, update: mockUpdate }
      }
      if (table === 'vendors') {
        return { select: vi.fn().mockReturnValue({ ilike: mockIlike }) }
      }
      return {}
    })

    mockUpdateUserById.mockResolvedValue({ error: null })

    const { POST } = await import('../app/api/seller/verify-otp/route')
    const req = makeReq('http://localhost/api/seller/verify-otp', {
      email: 'user@example.com',
      otp: '123456',
      newPassword: 'new-secure-password-123',
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    // Verify it queried both tables
    expect(mockFrom).toHaveBeenCalledWith('password_reset_otps')
    expect(mockFrom).toHaveBeenCalledWith('vendors')
    // Verify it queried vendors case-insensitively using ilike
    expect(mockIlike).toHaveBeenCalledWith('email', 'user@example.com')
  })

  it('verify-email-otp falls back to phone query if email query returns no records', async () => {
    const mockEq = vi.fn().mockReturnThis()
    const mockOrder = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockReturnThis()
    const mockMaybeSingle = vi.fn()
      // First call (querying email column on password_reset_otps) -> no record
      .mockResolvedValueOnce({ data: null, error: null })
      // Second call (fallback: querying phone column on password_reset_otps) -> valid record
      .mockResolvedValueOnce({
        data: { id: 'otp-2', otp: '654321', expires_at: new Date(Date.now() + 60000).toISOString(), used: false },
        error: null,
      })

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      limit: mockLimit,
      maybeSingle: mockMaybeSingle,
    })

    const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

    mockFrom.mockImplementation((table) => {
      if (table === 'password_reset_otps') {
        return { select: mockSelect, update: mockUpdate }
      }
      return {}
    })

    const { POST } = await import('../app/api/seller/verify-email-otp/route')
    const req = makeReq('http://localhost/api/seller/verify-email-otp', {
      email: 'register@example.com',
      otp: '654321',
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    // Verify it marked the OTP as used
    expect(mockUpdate).toHaveBeenCalledWith({ used: true })
  })

  it('forgot-password falls back to auth user and backfills vendor email if missing in vendors table', async () => {
    // 1st vendors lookup returns null (email not in table), 2nd lookup by user_id returns vendor
    const mockMaybeSingleVendors = vi.fn()
      .mockResolvedValueOnce({ data: null, error: null }) // 1st lookup by email
      .mockResolvedValueOnce({ data: { id: 'v-legacy' }, error: null }) // 2nd lookup by user_id

    const mockSelectVendors = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleVendors }),
      ilike: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleVendors }),
    })

    const mockUpdateVendors = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    })

    const mockDelete = vi.fn().mockReturnThis()
    const mockOr = vi.fn().mockResolvedValue({ error: null })
    const mockInsert = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table) => {
      if (table === 'vendors') {
        return { select: mockSelectVendors, update: mockUpdateVendors }
      }
      if (table === 'password_reset_otps') {
        return { delete: mockDelete, or: mockOr, insert: mockInsert }
      }
      return {}
    })
    mockDelete.mockReturnValue({ or: mockOr })

    // listUsers returns a valid auth user
    mockListUsers.mockResolvedValue({ data: { users: [{ id: 'u-legacy', email: 'legacy@example.com' }] } })

    const { POST } = await import('../app/api/seller/forgot-password/route')
    const req = makeReq('http://localhost/api/seller/forgot-password', { email: 'legacy@example.com' })
    const res = await POST(req)
    expect(res.status).toBe(200)

    // Verify fallback auth listUsers was called
    expect(mockListUsers).toHaveBeenCalled()
    // Verify it backfilled the email column in the vendors table
    expect(mockUpdateVendors).toHaveBeenCalledWith({ email: 'legacy@example.com' })
  })

  it('verify-otp falls back to auth user and backfills vendor email if missing in vendors table', async () => {
    const mockMaybeSingle = vi.fn()
      // First call (querying email column on password_reset_otps) -> valid record
      .mockResolvedValueOnce({
        data: { id: 'otp-1', otp: '123456', expires_at: new Date(Date.now() + 60000).toISOString(), used: false },
        error: null,
      })
      // Second call (querying email on vendors) -> returns null
      .mockResolvedValueOnce({ data: null, error: null })
      // Third call (querying user_id on vendors fallback) -> returns vendor
      .mockResolvedValueOnce({ data: { user_id: 'u-legacy', id: 'v-legacy' }, error: null })

    const mockSelectOtps = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: mockMaybeSingle,
    })

    const mockSelectVendors = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
      ilike: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
    })

    const mockUpdateVendors = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null })
    })

    const mockUpdateOtps = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

    mockFrom.mockImplementation((table) => {
      if (table === 'password_reset_otps') {
        return { select: mockSelectOtps, update: mockUpdateOtps }
      }
      if (table === 'vendors') {
        return { select: mockSelectVendors, update: mockUpdateVendors }
      }
      return {}
    })

    mockUpdateUserById.mockResolvedValue({ error: null })
    mockListUsers.mockResolvedValue({ data: { users: [{ id: 'u-legacy', email: 'legacy@example.com' }] } })

    const { POST } = await import('../app/api/seller/verify-otp/route')
    const req = makeReq('http://localhost/api/seller/verify-otp', {
      email: 'legacy@example.com',
      otp: '123456',
      newPassword: 'new-secure-password-123',
    })
    const res = await POST(req)
    expect(res.status).toBe(200)

    // Verify it backfilled email column in vendors table
    expect(mockUpdateVendors).toHaveBeenCalledWith({ email: 'legacy@example.com' })
  })
})
