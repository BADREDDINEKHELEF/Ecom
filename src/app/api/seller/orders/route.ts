import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorOrders, updateOrderStatus } from '@/lib/supabase/orders'
import { checkUserDualRateLimit } from '@/lib/auth/rateLimit'
import { requireSellerWithRateLimit, rateLimitResponse, parseAndValidate, logAndReturnError } from '@/lib/api/routeHelpers'

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
    const auth = await requireSellerWithRateLimit(req, 'orders_read', 60, 60)
    if (auth instanceof NextResponse) return auth
    const { vendor } = auth

    const url = new URL(req.url)
    const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0') || 0)
    const { summaries, hasMore } = await getVendorOrders(vendor.id, page)
    return NextResponse.json({ orders: summaries, hasMore, page })
  } catch (err) {
    return logAndReturnError('[GET /api/seller/orders]', err)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireSellerWithRateLimit(req, 'orders_write', 30, 60)
    if (auth instanceof NextResponse) return auth
    const { user, vendor } = auth

    const userRl = await checkUserDualRateLimit(user.id, 'orders_write', {
      burstMax: 10, burstWindowSecs: 60,
      sustainedMax: 60, sustainedWindowSecs: 3600,
    })
    if (!userRl.allowed) return rateLimitResponse(userRl)

    const validated = await parseAndValidate(req, PatchSchema)
    if (validated instanceof NextResponse) return validated
    const { orderId, status } = validated.data

    // Verify this order actually contains items from this vendor
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
    return logAndReturnError('[PATCH /api/seller/orders]', err)
  }
}
