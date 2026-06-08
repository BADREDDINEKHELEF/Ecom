import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorByUserId } from '@/lib/supabase/vendors'
import { logger } from '@/lib/logger'

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
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserId(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('flash_sales')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ flashSales: data ?? [] })
  } catch (err) {
    logger.error('[GET /api/seller/flash-sales]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserId(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const parsed = CreateFlashSaleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
    }
    const { product_id, flash_price, stock_limit, starts_at, ends_at } = parsed.data

    if (new Date(ends_at) <= new Date(starts_at)) {
      return NextResponse.json({ error: 'ends_at must be after starts_at' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: product } = await admin
      .from('products')
      .select('vendor_id')
      .eq('id', product_id)
      .single()

    if (!product || product.vendor_id !== vendor.id) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
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
    return NextResponse.json({ flashSale: data })
  } catch (err) {
    logger.error('[POST /api/seller/flash-sales]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserId(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    const parsed = PatchFlashSaleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
    }
    const { id, is_active } = parsed.data

    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('flash_sales')
      .select('vendor_id')
      .eq('id', id)
      .single()

    if (!existing || existing.vendor_id !== vendor.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data, error } = await admin
      .from('flash_sales')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ flashSale: data })
  } catch (err) {
    logger.error('[PATCH /api/seller/flash-sales]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
