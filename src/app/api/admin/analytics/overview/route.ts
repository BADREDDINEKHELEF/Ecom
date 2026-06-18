import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    // Algiers midnight (UTC+1)
    const now = new Date()
    const todayAlgiers = new Date(now.toLocaleString('en', { timeZone: 'Africa/Algiers' }))
    todayAlgiers.setHours(0, 0, 0, 0)
    // Convert back to UTC for DB queries
    const todayUTC = new Date(todayAlgiers.getTime() - 60 * 60 * 1000)

    const [todayOrders, totalVendors, recentOrders] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total, wilaya, status, payment_method, created_at')
        .gte('created_at', todayUTC.toISOString())
        .neq('status', 'cancelled'),
      supabase
        .from('vendors')
        .select('id, created_at, is_active'),
      supabase
        .from('orders')
        .select('id, total, wilaya, status, payment_method, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const orders     = todayOrders.data ?? []
    const vendors    = totalVendors.data ?? []
    const recent     = recentOrders.data ?? []

    // Revenue = confirmed delivered orders only
    const transmittedToday = orders.filter((o) => o.status === 'delivered')
    const todayGMV   = transmittedToday.reduce((s, o) => s + (o.total ?? 0), 0)
    const codOrders  = orders.filter((o) => o.payment_method === 'cash').length
    const codRate    = orders.length > 0 ? Math.round((codOrders / orders.length) * 100) : 0
    const avgBasket  = transmittedToday.length > 0 ? Math.round(todayGMV / transmittedToday.length) : 0

    const newVendorsToday = vendors.filter(
      (v) => new Date(v.created_at) >= todayUTC
    ).length

    // Last 20 events for live feed (last 48h)
    const fortyEightAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const feed = recent.map((o) => ({
      id:        o.id,
      total:     o.total,
      wilaya:    o.wilaya,
      status:    o.status,
      method:    o.payment_method,
      createdAt: o.created_at,
    }))

    return NextResponse.json({
      today: {
        orders:       orders.length,
        gmv:          todayGMV,
        avgBasket,
        codRate,
        newVendors:   newVendorsToday,
      },
      feed,
      since: fortyEightAgo.toISOString(),
    })
  } catch (err) {
    logger.error('[GET /api/admin/analytics/overview]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
