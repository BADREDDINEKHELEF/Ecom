import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import { logger } from '@/lib/logger'

// GET /api/seller/cancelled-and-abandoned
// Returns:
//   cancelled  — orders that contain this vendor's items and have status=cancelled
//   abandoned  — recent abandoned_checkouts (store-wide, last 30 days)
export async function GET(req: NextRequest) {
  const supabase = createRouteClient(req)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vendor = await getVendorByUserIdServer(user.id)
  if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

  const admin = createAdminClient()
  const since = new Date()
  since.setDate(since.getDate() - 30)

  try {
    // 1. Cancelled orders that have at least one item from this vendor
    const { data: cancelledItems } = await admin
      .from('order_items')
      .select('order_id, quantity, subtotal, product_name, orders(id, full_name, phone, wilaya, city, total, status, created_at, cancelled_at)')
      .eq('vendor_id', vendor.id)
      .gte('orders.created_at', since.toISOString())

    // Filter to orders with status=cancelled, deduplicate by order_id
    type CancelledItem = {
      order_id: string
      quantity: number
      subtotal: number
      product_name: string
      orders: {
        id: string; full_name: string; phone: string; wilaya: string | null
        city: string | null; total: number; status: string; created_at: string
        cancelled_at: string | null
      } | null
    }
    const seenOrders = new Set<string>()
    const cancelled = ((cancelledItems ?? []) as unknown as CancelledItem[])
      .filter((r) => r.orders?.status === 'cancelled' && !seenOrders.has(r.order_id) && seenOrders.add(r.order_id))
      .map((r) => ({
        orderId:     r.orders!.id,
        fullName:    r.orders!.full_name,
        phone:       r.orders!.phone,
        wilaya:      r.orders!.wilaya,
        total:       r.orders!.total,
        createdAt:   r.orders!.created_at,
        cancelledAt: r.orders!.cancelled_at,
      }))

    // 2. Abandoned checkouts — store-wide last 30 days, status=abandoned
    const { data: abandonedRows } = await admin
      .from('abandoned_checkouts')
      .select('session_id, name, phone, email, wilaya, cart_total, status, updated_at')
      .eq('status', 'abandoned')
      .gte('updated_at', since.toISOString())
      .order('updated_at', { ascending: false })
      .limit(100)

    return NextResponse.json({
      cancelled: cancelled ?? [],
      abandoned: (abandonedRows ?? []).map((r) => ({
        sessionId: r.session_id,
        name:      r.name,
        phone:     r.phone,
        email:     r.email,
        wilaya:    r.wilaya,
        cartTotal: r.cart_total,
        updatedAt: r.updated_at,
      })),
    })
  } catch (err) {
    logger.error('[GET /api/seller/cancelled-and-abandoned]', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
