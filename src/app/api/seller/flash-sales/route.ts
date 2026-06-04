import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorByUserId } from '@/lib/supabase/vendors'

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
    console.error('[GET /api/seller/flash-sales]', err)
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

    const body = await req.json()
    const { product_id, flash_price, stock_limit, starts_at, ends_at } = body

    if (!product_id || !flash_price || !starts_at || !ends_at) {
      return NextResponse.json({ error: 'product_id, flash_price, starts_at and ends_at are required' }, { status: 400 })
    }

    if (new Date(ends_at) <= new Date(starts_at)) {
      return NextResponse.json({ error: 'ends_at must be after starts_at' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify product belongs to vendor
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
        flash_price: Number(flash_price),
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
    console.error('[POST /api/seller/flash-sales]', err)
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

    const { id, is_active } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const admin = createAdminClient()

    // Verify ownership
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
    console.error('[PATCH /api/seller/flash-sales]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
