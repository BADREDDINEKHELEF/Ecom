import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateEnv } from '@/lib/config/env'

describe('validateEnv', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abcdefgh.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service-key')
    vi.stubEnv('ADMIN_JWT_SECRET', 'a'.repeat(32))
    vi.stubEnv('ADMIN_SECRET', 'a'.repeat(12))
    vi.stubEnv('FIELD_ENCRYPTION_KEY', 'a'.repeat(64))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns valid when all required vars are set', () => {
    const result = validateEnv()
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('reports error when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    const result = validateEnv()
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('NEXT_PUBLIC_SUPABASE_URL'))).toBe(true)
  })

  it('reports error when SUPABASE_SERVICE_ROLE_KEY is too short', () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'short')
    const result = validateEnv()
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('too short'))).toBe(true)
  })

  it('reports error for placeholder values', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://your_project.supabase.co')
    const result = validateEnv()
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('placeholder'))).toBe(true)
  })

  it('reports warnings for missing feature vars', () => {
    vi.stubEnv('ADMIN_JWT_SECRET', '')
    const result = validateEnv()
    expect(result.warnings.some(w => w.includes('ADMIN_JWT_SECRET'))).toBe(true)
  })

  it('reports warnings for missing optional services', () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    const result = validateEnv()
    expect(result.warnings.some(w => w.includes('UPSTASH_REDIS_REST_URL'))).toBe(true)
  })
})
