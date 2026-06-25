import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit, checkUserDualRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const CreatePromoSchema = z.object({
  code:           z.string().min(2).max(50).regex(/^[A-Z0-9_-]+$/i, 'Code must be alphanumeric'),
  discount_type:  z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive().max(100_000),
  min_order:      z.number().min(0).optional().default(0),
  max_uses:       z.number().int().positive().optional().nullable(),
  expires_at:     z.iso.datetime().optional().nullable(),
  free_shipping:  z.boolean().optional().default(false),
  one_per_buyer:  z.boolean().optional().default(false),
}).superRefine((data, ctx) => {
  if (data.discount_type === 'percentage' && data.discount_value > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Percentage discount cannot exceed 100%',
      path: ['discount_value'],
    })
  }
})

const PatchPromoSchema = z.object({
  id:        z.uuid(),
  is_active: z.boolean(),
})

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'promo_codes_read', 60, 60)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('promo_codes')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ codes: data ?? [] })
  } catch (err) {
    logger.error('[GET /api/seller/promo-codes]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'promo_codes_write', 20, 60)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRl = await checkUserDualRateLimit(user.id, 'promo_codes', {
      burstMax: 5, burstWindowSecs: 60,
      sustainedMax: 20, sustainedWindowSecs: 3600,
    })
    if (!userRl.allowed) return NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    )

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const parsed = CreatePromoSchema.safeParse(body)
    if (!parsed.success) {
      const details = process.env.NODE_ENV === 'development' ? parsed.error.issues : undefined
      return NextResponse.json({ error: 'Validation failed', ...(details && { details }) }, { status: 400 })
    }
    const { code, discount_type, discount_value, min_order, max_uses, expires_at, free_shipping, one_per_buyer } = parsed.data

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('promo_codes')
      .insert({
        vendor_id:      vendor.id,
        code:           code.toUpperCase(),
        discount_type,
        discount_value,
        min_order,
        max_uses:       max_uses ?? null,
        expires_at:     expires_at ?? null,
        free_shipping,
        one_per_buyer,
        is_active:      true,
        uses_count:     0,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ code: data })
  } catch (err) {
    logger.error('[POST /api/seller/promo-codes]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'promo_codes_write', 20, 60)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userRl = await checkUserDualRateLimit(user.id, 'promo_codes', {
      burstMax: 5, burstWindowSecs: 60,
      sustainedMax: 20, sustainedWindowSecs: 3600,
    })
    if (!userRl.allowed) return NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    )

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    let patchBody: unknown
    try { patchBody = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const patchParsed = PatchPromoSchema.safeParse(patchBody)
    if (!patchParsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: patchParsed.error.issues }, { status: 400 })
    }
    const { id, is_active } = patchParsed.data

    const admin = createAdminClient()

    // Verify ownership
    const { data: existing } = await admin
      .from('promo_codes')
      .select('vendor_id')
      .eq('id', id)
      .single()

    if (!existing || existing.vendor_id !== vendor.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data, error } = await admin
      .from('promo_codes')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ code: data })
  } catch (err) {
    logger.error('[PATCH /api/seller/promo-codes]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
