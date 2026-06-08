import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserId } from '@/lib/supabase/vendors'
import { getVendorOrders, updateOrderStatus } from '@/lib/supabase/orders'
import { logger } from '@/lib/logger'

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const
type OrderStatus = typeof ORDER_STATUSES[number]

const SELLER_ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped:   ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

const PatchSchema = z.object({
  orderId: z.string().uuid('orderId must be a valid UUID'),
  status:  z.enum(ORDER_STATUSES, { error: `status must be one of: ${ORDER_STATUSES.join(', ')}` }),
})

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
    logger.error('[GET /api/seller/orders]', { error: err instanceof Error ? err.message : String(err) })
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
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
    }
    const { orderId, status } = parsed.data

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

    const currentStatus = (item as unknown as { orders: { status: string } }).orders?.status as OrderStatus | undefined
    const allowed: OrderStatus[] = (currentStatus && SELLER_ALLOWED_TRANSITIONS[currentStatus]) ?? []
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from "${currentStatus}" to "${status}"` },
        { status: 422 }
      )
    }

    await updateOrderStatus(orderId, status)
    return NextResponse.json({ ok: true, orderId, status })
  } catch (err) {
    logger.error('[PATCH /api/seller/orders]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
