import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient, copyCookies } from '@/lib/supabase/server'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

// GET /api/seller/sponsored — list this vendor's sponsored products
export async function GET(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'sponsored_read', 60, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const supabase = createRouteClient(req, response)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return copyCookies(response, NextResponse.json({ error: 'Vendor not found' }, { status: 403 }))

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('sponsored_products')
      .select('*, products(name, images, price)')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return copyCookies(response, NextResponse.json({ sponsored: data ?? [] }))
  } catch (err) {
    logger.error('[GET /api/seller/sponsored]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

// POST /api/seller/sponsored — submit a new sponsored product request
const CreateSponsoredSchema = z.object({
  product_id:        z.string().uuid(),
  placement:         z.string().max(50).optional().default('homepage'),
  duration_days:     z.number().int().min(1).max(90).optional().default(7),
  amount_dzd:        z.number().min(0).optional().default(0),
  payment_reference: z.string().max(200).optional().nullable(),
})

const PatchSponsoredSchema = z.object({
  id:     z.string().uuid(),
  status: z.enum(['paused', 'pending']),
})

export async function POST(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'sponsored_write', 5, 3600)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const supabase = createRouteClient(req, response)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const userRl = await checkUserRateLimit(user.id, 'sponsored_write', 3, 3600)
    if (!userRl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    ))

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return copyCookies(response, NextResponse.json({ error: 'Vendor not found' }, { status: 403 }))

    let body: unknown
    try { body = await req.json() } catch {
      return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
    }

    const parsed = CreateSponsoredSchema.safeParse(body)
    if (!parsed.success) return copyCookies(response, NextResponse.json({ error: 'product_id is required' }, { status: 400 }))

    const { product_id, placement, duration_days, amount_dzd, payment_reference } = parsed.data

    const admin = createAdminClient()

    // Verify the product belongs to this vendor
    const { data: product } = await admin
      .from('products')
      .select('id, vendor_id')
      .eq('id', product_id)
      .eq('vendor_id', vendor.id)
      .single()

    if (!product) return copyCookies(response, NextResponse.json({ error: 'Product not found or not yours' }, { status: 404 }))

    const startsAt = new Date()
    const endsAt = new Date(startsAt)
    endsAt.setDate(endsAt.getDate() + duration_days)

    const { data, error } = await admin
      .from('sponsored_products')
      .insert({
        vendor_id: vendor.id,
        product_id,
        placement,
        status: 'pending',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        amount_dzd,
        payment_reference: payment_reference ?? null,
      })
      .select()
      .single()

    if (error) throw error
    return copyCookies(response, NextResponse.json({ sponsored: data }, { status: 201 }))
  } catch (err) {
    logger.error('[POST /api/seller/sponsored]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

// PATCH /api/seller/sponsored — pause or update a pending promotion
export async function PATCH(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'sponsored_write', 20, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))

    const supabase = createRouteClient(req, response)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return copyCookies(response, NextResponse.json({ error: 'Vendor not found' }, { status: 403 }))

    let body: unknown
    try { body = await req.json() } catch {
      return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
    }

    const parsed = PatchSponsoredSchema.safeParse(body)
    if (!parsed.success) return copyCookies(response, NextResponse.json({ error: 'id is required' }, { status: 400 }))

    const admin = createAdminClient()
    const { error } = await admin
      .from('sponsored_products')
      .update({ status: parsed.data.status })
      .eq('id', parsed.data.id)
      .eq('vendor_id', vendor.id)
      .in('status', ['pending', 'paused'])

    if (error) throw error
    return copyCookies(response, NextResponse.json({ ok: true }))
  } catch (err) {
    logger.error('[PATCH /api/seller/sponsored]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
