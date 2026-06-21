import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'analytics', 120, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  try {
    const supabase = createAdminClient()

    // Algiers is UTC+1, no DST. toLocaleString creates a local-time string that
    // loses tz info when reparsed, so we use arithmetic instead.
    const now = new Date()
    const ALGIERS_OFFSET_MS = 60 * 60 * 1000  // UTC+1
    const nowAlgiersMs = now.getTime() + ALGIERS_OFFSET_MS
    const todayStartAlgiersMs = nowAlgiersMs - (nowAlgiersMs % (24 * 60 * 60 * 1000))
    const todayUTC = new Date(todayStartAlgiersMs - ALGIERS_OFFSET_MS)
    const fortyEightAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

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
        .gte('created_at', fortyEightAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    const orders     = todayOrders.data ?? []
    const vendors    = totalVendors.data ?? []
    const recent     = recentOrders.data ?? []

    // GMV = all non-cancelled orders placed today (delivered + in-progress)
    const todayGMV   = orders.reduce((s, o) => s + (o.total ?? 0), 0)
    const codOrders  = orders.filter((o) => o.payment_method === 'cash').length
    const codRate    = orders.length > 0 ? Math.round((codOrders / orders.length) * 100) : 0
    const avgBasket  = orders.length > 0 ? Math.round(todayGMV / orders.length) : 0

    const newVendorsToday = vendors.filter(
      (v) => new Date(v.created_at) >= todayUTC
    ).length

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
