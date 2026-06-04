import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserId } from '@/lib/supabase/vendors'
import { getVendorOrders, updateOrderStatus } from '@/lib/supabase/orders'

const SELLER_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped:   ['delivered', 'cancelled'],
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserId(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const orders = await getVendorOrders(vendor.id)
    return NextResponse.json({ orders })
  } catch (err) {
    console.error('[GET /api/seller/orders]', err)
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

    const { orderId, status } = await req.json()
    if (!orderId || !status) return NextResponse.json({ error: 'orderId and status required' }, { status: 400 })

    // Verify this order actually contains items from this vendor
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    const { data: item } = await admin
      .from('order_items')
      .select('orders(status)')
      .eq('order_id', orderId)
      .eq('vendor_id', vendor.id)
      .limit(1)
      .single()

    if (!item) return NextResponse.json({ error: 'Order not found or not yours' }, { status: 404 })

    const currentStatus = (item as unknown as { orders: { status: string } }).orders?.status
    const allowed = SELLER_ALLOWED_TRANSITIONS[currentStatus] ?? []
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from "${currentStatus}" to "${status}"` },
        { status: 422 }
      )
    }

    await updateOrderStatus(orderId, status)
    return NextResponse.json({ ok: true, orderId, status })
  } catch (err) {
    console.error('[PATCH /api/seller/orders]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
