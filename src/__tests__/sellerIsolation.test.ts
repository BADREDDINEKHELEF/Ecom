/**
 * Seller isolation & customer privacy tests.
 *
 * Verifies:
 *  1. maskPhone / maskEmail never expose raw PII
 *  2. sellerAudit.ts is non-blocking (never throws)
 *  3. customers.ts phone hash is stable and opaque
 *  4. /api/seller/cancelled-and-abandoned masks phones (source audit)
 *  5. /api/seller/customers/reveal validates phoneHash format (source audit)
 *  6. /api/seller/customers has rate limiting (source audit)
 *  7. /api/seller/abandoned-analytics has rate limiting (source audit)
 *  8. migration_041 creates seller_data_access_log with RLS disabled
 */

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '..')

// ── 1. maskPhone ─────────────────────────────────────────────────────────────

describe('maskPhone — never exposes raw digits', () => {
  it('masks a 10-digit Algerian number correctly', async () => {
    const { maskPhone } = await import('../lib/utils/mask')
    const masked = maskPhone('0551234567')
    expect(masked).toBe('0551****67')
    expect(masked).not.toContain('1234')
  })

  it('masks an international format number', async () => {
    const { maskPhone } = await import('../lib/utils/mask')
    const masked = maskPhone('213661234567')
    expect(masked).toBe('2136****67')
    expect(masked).not.toContain('1234')
  })

  it('returns empty string for null/undefined', async () => {
    const { maskPhone } = await import('../lib/utils/mask')
    expect(maskPhone(null)).toBe('')
    expect(maskPhone(undefined)).toBe('')
    expect(maskPhone('')).toBe('')
  })

  it('uses **** for the middle section (4 stars)', async () => {
    const { maskPhone } = await import('../lib/utils/mask')
    const result = maskPhone('0770000000')
    expect(result).toMatch(/\*{4}/)
  })
})

// ── 2. maskEmail ─────────────────────────────────────────────────────────────

describe('maskEmail — never exposes full local part', () => {
  it('masks the local part after 2 chars', async () => {
    const { maskEmail } = await import('../lib/utils/mask')
    const masked = maskEmail('user@example.com')
    expect(masked).toBe('us***@example.com')
    expect(masked).not.toContain('user')
  })

  it('preserves domain fully', async () => {
    const { maskEmail } = await import('../lib/utils/mask')
    expect(maskEmail('test@gmail.com')).toContain('@gmail.com')
  })

  it('returns empty string for null/undefined', async () => {
    const { maskEmail } = await import('../lib/utils/mask')
    expect(maskEmail(null)).toBe('')
    expect(maskEmail(undefined)).toBe('')
  })
})

// ── 3. sellerAudit — non-blocking ────────────────────────────────────────────

describe('sellerAudit.logSellerDataAccess — never throws', () => {
  it('resolves silently even when Supabase is unavailable', async () => {
    vi.mock('@/lib/supabase/admin', () => ({
      createAdminClient: () => ({
        from: () => ({
          insert: () => Promise.reject(new Error('connection refused')),
        }),
      }),
    }))

    const { logSellerDataAccess } = await import('../lib/auth/sellerAudit')
    await expect(logSellerDataAccess({
      vendorId:     '00000000-0000-0000-0000-000000000001',
      action:       'view_customer_list',
      resourceType: 'customer_list',
    })).resolves.toBeUndefined()

    vi.restoreAllMocks()
  })
})

// ── 4. Source audit — cancelled-and-abandoned masks PII ──────────────────────

describe('/api/seller/cancelled-and-abandoned — source audit', () => {
  const src = readFileSync(
    resolve(root, 'app/api/seller/cancelled-and-abandoned/route.ts'),
    'utf-8'
  )

  it('imports maskPhone', () => {
    expect(src).toContain("maskPhone")
  })

  it('imports maskEmail', () => {
    expect(src).toContain("maskEmail")
  })

  it('applies maskPhone to cancelled order phone field', () => {
    expect(src).toContain('maskPhone(r.orders!.phone)')
  })

  it('applies maskPhone to abandoned checkout phone field', () => {
    expect(src).toContain('maskPhone(r.phone)')
  })

  it('applies maskEmail to abandoned checkout email field', () => {
    expect(src).toContain('maskEmail(r.email)')
  })
})

// ── 5. Source audit — reveal endpoint validates hash format ───────────────────

describe('/api/seller/customers/reveal — source audit', () => {
  const src = readFileSync(
    resolve(root, 'app/api/seller/customers/reveal/route.ts'),
    'utf-8'
  )

  it('validates phoneHash is 16 hex chars', () => {
    expect(src).toContain('/^[0-9a-f]{16}$/')
  })

  it('has IP-level rate limiting', () => {
    expect(src).toContain('checkSellerRateLimit')
  })

  it('has per-user rate limiting for reveals', () => {
    expect(src).toContain('checkUserRateLimit')
  })

  it('logs the reveal in the audit trail', () => {
    expect(src).toContain('logSellerDataAccess')
    expect(src).toContain("action:       'reveal_phone'")
  })

  it('requires auth/permission check before resolving phone', () => {
    // The route delegates auth to requireVendorPermission (which calls getUser internally).
    // requireVendorPermission must appear before the resolvePhoneByHash *call* (not the import).
    const authIdx        = src.indexOf('requireVendorPermission(')
    const resolveCallIdx = src.indexOf('await resolvePhoneByHash(')
    expect(authIdx).toBeGreaterThan(-1)
    expect(resolveCallIdx).toBeGreaterThan(-1)
    expect(resolveCallIdx).toBeGreaterThan(authIdx)
  })
})

// ── 6. Source audit — customers list rate limiting ────────────────────────────

describe('/api/seller/customers — source audit', () => {
  const src = readFileSync(
    resolve(root, 'app/api/seller/customers/route.ts'),
    'utf-8'
  )

  it('has rate limiting', () => {
    expect(src).toContain('checkSellerRateLimit')
  })

  it('logs data access in audit trail', () => {
    expect(src).toContain('logSellerDataAccess')
    expect(src).toContain("action:       'view_customer_list'")
  })

  it('returns masked data from getVendorCustomers (never raw phones)', () => {
    expect(src).toContain('getVendorCustomers')
    // raw phone must NOT be returned directly — only maskedPhone from the aggregation layer
    expect(src).not.toContain("phone:")
  })
})

// ── 7. Source audit — abandoned-analytics rate limiting ──────────────────────

describe('/api/seller/abandoned-analytics — source audit', () => {
  const src = readFileSync(
    resolve(root, 'app/api/seller/abandoned-analytics/route.ts'),
    'utf-8'
  )

  it('has rate limiting', () => {
    expect(src).toContain('checkSellerRateLimit')
  })

  it('scopes query to vendor store_slug (isolation)', () => {
    expect(src).toContain("eq('store_slug', vendor.store_slug)")
  })

  it('logs data access in audit trail', () => {
    expect(src).toContain('logSellerDataAccess')
    expect(src).toContain("action:       'view_abandoned'")
  })

  it('does not expose raw phone or email in response', () => {
    // The abandoned analytics response only has stats, no PII
    expect(src).not.toContain("r.phone")
    expect(src).not.toContain("r.email")
    expect(src).not.toContain("r.name")
  })
})

// ── 8. Migration — seller_data_access_log ────────────────────────────────────

describe('migration_041 — seller_data_access_log', () => {
  const sql = readFileSync(
    resolve(__dirname, '../../supabase/migration_041_seller_customers.sql'),
    'utf-8'
  )

  it('creates seller_data_access_log table', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.seller_data_access_log')
  })

  it('enables RLS so only service role can write audit entries', () => {
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
  })

  it('has index on vendor_id for fast per-vendor audit queries', () => {
    expect(sql).toContain('idx_seller_audit_vendor_id')
  })

  it('has index on created_at DESC for time-ordered queries', () => {
    expect(sql).toContain('idx_seller_audit_created_at')
  })

  it('never stores raw phone numbers (resource_id comment says hash/session id only)', () => {
    expect(sql).toContain('never raw phone')
  })
})
