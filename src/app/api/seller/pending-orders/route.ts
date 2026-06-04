import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorPendingOrders } from '@/lib/supabase/orders'
import { getVendorByUserId } from '@/lib/supabase/vendors'

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

    const { searchParams } = new URL(req.url)
    const requestedVendorId = searchParams.get('vendorId')

    // Only allow fetching own vendor data
    if (requestedVendorId && requestedVendorId !== vendor.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orders = await getVendorPendingOrders(vendor.id)
    return NextResponse.json({ orders })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
