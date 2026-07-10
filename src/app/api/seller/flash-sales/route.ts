import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { copyCookies } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit, checkUserDualRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const CreateFlashSaleSchema = z.object({
  product_id:  z.uuid(),
  flash_price: z.number().positive().max(1_000_000),
  stock_limit: z.number().int().positive().optional().nullable(),
  starts_at:   z.iso.datetime(),
  ends_at:     z.iso.datetime(),
})

const PatchFlashSaleSchema = z.object({
  id:        z.uuid(),
  is_active: z.boolean(),
})

export async function GET(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'flash_sales_read', 60, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const result = await requireVendorPermission(req, 'promotions:read', response)
    if (result instanceof NextResponse) return result
    const { ctx: { vendor } } = result

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('flash_sales')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return copyCookies(response, NextResponse.json({ flashSales: data ?? [] }))
  } catch (err) {
    logger.error('[GET /api/seller/flash-sales]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export async function POST(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'flash_sales_write', 20, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const result = await requireVendorPermission(req, 'promotions:update', response)
    if (result instanceof NextResponse) return result
    const { ctx: { user, vendor } } = result

    const userRl = await checkUserDualRateLimit(user.id, 'flash_sales', {
      burstMax: 10, burstWindowSecs: 60,
      sustainedMax: 30, sustainedWindowSecs: 3600,
    })
    if (!userRl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    ))

    let body: unknown
    try { body = await req.json() } catch {
      return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
    }
    const parsed = CreateFlashSaleSchema.safeParse(body)
    if (!parsed.success) {
      const details = process.env.NODE_ENV === 'development' ? parsed.error.issues : undefined
      return copyCookies(response, NextResponse.json({ error: 'Validation failed', ...(details && { details }) }, { status: 400 }))
    }
    const { product_id, flash_price, stock_limit, starts_at, ends_at } = parsed.data

    if (new Date(ends_at) <= new Date(starts_at)) {
      return copyCookies(response, NextResponse.json({ error: 'ends_at must be after starts_at' }, { status: 400 }))
    }

    const admin = createAdminClient()

    const { data: product } = await admin
      .from('products')
      .select('vendor_id')
      .eq('id', product_id)
      .single()

    if (!product || product.vendor_id !== vendor.id) {
      return copyCookies(response, NextResponse.json({ error: 'Product not found' }, { status: 404 }))
    }

    const { data, error } = await admin
      .from('flash_sales')
      .insert({
        vendor_id:   vendor.id,
        product_id,
        flash_price,
        stock_limit: stock_limit ?? null,
        sold_count:  0,
        starts_at,
        ends_at,
        is_active:   true,
      })
      .select()
      .single()

    if (error) throw error
    return copyCookies(response, NextResponse.json({ flashSale: data }))
  } catch (err) {
    logger.error('[POST /api/seller/flash-sales]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export async function PATCH(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'flash_sales_write', 20, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const result = await requireVendorPermission(req, 'promotions:update', response)
    if (result instanceof NextResponse) return result
    const { ctx: { user, vendor } } = result

    const userRl = await checkUserDualRateLimit(user.id, 'flash_sales', {
      burstMax: 10, burstWindowSecs: 60,
      sustainedMax: 30, sustainedWindowSecs: 3600,
    })
    if (!userRl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    ))

    let body: unknown
    try { body = await req.json() } catch {
      return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
    }
    const parsed = PatchFlashSaleSchema.safeParse(body)
    if (!parsed.success) {
      const details = process.env.NODE_ENV === 'development' ? parsed.error.issues : undefined
      return copyCookies(response, NextResponse.json({ error: 'Validation failed', ...(details && { details }) }, { status: 400 }))
    }
    const { id, is_active } = parsed.data

    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('flash_sales')
      .select('vendor_id')
      .eq('id', id)
      .single()

    if (!existing || existing.vendor_id !== vendor.id) {
      return copyCookies(response, NextResponse.json({ error: 'Not found' }, { status: 404 }))
    }

    const { data, error } = await admin
      .from('flash_sales')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return copyCookies(response, NextResponse.json({ flashSale: data }))
  } catch (err) {
    logger.error('[PATCH /api/seller/flash-sales]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
