import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the admin client before importing the route
const mockSingle = vi.fn()
const mockEq = vi.fn(() => ({ single: mockSingle }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

import { GET } from '@/app/api/health/route'

const originalFetch = globalThis.fetch
const originalEnv = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  delete process.env.BUILD_TIMESTAMP
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  process.env = { ...originalEnv }
})

describe('GET /api/health', () => {
  it('returns 200 when database is healthy', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 1 }, error: null })

    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.checks.database).toBe('ok')
    expect(body.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('returns 503 when database is unreachable', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'connection failed' } })

    const res = await GET()
    expect(res.status).toBe(503)

    const body = await res.json()
    expect(body.status).toBe('degraded')
    expect(body.checks.database).toBe('fail')
  })

  it('returns 503 when database check throws', async () => {
    mockSingle.mockRejectedValueOnce(new Error('timeout'))

    const res = await GET()
    expect(res.status).toBe(503)

    const body = await res.json()
    expect(body.status).toBe('degraded')
    expect(body.checks.database).toBe('fail')
  })

  it('includes redis check when configured and healthy', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    mockSingle.mockResolvedValueOnce({ data: { id: 1 }, error: null })
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true, status: 200 })

    const res = await GET()
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.checks.database).toBe('ok')
    expect(body.checks.redis).toBe('ok')
  })

  it('returns 503 when redis is configured but unreachable', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
    mockSingle.mockResolvedValueOnce({ data: { id: 1 }, error: null })
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('timeout'))

    const res = await GET()
    expect(res.status).toBe(503)

    const body = await res.json()
    expect(body.checks.database).toBe('ok')
    expect(body.checks.redis).toBe('fail')
  })

  it('omits redis check when not configured', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 1 }, error: null })

    const res = await GET()
    const body = await res.json()
    expect(body.checks).not.toHaveProperty('redis')
  })

  it('includes build timestamp when set', async () => {
    process.env.BUILD_TIMESTAMP = '2026-07-07T10:00:00.000Z'
    mockSingle.mockResolvedValueOnce({ data: { id: 1 }, error: null })

    const res = await GET()
    const body = await res.json()
    expect(body.buildTimestamp).toBe('2026-07-07T10:00:00.000Z')
  })

  it('returns null build timestamp when not set', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 1 }, error: null })

    const res = await GET()
    const body = await res.json()
    expect(body.buildTimestamp).toBeNull()
  })

  it('never exposes internal error details in the response', async () => {
    mockSingle.mockRejectedValueOnce(new Error('super secret db password'))

    const res = await GET()
    const text = await res.text()
    expect(text).not.toContain('super secret db password')
    expect(text).not.toContain('password')
  })

  it('sets cache-control to no-store', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 1 }, error: null })

    const res = await GET()
    expect(res.headers.get('Cache-Control')).toContain('no-store')
  })
})
