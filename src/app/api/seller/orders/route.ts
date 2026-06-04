import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserId } from '@/lib/supabase/vendors'
import { getVendorOrders } from '@/lib/supabase/orders'

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await getVendorByUserId(user.id)
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor account not found' }, { status: 403 })
    }

    const orders = await getVendorOrders(vendor.id)
    return NextResponse.json({ orders })
  } catch (err) {
    console.error('[GET /api/seller/orders]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
