import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { copyCookies } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
import { getVendorOrders, updateVendorOrderStatus } from '@/lib/supabase/orders'
import { logger } from '@/lib/logger'
import { withRequestContext } from '@/lib/api/requestContext'
import { checkSellerRateLimit, checkUserDualRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

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

async function getHandler(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'orders_read', 60, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const result = await requireVendorPermission(req, 'orders:read', response)
    if (result instanceof NextResponse) return result
    const { ctx: { user, vendor } } = result
    logger.setContext({ vendorId: vendor.id, userId: user.id })

    const url = new URL(req.url)
    const page = Math.max(0, parseInt(url.searchParams.get('page') ?? '0') || 0)
    const { summaries, hasMore } = await getVendorOrders(vendor.id, page)
    return copyCookies(response, NextResponse.json({ orders: summaries, hasMore, page }))
  } catch (err) {
    logger.error('[GET /api/seller/orders]', {
      error: err instanceof Error ? err.message : String(err),
      action: 'list_vendor_orders',
    })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

async function patchHandler(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'orders_write', 30, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const result = await requireVendorPermission(req, 'orders:update', response)
    if (result instanceof NextResponse) return result
    const { ctx: { user, vendor } } = result
    logger.setContext({ vendorId: vendor.id, userId: user.id })

    const userRl = await checkUserDualRateLimit(user.id, 'orders_write', {
      burstMax: 10, burstWindowSecs: 60,
      sustainedMax: 60, sustainedWindowSecs: 3600,
    })
    if (!userRl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    ))

    let body: unknown
    try { body = await req.json() } catch {
      return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
    }
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      const details = process.env.NODE_ENV === 'development' ? parsed.error.issues : undefined
      return copyCookies(response, NextResponse.json({ error: 'Validation failed', ...(details && { details }) }, { status: 400 }))
    }
    const { orderId, status } = parsed.data
    logger.setContext({ orderId })

    // Verify this order actually contains items from this vendor
    const admin = createAdminClient()
    const { data: item } = await admin
      .from('order_items')
      .select('orders(status)')
      .eq('order_id', orderId)
      .eq('vendor_id', vendor.id)
      .limit(1)
      .single()

    if (!item) return copyCookies(response, NextResponse.json({ error: 'Order not found or not yours' }, { status: 404 }))

    const currentStatus = (item as unknown as { orders: { status: string } }).orders?.status as OrderStatus | undefined
    const allowed: OrderStatus[] = (currentStatus && SELLER_ALLOWED_TRANSITIONS[currentStatus]) ?? []
    if (!allowed.includes(status)) {
      return copyCookies(response, NextResponse.json(
        { error: `Cannot transition from "${currentStatus}" to "${status}"` },
        { status: 422 }
      ))
    }

    await updateVendorOrderStatus(orderId, vendor.id, status)
    return copyCookies(response, NextResponse.json({ ok: true, orderId, status }))
  } catch (err) {
    logger.error('[PATCH /api/seller/orders]', {
      error: err instanceof Error ? err.message : String(err),
      action: 'update_order_status',
    })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export const GET = withRequestContext(getHandler, { action: 'list_vendor_orders' })
export const PATCH = withRequestContext(patchHandler, { action: 'update_order_status' })
