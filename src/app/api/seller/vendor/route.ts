import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient, copyCookies } from '@/lib/supabase/server'
import { updateVendor } from '@/lib/supabase/vendors'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
import { encryptField, isEncrypted } from '@/lib/utils/crypto'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { validateStoreSlug } from '@/lib/validation/slug'

function encryptIfNeeded(value: string | null | undefined): string | null | undefined {
  if (!value) return value
  return isEncrypted(value) ? value : encryptField(value)
}

const ALLOWED_STORAGE_HOSTS = ['supabase.co', 'supabase.in']

function safeStorageUrl() {
  return z.string().url().refine((url) => {
    try {
      const { protocol, hostname } = new URL(url)
      return protocol === 'https:' && ALLOWED_STORAGE_HOSTS.some((h) => hostname.endsWith(h))
    } catch { return false }
  }, { message: 'URL must be an https Supabase storage URL' }).nullable().optional()
}

const PatchSchema = z.object({
  store_name:       z.string().min(1).max(100).optional(),
  store_slug:       z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  phone:            z.string().max(30).nullable().optional(),
  wilaya:           z.string().max(100).nullable().optional(),
  description:      z.string().max(2000).nullable().optional(),
  logo_url:         safeStorageUrl(),
  banner_url:       safeStorageUrl(),
  cover_url:        safeStorageUrl(),
  accent_color:     z.string().regex(/^#[0-9a-fA-F]{3,8}$/).nullable().optional(),
  seo_title:        z.string().max(200).nullable().optional(),
  seo_description:  z.string().max(500).nullable().optional(),
  social_instagram: z.string().max(100).nullable().optional(),
  social_facebook:  z.string().max(200).nullable().optional(),
  social_whatsapp:  z.string().max(30).nullable().optional(),
  social_tiktok:    z.string().max(100).nullable().optional(),
  theme_preset:     z.enum(['default','minimal','bold','elegant','earthy']).nullable().optional(),
  business_type:    z.enum(['individual','small_business','wholesaler','brand']).nullable().optional(),
  // Bank / payout details
  bank_rib:         z.string().max(30).nullable().optional(),
  bank_ccp:         z.string().max(30).nullable().optional(),
  bank_baridimob:   z.string().max(30).nullable().optional(),
  bank_account_name: z.string().max(200).nullable().optional(),
  // Inventory
  low_stock_threshold: z.number().int().min(0).max(100).nullable().optional(),
  // Store policies
  return_policy:    z.string().max(2000).nullable().optional(),
  shipping_policy:  z.string().max(2000).nullable().optional(),
  // Vendor-specific pixels (client-side) — strict format validation prevents script injection
  meta_pixel_id:    z.string().regex(/^\d{10,20}$/).nullable().optional(),
  meta_test_event_code: z.string().max(50).nullable().optional(),
  gtag_id:          z.string().regex(/^(G|GTM|AW)-[A-Z0-9]{4,20}$/).nullable().optional(),
  tiktok_pixel_id:  z.string().regex(/^[A-Z0-9]{10,30}$/).nullable().optional(),
  meta_enabled:     z.boolean().optional(),
  // Vendor CAPI tokens (server-side, stored securely)
  meta_capi_token:    z.string().max(500).nullable().optional(),
  tiktok_capi_token:  z.string().max(500).nullable().optional(),
  gtag_api_secret:    z.string().max(100).nullable().optional(),
})

export async function PATCH(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'vendor_settings', 20, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const result = await requireVendorPermission(req, 'settings:update', response)
    if (result instanceof NextResponse) return result
    const { ctx: { user, vendor } } = result

    const userRl = await checkUserRateLimit(user.id, 'vendor_settings', 10, 3600)
    if (!userRl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    ))

    const supabase = createRouteClient(req, response)

    let body: unknown
    try { body = await req.json() } catch {
      return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
    }

    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      const details = process.env.NODE_ENV === 'development' ? parsed.error.issues : undefined
      return copyCookies(response, NextResponse.json(
        { error: 'Validation failed', ...(details && { details }) },
        { status: 400 }
      ))
    }

    // Validate slug format and reserved names server-side when changing slug
    if (parsed.data.store_slug !== undefined && parsed.data.store_slug !== null) {
      const slugValidation = validateStoreSlug(parsed.data.store_slug)
      if (!slugValidation.ok) {
        return copyCookies(response, NextResponse.json({ error: slugValidation.error }, { status: 400 }))
      }
      // Ensure uniqueness case-insensitively (exclude current vendor)
      const { data: existing } = await supabase
        .from('vendors')
        .select('id')
        .ilike('store_slug', parsed.data.store_slug)
        .neq('id', vendor.id)
        .maybeSingle()
      if (existing) {
        return copyCookies(response, NextResponse.json({ error: 'URL déjà prise. Essayez un autre nom.' }, { status: 409 }))
      }
    }

    // Encrypt server-side CAPI tokens before storing — never persist them in plaintext
    const dataToSave = {
      ...parsed.data,
      ...(parsed.data.meta_pixel_id     !== undefined && { meta_enabled:       parsed.data.meta_pixel_id !== null }),
      ...(parsed.data.meta_capi_token   !== undefined && { meta_capi_token:   encryptIfNeeded(parsed.data.meta_capi_token) }),
      ...(parsed.data.tiktok_capi_token !== undefined && { tiktok_capi_token: encryptIfNeeded(parsed.data.tiktok_capi_token) }),
      ...(parsed.data.gtag_api_secret   !== undefined && { gtag_api_secret:   encryptIfNeeded(parsed.data.gtag_api_secret) }),
    }

    let attemptsLeft = 6
    let currentData = { ...dataToSave }
    while (attemptsLeft > 0) {
      try {
        await updateVendor(vendor.id, currentData)
        break
      } catch (dbErr) {
        attemptsLeft--
        const getMsg = (e: any) => {
          if (e instanceof Error) return e.message
          if (e && typeof e === 'object' && 'message' in e) return String(e.message)
          return String(e)
        }
        const msg = getMsg(dbErr)
        if (msg.includes('column') && msg.includes('does not exist') && attemptsLeft > 0) {
          const match = msg.match(/column "([^"]+)"/)
          if (match && match[1]) {
            const col = match[1]
            logger.warn(`[PATCH /api/seller/vendor] Column "${col}" does not exist in DB. Removing field and retrying.`, { col })
            delete (currentData as any)[col]
            continue
          }
        }
        throw dbErr
      }
    }
    return copyCookies(response, NextResponse.json({ ok: true }))
  } catch (err) {
    const getMsg = (e: any) => {
      if (e instanceof Error) return e.message
      if (e && typeof e === 'object' && 'message' in e) return String(e.message)
      return String(e)
    }
    const message = getMsg(err)
    logger.error('[PATCH /api/seller/vendor]', { error: message })
    return copyCookies(response, NextResponse.json({ error: `Internal server error: ${message}` }, { status: 500 }))
  }
}
