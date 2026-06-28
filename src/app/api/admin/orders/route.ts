import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAllOrders, updateOrderStatus } from '@/lib/supabase/orders'
import { requireAdminWithRateLimit, parseAndValidate, logAndReturnError } from '@/lib/api/routeHelpers'

export async function GET(req: NextRequest) {
  const denied = await requireAdminWithRateLimit(req, 'orders_read', 120, 60)
  if (denied) return denied

  const { searchParams } = req.nextUrl

  // ?countOnly=1 — return just the pending count for admin's OWN orders (vendor_id IS NULL)
  if (searchParams.get('countOnly') === '1') {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const supabase = createAdminClient()
      // Collect order IDs that contain at least one admin product
      const { data: items } = await supabase
        .from('order_items')
        .select('order_id')
        .is('vendor_id', null)
      const orderIds = [...new Set((items ?? []).map((i: { order_id: string }) => i.order_id))]
      if (orderIds.length === 0) return NextResponse.json({ pending: 0 })
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .in('id', orderIds)
      return NextResponse.json({ pending: count ?? 0 })
    } catch {
      return NextResponse.json({ pending: 0 })
    }
  }

  const page = Math.max(0, Number(searchParams.get('page') ?? '0'))
  const rawSource = searchParams.get('source')
  const source = rawSource === 'admin' || rawSource === 'vendor' ? rawSource : undefined

  try {
    const result = await getAllOrders(page, 50, source)
    return NextResponse.json(result)
  } catch (err) {
    return logAndReturnError('[GET /api/admin/orders]', err, 'Failed to fetch orders')
  }
}

const PatchSchema = z.object({
  orderId: z.string().uuid(),
  status:  z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
})

export async function PATCH(req: NextRequest) {
  const denied = await requireAdminWithRateLimit(req, 'orders_write', 30, 60)
  if (denied) return denied

  const validated = await parseAndValidate(req, PatchSchema)
  if (validated instanceof NextResponse) return validated

  try {
    await updateOrderStatus(validated.data.orderId, validated.data.status)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return logAndReturnError('[PATCH /api/admin/orders]', err, 'Failed to update order')
  }
}
