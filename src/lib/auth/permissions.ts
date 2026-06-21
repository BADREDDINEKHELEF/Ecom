/**
 * RBAC permission system for seller/vendor accounts.
 *
 * Roles (lowest → highest privilege):
 *   readonly  — view-only: orders, products, analytics
 *   support   — readonly + customer list, messages, settings view
 *   manager   — support + create/update products, update orders, export data
 *   owner     — manager + billing, team management, phone reveals, settings changes
 *
 * 'owner' is implicit via vendors.user_id — never stored in vendor_members.
 */

export type VendorRole = 'owner' | 'manager' | 'support' | 'readonly'

/** Maps each permission to the set of roles that hold it. */
export const ROLE_PERMISSIONS = {
  // ── Orders ──────────────────────────────────────────────────────────────────
  'orders:read':   ['owner', 'manager', 'support', 'readonly'] as VendorRole[],
  'orders:update': ['owner', 'manager'] as VendorRole[],
  'orders:cancel': ['owner', 'manager'] as VendorRole[],
  'orders:export': ['owner', 'manager'] as VendorRole[],

  // ── Products ─────────────────────────────────────────────────────────────────
  'products:read':   ['owner', 'manager', 'support', 'readonly'] as VendorRole[],
  'products:create': ['owner', 'manager'] as VendorRole[],
  'products:update': ['owner', 'manager'] as VendorRole[],
  'products:delete': ['owner', 'manager'] as VendorRole[],
  'products:import': ['owner', 'manager'] as VendorRole[],

  // ── Customers — sensitive data ────────────────────────────────────────────────
  'customers:read':         ['owner', 'manager', 'support'] as VendorRole[],
  'customers:reveal_phone': ['owner'] as VendorRole[], // full phone reveal is owner-only

  // ── Analytics ─────────────────────────────────────────────────────────────────
  'analytics:read':   ['owner', 'manager', 'support', 'readonly'] as VendorRole[],
  'analytics:export': ['owner', 'manager'] as VendorRole[],

  // ── Settings ──────────────────────────────────────────────────────────────────
  'settings:read':   ['owner', 'manager', 'support'] as VendorRole[],
  'settings:update': ['owner'] as VendorRole[], // only owner changes bank details, vacation, policies

  // ── Team members ──────────────────────────────────────────────────────────────
  'members:read':   ['owner'] as VendorRole[],
  'members:invite': ['owner'] as VendorRole[],
  'members:remove': ['owner'] as VendorRole[],

  // ── Billing / payouts ─────────────────────────────────────────────────────────
  'billing:read':   ['owner'] as VendorRole[],
  'billing:update': ['owner'] as VendorRole[],

  // ── Delivery / shipments ──────────────────────────────────────────────────────
  'delivery:read':   ['owner', 'manager', 'support', 'readonly'] as VendorRole[],
  'delivery:update': ['owner', 'manager'] as VendorRole[],
  'delivery:config': ['owner'] as VendorRole[], // API tokens + provider config

  // ── Sponsored products ────────────────────────────────────────────────────────
  'sponsored:read':   ['owner', 'manager'] as VendorRole[],
  'sponsored:update': ['owner', 'manager'] as VendorRole[],

  // ── Messages ──────────────────────────────────────────────────────────────────
  'messages:read': ['owner', 'manager', 'support'] as VendorRole[],
  'messages:send': ['owner', 'manager'] as VendorRole[],

  // ── Promotions ────────────────────────────────────────────────────────────────
  'promotions:read':   ['owner', 'manager'] as VendorRole[],
  'promotions:update': ['owner', 'manager'] as VendorRole[],

  // ── Sessions ──────────────────────────────────────────────────────────────────
  'sessions:read':   ['owner', 'manager', 'support', 'readonly'] as VendorRole[],
  'sessions:revoke': ['owner'] as VendorRole[],
} as const

export type Permission = keyof typeof ROLE_PERMISSIONS

/** Returns true if the given role holds the given permission. */
export function hasPermission(role: VendorRole, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[permission] as readonly VendorRole[]).includes(role)
}

/** Returns true if the role is at least as privileged as `minimum`. */
export function roleAtLeast(role: VendorRole, minimum: VendorRole): boolean {
  const ORDER: VendorRole[] = ['readonly', 'support', 'manager', 'owner']
  return ORDER.indexOf(role) >= ORDER.indexOf(minimum)
}

/** All permissions held by a given role. */
export function permissionsForRole(role: VendorRole): Permission[] {
  return (Object.keys(ROLE_PERMISSIONS) as Permission[]).filter((p) =>
    hasPermission(role, p)
  )
}

/** Validate that a string is a valid assignable member role (not 'owner'). */
export function isAssignableRole(value: unknown): value is Exclude<VendorRole, 'owner'> {
  return value === 'manager' || value === 'support' || value === 'readonly'
}
