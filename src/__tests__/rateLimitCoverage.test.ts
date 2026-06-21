/**
 * Rate limit coverage tests — verify every critical route has rate limiting.
 * Tests read source files directly to check for the presence of rate limit calls.
 * This prevents regressions where someone removes rate limiting by accident.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function src(relativePath: string): string {
  return readFileSync(resolve(__dirname, '..', relativePath), 'utf-8')
}

describe('checkSellerRateLimit — all seller routes', () => {
  const sellerRoutes = [
    'app/api/seller/analytics/route.ts',
    'app/api/seller/analytics/export/route.ts',
    'app/api/seller/flash-sales/route.ts',
    'app/api/seller/messages/route.ts',
    'app/api/seller/pending-orders/route.ts',
    'app/api/seller/questions/[questionId]/answer/route.ts',
    'app/api/seller/sponsored/route.ts',
    'app/api/seller/subscription/route.ts',
    'app/api/seller/vendor/vacation/route.ts',
    'app/api/seller/stores/route.ts',
    'app/api/seller/shipments/sync/route.ts',
    'app/api/seller/promo-codes/route.ts',
    'app/api/seller/delivery-config/route.ts',
    'app/api/seller/notifications/route.ts',
    'app/api/seller/shipments/route.ts',
    'app/api/seller/cancelled-and-abandoned/route.ts',
    'app/api/seller/delivery-dashboard/route.ts',
    'app/api/seller/test-yalidine/route.ts',
    'app/api/seller/test-apec/route.ts',
    'app/api/seller/orders/route.ts',
    'app/api/seller/vendor/route.ts',
    'app/api/seller/register/route.ts',
    'app/api/seller/upload/route.ts',
  ]

  for (const route of sellerRoutes) {
    it(`${route} uses checkSellerRateLimit`, () => {
      expect(src(route)).toContain('checkSellerRateLimit')
    })
  }
})

describe('checkAdminApiRateLimit — all admin routes', () => {
  const adminRoutes = [
    'app/api/admin/orders/route.ts',
    'app/api/admin/returns/route.ts',
    'app/api/admin/settings/announcement/route.ts',
    'app/api/admin/niches/order/route.ts',
    'app/api/admin/promotions/route.ts',
    'app/api/admin/subscriptions/route.ts',
    'app/api/admin/abandoned/route.ts',
    'app/api/admin/analytics/route.ts',
    'app/api/admin/niches/route.ts',
    'app/api/admin/promo-codes/route.ts',
    'app/api/admin/analytics/delivery/route.ts',
    'app/api/admin/analytics/customers/route.ts',
    'app/api/admin/analytics/sellers/route.ts',
    'app/api/admin/analytics/search/route.ts',
    'app/api/admin/analytics/revenue/route.ts',
    'app/api/admin/analytics/overview/route.ts',
    'app/api/admin/vendors/route.ts',
    'app/api/admin/questions/route.ts',
    'app/api/admin/returns/[id]/route.ts',
    'app/api/admin/vendors/[id]/verify/route.ts',
    'app/api/admin/logout/route.ts',
    'app/api/admin/refresh/route.ts',
    'app/api/delivery/shipment/route.ts',
  ]

  for (const route of adminRoutes) {
    it(`${route} uses checkAdminApiRateLimit`, () => {
      expect(src(route)).toContain('checkAdminApiRateLimit')
    })
  }
})

describe('Special rate limit functions', () => {
  it('admin/totp uses checkTotpSetupRateLimit', () => {
    expect(src('app/api/admin/totp/route.ts')).toContain('checkTotpSetupRateLimit')
  })

  it('sponsored uses checkPublicRateLimit', () => {
    expect(src('app/api/sponsored/route.ts')).toContain('checkPublicRateLimit')
  })

  it('products/related uses checkPublicRateLimit', () => {
    expect(src('app/api/products/related/route.ts')).toContain('checkPublicRateLimit')
  })
})

describe('Rate limit functions — logic tests', () => {
  it('checkSellerRateLimit is exported from rateLimit.ts', () => {
    expect(src('lib/auth/rateLimit.ts')).toContain('export async function checkSellerRateLimit')
  })

  it('checkAdminApiRateLimit is exported from rateLimit.ts', () => {
    expect(src('lib/auth/rateLimit.ts')).toContain('export async function checkAdminApiRateLimit')
  })

  it('checkTotpSetupRateLimit is exported from rateLimit.ts', () => {
    expect(src('lib/auth/rateLimit.ts')).toContain('export async function checkTotpSetupRateLimit')
  })

  it('rateLimit.ts logs violations via logger.warn', () => {
    expect(src('lib/auth/rateLimit.ts')).toContain("logger.warn('[rateLimit]")
  })

  it('all rate limit violations include Retry-After header — sample check on seller/upload', () => {
    const content = src('app/api/seller/upload/route.ts')
    expect(content).toContain('Retry-After')
    expect(content).toContain('429')
  })

  it('all rate limit violations include Retry-After header — sample check on admin/orders', () => {
    const content = src('app/api/admin/orders/route.ts')
    expect(content).toContain('Retry-After')
    expect(content).toContain('429')
  })
})
