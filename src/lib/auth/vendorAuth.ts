/**
 * Vendor authorization helpers.
 *
 * getVendorContext() — resolves the authenticated user's vendor + role.
 *   Checks vendors.user_id first (owner), then vendor_members (team member).
 *   Returns null when the user has no vendor association.
 *
 * requireVendorPermission() — gate for API route handlers.
 *   Returns { ctx } on success, NextResponse(401/403) on failure.
 *   Use it as the first call in any seller route that needs permission checking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient, copyCookies } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Vendor } from '@/lib/supabase/vendors'
import { type VendorRole, type Permission, hasPermission } from './permissions'
import { isSessionRevoked } from './sellerSessions'
import { getClientIp } from '@/lib/utils/ip'

export interface VendorContext {
  user:   { id: string; email?: string }
  vendor: Vendor
  role:   VendorRole
}

const VENDOR_COLS = [
  'id', 'user_id', 'store_name', 'store_slug', 'logo_url', 'banner_url',
  'description', 'phone', 'wilaya', 'commission_rate', 'is_approved', 'is_active',
  'is_on_vacation', 'vacation_message', 'bank_rib', 'bank_ccp', 'bank_baridimob',
  'bank_account_name', 'low_stock_threshold', 'verified_at', 'return_policy',
  'shipping_policy', 'referral_code', 'subscription_status', 'subscription_plan_id',
  'subscription_expires_at', 'meta_pixel_id', 'gtag_id', 'tiktok_pixel_id',
  'pixel_id', 'social_instagram', 'social_facebook', 'social_whatsapp',
  'social_tiktok', 'theme_preset', 'business_type', 'admin_note', 'created_at',
].join(',')

/**
 * Resolve vendor + role for the current Supabase-authenticated user.
 * Priority: owner (vendors.user_id) → team member (vendor_members.user_id).
 *
 * Pass the outgoing `response` when called from a route handler so any
 * refreshed auth cookies are written to the response that will be returned.
 */
export async function getVendorContext(
  req: NextRequest,
  response?: NextResponse,
): Promise<VendorContext | null> {
  const supabase = createRouteClient(req, response)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return null

  // Enforce device-level seller session revocation.
  // If the seller_sessions row for this device is revoked or expired, treat
  // the request as unauthenticated. New devices without a row are allowed.
  const revoked = await isSessionRevoked(
    user.id,
    req.headers.get('user-agent') ?? 'unknown',
    getClientIp(req),
  )
  if (revoked) return null

  const admin = createAdminClient()

  // ── 1. Check if owner ─────────────────────────────────────────────────────
  const { data: ownedVendor } = await admin
    .from('vendors')
    .select(VENDOR_COLS)
    .eq('user_id', user.id)
    .maybeSingle()

  if (ownedVendor) {
    return { user: { id: user.id, email: user.email }, vendor: ownedVendor as unknown as Vendor, role: 'owner' }
  }

  // ── 2. Check if team member (two-step to avoid Supabase join type errors) ──
  const { data: membership } = await admin
    .from('vendor_members')
    .select('role, vendor_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (membership) {
    const { data: memberVendor } = await admin
      .from('vendors')
      .select(VENDOR_COLS)
      .eq('id', membership.vendor_id)
      .maybeSingle()

    if (memberVendor) {
      return {
        user:   { id: user.id, email: user.email },
        vendor: memberVendor as unknown as Vendor,
        role:   membership.role as VendorRole,
      }
    }
  }

  return null
}

/**
 * Route handler guard — require the user to have a specific vendor permission.
 * Returns { ctx: VendorContext } on success, NextResponse on failure.
 *
 * Usage:
 *   const response = NextResponse.next()
 *   const result = await requireVendorPermission(req, 'customers:reveal_phone', response)
 *   if (result instanceof NextResponse) return result
 *   const { ctx } = result
 *
 * When `response` is provided, auth cookie refreshes are written to it and
 * copied to any error response returned by this guard.
 */
export async function requireVendorPermission(
  req: NextRequest,
  permission: Permission,
  response?: NextResponse,
): Promise<{ ctx: VendorContext } | NextResponse> {
  const ctx = await getVendorContext(req, response)

  if (!ctx) {
    return copyCookies(
      response ?? NextResponse.next(),
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    )
  }

  if (!hasPermission(ctx.role, permission)) {
    return copyCookies(
      response ?? NextResponse.next(),
      NextResponse.json(
        { error: 'Forbidden', required: permission, yourRole: ctx.role },
        { status: 403 }
      ),
    )
  }

  return { ctx }
}

/**
 * Lightweight variant — only checks ownership, no team member lookup.
 * Use for routes that predate team member support (backward compatible).
 * Returns null for team members even if they have the permission — upgrade
 * to requireVendorPermission() to enable team member access.
 */
export async function requireVendorOwner(
  req: NextRequest,
  response?: NextResponse,
): Promise<{ ctx: VendorContext } | NextResponse> {
  return requireVendorPermission(req, 'settings:update', response) // any owner-only permission works
}
