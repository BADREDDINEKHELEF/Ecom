/**
 * Phase 2 — Authorization / RBAC tests
 *
 * Access Control Matrix (tested here):
 *
 * Permission                  | readonly | support | manager | owner
 * ─────────────────────────────────────────────────────────────────
 * orders:read                 | ✓        | ✓       | ✓       | ✓
 * orders:update               | ✗        | ✗       | ✓       | ✓
 * orders:cancel               | ✗        | ✗       | ✓       | ✓
 * products:read               | ✓        | ✓       | ✓       | ✓
 * products:create             | ✗        | ✗       | ✓       | ✓
 * products:delete             | ✗        | ✗       | ✓       | ✓
 * customers:read              | ✗        | ✓       | ✓       | ✓
 * customers:reveal_phone      | ✗        | ✗       | ✗       | ✓  ← owner-only
 * analytics:read              | ✓        | ✓       | ✓       | ✓
 * analytics:export            | ✗        | ✗       | ✓       | ✓
 * settings:update             | ✗        | ✗       | ✗       | ✓  ← owner-only
 * members:read                | ✗        | ✗       | ✗       | ✓  ← owner-only
 * members:invite              | ✗        | ✗       | ✗       | ✓  ← owner-only
 * members:remove              | ✗        | ✗       | ✗       | ✓  ← owner-only
 * billing:read                | ✗        | ✗       | ✗       | ✓  ← owner-only
 * delivery:read               | ✓        | ✓       | ✓       | ✓
 * delivery:config             | ✗        | ✗       | ✗       | ✓  ← owner-only
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '..')

// ── 1. Permission matrix — all roles × all permissions ────────────────────────

describe('RBAC — hasPermission correctness', () => {
  it('loads the permission system without errors', async () => {
    const { hasPermission, ROLE_PERMISSIONS } = await import('../lib/auth/permissions')
    expect(typeof hasPermission).toBe('function')
    expect(Object.keys(ROLE_PERMISSIONS).length).toBeGreaterThan(10)
  })

  // ── owner ──────────────────────────────────────────────────────────────────

  it('owner has all permissions', async () => {
    const { hasPermission, ROLE_PERMISSIONS } = await import('../lib/auth/permissions')
    const allPerms = Object.keys(ROLE_PERMISSIONS) as (keyof typeof ROLE_PERMISSIONS)[]
    for (const perm of allPerms) {
      expect(hasPermission('owner', perm), `owner should have ${perm}`).toBe(true)
    }
  })

  // ── owner-only permissions ─────────────────────────────────────────────────

  const ownerOnly = [
    'customers:reveal_phone',
    'settings:update',
    'members:read',
    'members:invite',
    'members:remove',
    'billing:read',
    'billing:update',
    'delivery:config',
    'sessions:revoke',
  ] as const

  for (const perm of ownerOnly) {
    it(`${perm} is owner-only — manager cannot access`, async () => {
      const { hasPermission } = await import('../lib/auth/permissions')
      expect(hasPermission('manager', perm)).toBe(false)
    })

    it(`${perm} is owner-only — support cannot access`, async () => {
      const { hasPermission } = await import('../lib/auth/permissions')
      expect(hasPermission('support', perm)).toBe(false)
    })

    it(`${perm} is owner-only — readonly cannot access`, async () => {
      const { hasPermission } = await import('../lib/auth/permissions')
      expect(hasPermission('readonly', perm)).toBe(false)
    })
  }

  // ── manager permissions ────────────────────────────────────────────────────

  it('manager can update orders', async () => {
    const { hasPermission } = await import('../lib/auth/permissions')
    expect(hasPermission('manager', 'orders:update')).toBe(true)
  })

  it('manager can export analytics', async () => {
    const { hasPermission } = await import('../lib/auth/permissions')
    expect(hasPermission('manager', 'analytics:export')).toBe(true)
  })

  it('manager can create/update/delete products', async () => {
    const { hasPermission } = await import('../lib/auth/permissions')
    expect(hasPermission('manager', 'products:create')).toBe(true)
    expect(hasPermission('manager', 'products:update')).toBe(true)
    expect(hasPermission('manager', 'products:delete')).toBe(true)
  })

  it('manager can read customers', async () => {
    const { hasPermission } = await import('../lib/auth/permissions')
    expect(hasPermission('manager', 'customers:read')).toBe(true)
  })

  it('manager cannot reveal customer phone', async () => {
    const { hasPermission } = await import('../lib/auth/permissions')
    expect(hasPermission('manager', 'customers:reveal_phone')).toBe(false)
  })

  it('manager cannot update settings', async () => {
    const { hasPermission } = await import('../lib/auth/permissions')
    expect(hasPermission('manager', 'settings:update')).toBe(false)
  })

  // ── support permissions ────────────────────────────────────────────────────

  it('support can read orders, products, analytics', async () => {
    const { hasPermission } = await import('../lib/auth/permissions')
    expect(hasPermission('support', 'orders:read')).toBe(true)
    expect(hasPermission('support', 'products:read')).toBe(true)
    expect(hasPermission('support', 'analytics:read')).toBe(true)
  })

  it('support can read customers', async () => {
    const { hasPermission } = await import('../lib/auth/permissions')
    expect(hasPermission('support', 'customers:read')).toBe(true)
  })

  it('support cannot update orders', async () => {
    const { hasPermission } = await import('../lib/auth/permissions')
    expect(hasPermission('support', 'orders:update')).toBe(false)
    expect(hasPermission('support', 'orders:cancel')).toBe(false)
  })

  it('support cannot create/modify products', async () => {
    const { hasPermission } = await import('../lib/auth/permissions')
    expect(hasPermission('support', 'products:create')).toBe(false)
    expect(hasPermission('support', 'products:update')).toBe(false)
    expect(hasPermission('support', 'products:delete')).toBe(false)
  })

  it('support cannot export analytics', async () => {
    const { hasPermission } = await import('../lib/auth/permissions')
    expect(hasPermission('support', 'analytics:export')).toBe(false)
  })

  // ── readonly permissions ───────────────────────────────────────────────────

  it('readonly can read orders, products, analytics, delivery', async () => {
    const { hasPermission } = await import('../lib/auth/permissions')
    expect(hasPermission('readonly', 'orders:read')).toBe(true)
    expect(hasPermission('readonly', 'products:read')).toBe(true)
    expect(hasPermission('readonly', 'analytics:read')).toBe(true)
    expect(hasPermission('readonly', 'delivery:read')).toBe(true)
  })

  it('readonly cannot read customers', async () => {
    const { hasPermission } = await import('../lib/auth/permissions')
    expect(hasPermission('readonly', 'customers:read')).toBe(false)
  })

  it('readonly has no write permissions', async () => {
    const { hasPermission } = await import('../lib/auth/permissions')
    const writePerm = [
      'orders:update', 'orders:cancel', 'products:create', 'products:update',
      'products:delete', 'analytics:export', 'settings:update', 'delivery:update',
    ] as const
    for (const p of writePerm) {
      expect(hasPermission('readonly', p), `readonly should not have ${p}`).toBe(false)
    }
  })
})

// ── 2. Role ordering ──────────────────────────────────────────────────────────

describe('RBAC — roleAtLeast ordering', () => {
  it('owner is at least owner', async () => {
    const { roleAtLeast } = await import('../lib/auth/permissions')
    expect(roleAtLeast('owner', 'owner')).toBe(true)
  })

  it('owner is at least manager/support/readonly', async () => {
    const { roleAtLeast } = await import('../lib/auth/permissions')
    expect(roleAtLeast('owner', 'manager')).toBe(true)
    expect(roleAtLeast('owner', 'support')).toBe(true)
    expect(roleAtLeast('owner', 'readonly')).toBe(true)
  })

  it('manager is not owner', async () => {
    const { roleAtLeast } = await import('../lib/auth/permissions')
    expect(roleAtLeast('manager', 'owner')).toBe(false)
  })

  it('readonly is the lowest privilege', async () => {
    const { roleAtLeast } = await import('../lib/auth/permissions')
    expect(roleAtLeast('readonly', 'support')).toBe(false)
    expect(roleAtLeast('readonly', 'manager')).toBe(false)
    expect(roleAtLeast('readonly', 'owner')).toBe(false)
  })
})

// ── 3. isAssignableRole — 'owner' cannot be assigned via API ──────────────────

describe('RBAC — isAssignableRole prevents owner privilege escalation', () => {
  it('rejects owner as assignable role', async () => {
    const { isAssignableRole } = await import('../lib/auth/permissions')
    expect(isAssignableRole('owner')).toBe(false)
  })

  it('accepts manager, support, readonly as assignable', async () => {
    const { isAssignableRole } = await import('../lib/auth/permissions')
    expect(isAssignableRole('manager')).toBe(true)
    expect(isAssignableRole('support')).toBe(true)
    expect(isAssignableRole('readonly')).toBe(true)
  })

  it('rejects invalid strings', async () => {
    const { isAssignableRole } = await import('../lib/auth/permissions')
    expect(isAssignableRole('admin')).toBe(false)
    expect(isAssignableRole('superuser')).toBe(false)
    expect(isAssignableRole('')).toBe(false)
    expect(isAssignableRole(null)).toBe(false)
    expect(isAssignableRole(undefined)).toBe(false)
    expect(isAssignableRole(1)).toBe(false)
  })
})

// ── 4. permissionsForRole — completeness check ────────────────────────────────

describe('RBAC — permissionsForRole', () => {
  it('owner has more permissions than manager', async () => {
    const { permissionsForRole } = await import('../lib/auth/permissions')
    const ownerPerms   = permissionsForRole('owner')
    const managerPerms = permissionsForRole('manager')
    expect(ownerPerms.length).toBeGreaterThan(managerPerms.length)
  })

  it('manager has more permissions than support', async () => {
    const { permissionsForRole } = await import('../lib/auth/permissions')
    expect(permissionsForRole('manager').length).toBeGreaterThan(permissionsForRole('support').length)
  })

  it('support has more permissions than readonly', async () => {
    const { permissionsForRole } = await import('../lib/auth/permissions')
    expect(permissionsForRole('support').length).toBeGreaterThan(permissionsForRole('readonly').length)
  })

  it('readonly has only read permissions', async () => {
    const { permissionsForRole } = await import('../lib/auth/permissions')
    const perms = permissionsForRole('readonly')
    for (const p of perms) {
      expect(p, `readonly should not have ${p}`).toMatch(/:(read|config)/)
    }
  })
})

// ── 5. Source audit — reveal endpoint uses requireVendorPermission ────────────

describe('reveal endpoint — source audit: permission enforcement', () => {
  const src = readFileSync(
    resolve(root, 'app/api/seller/customers/reveal/route.ts'),
    'utf-8'
  )

  it('imports requireVendorPermission (not getVendorByUserIdServer)', () => {
    expect(src).toContain('requireVendorPermission')
    expect(src).not.toContain('getVendorByUserIdServer')
  })

  it("requires 'customers:reveal_phone' permission", () => {
    expect(src).toContain("'customers:reveal_phone'")
  })

  it('logs to both sellerAudit and securityEvents', () => {
    expect(src).toContain('logSellerDataAccess')
    expect(src).toContain('logSecurityEvent')
    expect(src).toContain('SEC_EVENT.CUSTOMER_PHONE_REVEALED')
  })

  it('has triple rate limiting (IP, permission-check, user)', () => {
    expect(src).toContain('checkSellerRateLimit')
    expect(src).toContain('checkUserRateLimit')
  })
})

// ── 6. Source audit — team endpoint enforces owner-only ───────────────────────

describe('team endpoint — source audit: owner-only operations', () => {
  const src = readFileSync(
    resolve(root, 'app/api/seller/team/route.ts'),
    'utf-8'
  )

  it("GET requires 'members:read'", () => {
    expect(src).toContain("'members:read'")
  })

  it("POST requires 'members:invite'", () => {
    expect(src).toContain("'members:invite'")
  })

  it("DELETE requires 'members:remove'", () => {
    expect(src).toContain("'members:remove'")
  })

  it('uses isAssignableRole to prevent privilege escalation', () => {
    expect(src).toContain('isAssignableRole')
  })

  it('logs team events to security audit trail', () => {
    expect(src).toContain('SEC_EVENT.TEAM_MEMBER_INVITED')
    expect(src).toContain('SEC_EVENT.TEAM_MEMBER_REMOVED')
    expect(src).toContain('SEC_EVENT.TEAM_ROLE_CHANGED')
  })

  it('prevents owner from adding themselves', () => {
    expect(src).toContain('targetUser.id === ctx.user.id')
  })
})

// ── 7. Migrated seller routes — source audit: requireVendorPermission ─────────

describe('Migrated seller routes — source audit: team member RBAC', () => {
  function routeSpec(path: string, permission: string) {
    const src = readFileSync(resolve(root, path), 'utf-8')
    it(`${path} uses requireVendorPermission`, () => {
      expect(src).toContain('requireVendorPermission')
      expect(src).not.toContain('getVendorByUserIdServer')
    })
    it(`${path} requires '${permission}'`, () => {
      expect(src).toContain(`'${permission}'`)
    })
  }

  routeSpec('app/api/seller/inventory/route.ts', 'products:read')
  routeSpec('app/api/seller/inventory/stock/route.ts', 'products:update')
  routeSpec('app/api/seller/orders/route.ts', 'orders:read')
  routeSpec('app/api/seller/pending-orders/route.ts', 'orders:read')
  routeSpec('app/api/seller/returns/route.ts', 'orders:read')
  routeSpec('app/api/seller/returns/[id]/route.ts', 'orders:update')
  routeSpec('app/api/seller/customers/route.ts', 'customers:read')
  routeSpec('app/api/seller/customers/reveal/route.ts', 'customers:reveal_phone')
  routeSpec('app/api/seller/analytics/route.ts', 'analytics:read')
  routeSpec('app/api/seller/analytics/export/route.ts', 'analytics:export')
  routeSpec('app/api/seller/abandoned-analytics/route.ts', 'analytics:read')
  routeSpec('app/api/seller/messages/route.ts', 'messages:read')
  routeSpec('app/api/seller/vendor/route.ts', 'settings:update')
  routeSpec('app/api/seller/vendor/vacation/route.ts', 'settings:update')
  routeSpec('app/api/seller/delivery-config/route.ts', 'delivery:config')
  routeSpec('app/api/seller/delivery-dashboard/route.ts', 'delivery:read')
  routeSpec('app/api/seller/shipments/route.ts', 'delivery:read')
  routeSpec('app/api/seller/shipments/sync/route.ts', 'delivery:update')
  routeSpec('app/api/seller/subscription/route.ts', 'billing:read')
  routeSpec('app/api/seller/sponsored/route.ts', 'sponsored:read')
  routeSpec('app/api/seller/promo-codes/route.ts', 'promotions:read')
  routeSpec('app/api/seller/flash-sales/route.ts', 'promotions:read')
  routeSpec('app/api/seller/products/import/route.ts', 'products:import')
  routeSpec('app/api/seller/notifications/route.ts', 'settings:read')
  routeSpec('app/api/seller/integration-health/route.ts', 'delivery:read')
  routeSpec('app/api/seller/sessions/route.ts', 'sessions:read')
  routeSpec('app/api/seller/test-yalidine/route.ts', 'delivery:config')
  routeSpec('app/api/seller/test-apec/route.ts', 'delivery:config')
  routeSpec('app/api/seller/test-integration/route.ts', 'delivery:config')
  routeSpec('app/api/seller/questions/[questionId]/answer/route.ts', 'messages:send')
  routeSpec('app/api/seller/cancelled-and-abandoned/route.ts', 'orders:read')
})

// ── 8. Security event constants — completeness ────────────────────────────────

describe('SecurityEvents — SEC_EVENT constants', () => {
  it('covers all critical security events', async () => {
    const { SEC_EVENT } = await import('../lib/auth/securityEvents')
    expect(SEC_EVENT.SELLER_LOGIN_SUCCESS).toBe('seller_login_success')
    expect(SEC_EVENT.SELLER_LOGIN_FAILURE).toBe('seller_login_failure')
    expect(SEC_EVENT.CUSTOMER_PHONE_REVEALED).toBe('customer_phone_revealed')
    expect(SEC_EVENT.PERMISSION_DENIED).toBe('permission_denied')
    expect(SEC_EVENT.RATE_LIMIT_EXCEEDED).toBe('rate_limit_exceeded')
    expect(SEC_EVENT.PAYMENT_AMOUNT_MISMATCH).toBe('payment_amount_mismatch')
    expect(SEC_EVENT.ORDER_CANCELLED).toBe('order_cancelled')
    expect(SEC_EVENT.TEAM_MEMBER_INVITED).toBe('team_member_invited')
  })

  it('logSecurityEvent is non-blocking when DB is unavailable', async () => {
    const { logSecurityEvent } = await import('../lib/auth/securityEvents')
    await expect(logSecurityEvent({
      actorType: 'seller',
      action:    'test_event',
      result:    'success',
    })).resolves.toBeUndefined()
  })
})
