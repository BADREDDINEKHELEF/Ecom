import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { getAllOrders, updateOrderStatus } from '@/lib/supabase/orders'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { searchParams } = req.nextUrl

  // ?countOnly=1 — return just the pending order count for the nav badge
  if (searchParams.get('countOnly') === '1') {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const supabase = createAdminClient()
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      return NextResponse.json({ pending: count ?? 0 })
    } catch (err) {
      logger.error('[GET /api/admin/orders countOnly]', { error: err instanceof Error ? err.message : String(err) })
      return NextResponse.json({ pending: 0 })
    }
  }

  const page = Math.max(0, Number(searchParams.get('page') ?? '0'))

  try {
    const result = await getAllOrders(page)
    return NextResponse.json(result)
  } catch (err) {
    logger.error('[GET /api/admin/orders]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

const PatchSchema = z.object({
  orderId: z.string().uuid(),
  status:  z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']),
})

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 }
    )
  }

  try {
    await updateOrderStatus(parsed.data.orderId, parsed.data.status)
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/admin/orders]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
