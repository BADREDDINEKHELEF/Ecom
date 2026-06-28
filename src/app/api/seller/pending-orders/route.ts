import { NextRequest, NextResponse } from 'next/server'
import { getVendorPendingOrders } from '@/lib/supabase/orders'
import { requireSellerWithRateLimit, logAndReturnError } from '@/lib/api/routeHelpers'

export async function GET(req: NextRequest) {
  try {
    const auth = await requireSellerWithRateLimit(req, 'pending_orders', 60, 60)
    if (auth instanceof NextResponse) return auth
    const { vendor } = auth

    const { searchParams } = new URL(req.url)
    const requestedVendorId = searchParams.get('vendorId')

    // Only allow fetching own vendor data
    if (requestedVendorId && requestedVendorId !== vendor.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orders = await getVendorPendingOrders(vendor.id)
    return NextResponse.json({ orders })
  } catch (err) {
    return logAndReturnError('[GET /api/seller/pending-orders]', err)
  }
}
