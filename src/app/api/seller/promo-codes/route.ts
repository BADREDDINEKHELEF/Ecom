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
      .from('promo_codes')
      .select('*')
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ codes: data ?? [] })
  } catch (err) {
    console.error('[GET /api/seller/promo-codes]', err)
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
    const { code, discount_type, discount_value, min_order, max_uses, expires_at, free_shipping, one_per_buyer } = body

    if (!code || !discount_type || !discount_value) {
      return NextResponse.json({ error: 'code, discount_type and discount_value are required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('promo_codes')
      .insert({
        vendor_id:      vendor.id,
        code:           code.toUpperCase(),
        discount_type,
        discount_value: Number(discount_value),
        min_order:      Number(min_order ?? 0),
        max_uses:       max_uses ?? null,
        expires_at:     expires_at ?? null,
        free_shipping:  free_shipping ?? false,
        one_per_buyer:  one_per_buyer ?? false,
        is_active:      true,
        uses_count:     0,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ code: data })
  } catch (err) {
    console.error('[POST /api/seller/promo-codes]', err)
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
    console.error('[PATCH /api/seller/promo-codes]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
