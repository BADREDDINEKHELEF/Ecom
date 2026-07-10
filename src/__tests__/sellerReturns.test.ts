/**
 * Seller returns security & isolation tests.
 *
 * Verifies:
 *  1. /api/seller/returns enforces rate limiting and scopes queries by vendor_id.
 *  2. /api/seller/returns/[id] enforces rate limiting, dual limit quotas, and ownership verification.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '..')

describe('Seller Returns GET API endpoint — /api/seller/returns', () => {
  const src = readFileSync(
    resolve(root, 'app/api/seller/returns/route.ts'),
    'utf-8'
  )

  it('enforces API rate-limiting via checkSellerRateLimit', () => {
    expect(src).toContain('checkSellerRateLimit')
  })

  it('authenticates vendor session via requireVendorPermission with orders:read', () => {
    expect(src).toContain('requireVendorPermission')
    expect(src).toContain("'orders:read'")
    expect(src).not.toContain('getVendorByUserIdServer')
  })

  it('scopes return query strictly to logged-in vendor ID (data isolation)', () => {
    expect(src).toContain(".eq('vendor_id', vendor.id)")
  })
})

describe('Seller Returns PATCH API endpoint — /api/seller/returns/[id]', () => {
  const src = readFileSync(
    resolve(root, 'app/api/seller/returns/[id]/route.ts'),
    'utf-8'
  )

  it('enforces API rate-limiting via checkSellerRateLimit and checkUserDualRateLimit', () => {
    expect(src).toContain('checkSellerRateLimit')
    expect(src).toContain('checkUserDualRateLimit')
  })

  it('authenticates vendor session via requireVendorPermission with orders:update', () => {
    expect(src).toContain('requireVendorPermission')
    expect(src).toContain("'orders:update'")
    expect(src).not.toContain('getVendorByUserIdServer')
  })

  it('verifies ownership of the return request before executing update', () => {
    expect(src).toContain(".eq('vendor_id', vendor.id)")
  })

  it('restricts update status options to valid statuses', () => {
    expect(src).toContain("VALID_STATUSES = ['requested', 'approved', 'rejected', 'refunded', 'returned']")
  })

  it('limits max refund amount', () => {
    expect(src).toContain('MAX_REFUND_DZD = 10_000_000')
  })
})
