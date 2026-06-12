import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/seller/sponsored — list this vendor's sponsored products
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('sponsored_products')
      .select('*, products(name, images, price)')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ sponsored: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/seller/sponsored — submit a new sponsored product request
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const body = await req.json().catch(() => ({})) as {
      product_id?: string
      placement?: string
      duration_days?: number
      amount_dzd?: number
      payment_reference?: string
    }

    if (!body.product_id) return NextResponse.json({ error: 'product_id is required' }, { status: 400 })

    const admin = createAdminClient()

    // Verify the product belongs to this vendor
    const { data: product } = await admin
      .from('products')
      .select('id, vendor_id')
      .eq('id', body.product_id)
      .eq('vendor_id', vendor.id)
      .single()

    if (!product) return NextResponse.json({ error: 'Product not found or not yours' }, { status: 404 })

    const durationDays = Math.max(1, Math.min(90, body.duration_days ?? 7))
    const startsAt = new Date()
    const endsAt = new Date(startsAt)
    endsAt.setDate(endsAt.getDate() + durationDays)

    const { data, error } = await admin
      .from('sponsored_products')
      .insert({
        vendor_id: vendor.id,
        product_id: body.product_id,
        placement: body.placement ?? 'homepage',
        status: 'pending',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        amount_dzd: body.amount_dzd ?? 0,
        payment_reference: body.payment_reference ?? null,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ sponsored: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/seller/sponsored — pause or update a pending promotion
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const body = await req.json().catch(() => ({})) as { id?: string; status?: string }
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const allowedStatuses = ['paused', 'pending']
    if (body.status && !allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Vendors can only pause or re-submit promotions' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('sponsored_products')
      .update({ status: body.status })
      .eq('id', body.id)
      .eq('vendor_id', vendor.id)
      .in('status', ['pending', 'paused'])

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
