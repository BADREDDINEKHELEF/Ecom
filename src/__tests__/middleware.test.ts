/**
 * Middleware security tests.
 *
 * Covers the edge middleware gates added in the hardening phase:
 *   - fake / malformed Supabase session cookie rejection for seller routes
 *   - seller session revocation check at the edge
 *   - admin JWT verification + Redis-backed JTI revocation
 *   - admin IP allowlist (fail-closed in production)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { SignJWT } from 'jose'
import { randomUUID } from 'crypto'

vi.mock('@/lib/auth/sellerSessions', () => ({
  isSessionRevoked: vi.fn(),
}))

const ADMIN_JWT_SECRET = 'a-very-long-test-secret-that-is-at-least-32-bytes-long'
const SUPABASE_URL = 'https://test-project.supabase.co'

function makeReq(path: string, init?: { headers?: Record<string, string>; cookies?: Record<string, string> }) {
  const headers: Record<string, string> = { 'x-real-ip': '1.2.3.4', ...(init?.headers ?? {}) }
  if (init?.cookies && Object.keys(init.cookies).length > 0) {
    headers.cookie = Object.entries(init.cookies)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('; ')
  }
  return new NextRequest(`http://localhost${path}`, { headers })
}

async function signAdminJwt() {
  vi.stubEnv('ADMIN_JWT_SECRET', ADMIN_JWT_SECRET)
  const { signAdminToken } = await import('../lib/auth/jwt')
  return signAdminToken()
}

async function signSupabaseSessionCookie(userId: string) {
  const secret = new TextEncoder().encode('any-secret-middleware-does-not-verify-signature')
  return new SignJWT({ sub: userId, iss: SUPABASE_URL })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(secret)
}

describe('middleware', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL)
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_AUTH_COOKIE_NAME', 'sb-test-auth-token')
    vi.stubEnv('ADMIN_IP_ALLOWLIST', '1.2.3.4')
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://test.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token')
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  describe('seller routes', () => {
    it('rejects a fake / malformed Supabase session cookie', async () => {
      const { middleware } = await import('../middleware')
      const req = makeReq('/api/seller/orders', { cookies: { 'sb-test-auth-token': 'not-a-jwt' } })
      const res = await middleware(req)
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('rejects a Supabase cookie with a non-UUID sub claim', async () => {
      const secret = new TextEncoder().encode('any-secret')
      const cookie = await new SignJWT({ sub: 'not-a-uuid', iss: SUPABASE_URL })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(secret)
      const { middleware } = await import('../middleware')
      const req = makeReq('/api/seller/orders', { cookies: { 'sb-test-auth-token': cookie } })
      const res = await middleware(req)
      expect(res.status).toBe(401)
    })

    it('allows a protected seller route when the session is valid and not revoked', async () => {
      const { middleware } = await import('../middleware')
      const { isSessionRevoked } = await import('@/lib/auth/sellerSessions')
      vi.mocked(isSessionRevoked).mockResolvedValue(false)

      const userId = randomUUID()
      const cookie = await signSupabaseSessionCookie(userId)
      const req = makeReq('/api/seller/orders', { cookies: { 'sb-test-auth-token': cookie } })
      const res = await middleware(req)
      expect(res.status).toBe(200)
      expect(isSessionRevoked).toHaveBeenCalledWith(
        userId,
        'unknown',
        '1.2.3.4',
      )
    })

    it('blocks a seller route when the device session is revoked', async () => {
      const { middleware } = await import('../middleware')
      const { isSessionRevoked } = await import('@/lib/auth/sellerSessions')
      vi.mocked(isSessionRevoked).mockResolvedValue(true)

      const userId = randomUUID()
      const cookie = await signSupabaseSessionCookie(userId)
      const req = makeReq('/api/seller/orders', { cookies: { 'sb-test-auth-token': cookie } })
      const res = await middleware(req)
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBe('Session revoked')
    })

    it('lets public seller auth endpoints bypass the session gate', async () => {
      const { middleware } = await import('../middleware')
      const req = makeReq('/api/seller/register')
      const res = await middleware(req)
      expect(res.status).toBe(200)
    })
  })

  describe('admin routes', () => {
    it('allows an admin request with a valid, non-revoked JWT', async () => {
      const fetchMock = vi.mocked(global.fetch)
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: 'valid' }) } as Response)

      const token = await signAdminJwt()
      const { middleware } = await import('../middleware')
      const req = makeReq('/api/admin/orders', { cookies: { admin_token: token } })
      const res = await middleware(req)
      expect(res.status).toBe(200)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('rejects an admin JWT whose JTI is revoked in Redis', async () => {
      const fetchMock = vi.mocked(global.fetch)
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: null }) } as Response)

      const token = await signAdminJwt()
      const { middleware } = await import('../middleware')
      const req = makeReq('/api/admin/orders', { cookies: { admin_token: token } })
      const res = await middleware(req)
      expect(res.status).toBe(401)
      const json = await res.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('rejects an admin JWT when the Redis revocation check fails', async () => {
      const fetchMock = vi.mocked(global.fetch)
      fetchMock.mockResolvedValue({ ok: false, status: 500 } as Response)

      const token = await signAdminJwt()
      const { middleware } = await import('../middleware')
      const req = makeReq('/api/admin/orders', { cookies: { admin_token: token } })
      const res = await middleware(req)
      expect(res.status).toBe(401)
    })

    it('lets public admin paths (login / refresh) bypass the JWT check', async () => {
      const { middleware } = await import('../middleware')
      const req = makeReq('/api/admin/login')
      const res = await middleware(req)
      expect(res.status).toBe(200)
    })
  })

  describe('admin IP allowlist', () => {
    it('denies admin traffic in production when ADMIN_IP_ALLOWLIST is missing', async () => {
      vi.unstubAllEnvs()
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL)
      // ADMIN_IP_ALLOWLIST intentionally not set

      const { middleware } = await import('../middleware')
      const req = makeReq('/api/admin/orders')
      const res = await middleware(req)
      expect(res.status).toBe(403)
      const text = await res.text()
      expect(text).toContain('IP address not allowed')
    })

    it('denies admin traffic from an IP not in the allowlist', async () => {
      vi.stubEnv('ADMIN_IP_ALLOWLIST', '5.6.7.8,9.10.11.12')
      const { middleware } = await import('../middleware')
      const req = makeReq('/api/admin/orders', { headers: { 'x-real-ip': '1.2.3.4' } })
      const res = await middleware(req)
      expect(res.status).toBe(403)
    })

    it('allows any IP when the allowlist is explicitly "*"', async () => {
      vi.stubEnv('ADMIN_IP_ALLOWLIST', '*')
      const { middleware } = await import('../middleware')
      const req = makeReq('/api/admin/login', { headers: { 'x-real-ip': '99.99.99.99' } })
      const res = await middleware(req)
      expect(res.status).toBe(200)
    })

    it('allows an admin request from an IP on the allowlist', async () => {
      vi.stubEnv('ADMIN_IP_ALLOWLIST', '5.6.7.8,1.2.3.4')
      const fetchMock = vi.mocked(global.fetch)
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: 'valid' }) } as Response)

      const token = await signAdminJwt()
      const { middleware } = await import('../middleware')
      const req = makeReq('/api/admin/orders', { cookies: { admin_token: token } })
      const res = await middleware(req)
      expect(res.status).toBe(200)
    })
  })
})
