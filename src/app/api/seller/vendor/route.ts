import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserIdServer, updateVendor } from '@/lib/supabase/vendors'
import { logger } from '@/lib/logger'

const PatchSchema = z.object({
  store_name:       z.string().min(1).max(100).optional(),
  store_slug:       z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  phone:            z.string().max(30).nullable().optional(),
  wilaya:           z.string().max(100).nullable().optional(),
  description:      z.string().max(2000).nullable().optional(),
  logo_url:         z.string().url().nullable().optional(),
  banner_url:       z.string().url().nullable().optional(),
  cover_url:        z.string().url().nullable().optional(),
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
  gtag_id:          z.string().regex(/^(G|GTM|AW)-[A-Z0-9]{4,20}$/).nullable().optional(),
  tiktok_pixel_id:  z.string().regex(/^[A-Z0-9]{10,30}$/).nullable().optional(),
  // Vendor CAPI tokens (server-side, stored securely)
  meta_capi_token:    z.string().max(500).nullable().optional(),
  tiktok_capi_token:  z.string().max(500).nullable().optional(),
  gtag_api_secret:    z.string().max(100).nullable().optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })

    try {
      await updateVendor(vendor.id, parsed.data)
    } catch (dbErr) {
      // If migration_033 hasn't been applied yet, retry without the new pixel/CAPI columns
      const msg = dbErr instanceof Error ? dbErr.message : String(dbErr)
      if (msg.includes('column') && msg.includes('does not exist')) {
        const { tiktok_pixel_id, meta_capi_token, tiktok_capi_token, gtag_api_secret, ...safe } = parsed.data
        void tiktok_pixel_id; void meta_capi_token; void tiktok_capi_token; void gtag_api_secret
        await updateVendor(vendor.id, safe)
      } else {
        throw dbErr
      }
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/seller/vendor]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
