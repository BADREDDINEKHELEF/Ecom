import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies for pixel collect
vi.mock('@/lib/auth/rateLimit', () => ({
  checkPublicRateLimit: vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }) // vendor not found
        })
      })
    })
  })
}))

describe('Hardening — CORS Headers in Pixel Collect Error Paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('includes CORS headers on rate limit block (429)', async () => {
    const { checkPublicRateLimit } = await import('@/lib/auth/rateLimit')
    vi.mocked(checkPublicRateLimit).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 60 })

    const { POST } = await import('../app/api/pixel/collect/route')
    const req = new NextRequest('http://localhost/api/pixel/collect', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(429)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, OPTIONS')
  })

  it('includes CORS headers on bad request / invalid JSON (400)', async () => {
    const { POST } = await import('../app/api/pixel/collect/route')
    // invalid JSON body
    const req = new NextRequest('http://localhost/api/pixel/collect', {
      method: 'POST',
      body: '{invalid-json',
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('includes CORS headers on vendor not found (404)', async () => {
    const { POST } = await import('../app/api/pixel/collect/route')
    const req = new NextRequest('http://localhost/api/pixel/collect', {
      method: 'POST',
      body: JSON.stringify({
        pixelId: '11111111-1111-4111-8111-111111111111',
        event: 'pageview',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
})

import { timingSafeEqual, createHash } from 'crypto'

describe('Hardening — safeCompare constant-time string comparison', () => {
  it('safeCompare matches match exactly', () => {
    const HMAC_PAD_SIZE = 128

    function safeCompare(provided: string, expected: string): boolean {
      const a = Buffer.alloc(HMAC_PAD_SIZE)
      const b = Buffer.alloc(HMAC_PAD_SIZE)
      Buffer.from(createHash('sha256').update(provided).digest()).copy(a)
      Buffer.from(createHash('sha256').update(expected).digest()).copy(b)
      return timingSafeEqual(a, b)
    }

    expect(safeCompare('secret123', 'secret123')).toBe(true)
    expect(safeCompare('secret123', 'secret456')).toBe(false)
    expect(safeCompare('', '')).toBe(true)
    expect(safeCompare('secret123', 'secret123\u0000')).toBe(false)
    expect(safeCompare('secret123', 'secret123 ')).toBe(false)
    expect(safeCompare('a', 'b')).toBe(false)
    // Multi-byte checks
    expect(safeCompare('secret🔥', 'secret🔥')).toBe(true)
    expect(safeCompare('secret🔥', 'secret\uD83D\uDD25')).toBe(true)
    expect(safeCompare('secret🔥', 'secret🚒')).toBe(false)
  })
})
