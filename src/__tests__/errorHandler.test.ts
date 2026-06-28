import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiError, handleUnknownError } from '@/lib/api/errorHandler'

describe('apiError', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns correct status for UNAUTHORIZED', async () => {
    const response = apiError('UNAUTHORIZED')
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.code).toBe('UNAUTHORIZED')
    expect(body.error).toContain('Authentification')
  })

  it('returns correct status for FORBIDDEN', async () => {
    const response = apiError('FORBIDDEN')
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.code).toBe('FORBIDDEN')
  })

  it('returns correct status for RATE_LIMITED', async () => {
    const response = apiError('RATE_LIMITED')
    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.error).toContain('requêtes')
  })

  it('returns correct status for INTERNAL', async () => {
    const response = apiError('INTERNAL')
    expect(response.status).toBe(500)
  })

  it('returns correct status for INSUFFICIENT_STOCK', async () => {
    const response = apiError('INSUFFICIENT_STOCK')
    expect(response.status).toBe(409)
  })

  it('returns correct status for VALIDATION_ERROR', async () => {
    const response = apiError('VALIDATION_ERROR')
    expect(response.status).toBe(400)
  })

  it('logs internal details without exposing them in response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('DB connection failed')
    const response = apiError('INTERNAL', err)
    const body = await response.json()
    expect(body.error).not.toContain('DB connection')
    expect(body.error).toContain('Erreur interne')
  })
})

describe('handleUnknownError', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps stock errors to INSUFFICIENT_STOCK', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = handleUnknownError(new Error('Insufficient stock for item'))
    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.code).toBe('INSUFFICIENT_STOCK')
  })

  it('maps "not found" errors to PRODUCT_NOT_FOUND', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = handleUnknownError(new Error('Product not found'))
    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.code).toBe('PRODUCT_NOT_FOUND')
  })

  it('maps BOOKING_CONFLICT errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = handleUnknownError(new Error('BOOKING_CONFLICT detected'))
    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.code).toBe('BOOKING_CONFLICT')
  })

  it('falls back to INTERNAL for unknown errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = handleUnknownError(new Error('random error'))
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.code).toBe('INTERNAL')
  })

  it('handles non-Error objects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = handleUnknownError('string error')
    expect(response.status).toBe(500)
  })
})
