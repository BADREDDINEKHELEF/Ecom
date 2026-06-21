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

    const [vendorsRes, itemsRes] = await Promise.all([
      supabase
        .from('vendors')
        .select('id, store_name, store_slug, is_active, is_approved, created_at, subscription_status, commission_rate'),
      supabase
        .from('order_items')
        .select('vendor_id, subtotal, quantity, orders(id, status, delivery_outcome, created_at)')
        .not('vendor_id', 'is', null)
        .limit(10000),
    ])

    const vendors  = vendorsRes.data  ?? []
    const items    = itemsRes.data    ?? []

    type OrderJoin = { id: string; status: string; delivery_outcome: string | null; created_at: string } | null

    interface VendorStats {
      id: string; name: string; slug: string; isActive: boolean; isApproved: boolean
      joinedAt: string; subscription: string | null; commissionRate: number
      orderCount: number; gmv: number; cancelCount: number; deliveredCount: number
      lastSaleDaysAgo: number
    }
    const statsMap: Record<string, VendorStats> = {}
    for (const v of vendors) {
      statsMap[v.id] = {
        id: v.id, name: v.store_name, slug: v.store_slug,
        isActive: v.is_active, isApproved: v.is_approved,
        joinedAt: v.created_at, subscription: v.subscription_status,
        commissionRate: v.commission_rate ?? 0.05,
        orderCount: 0, gmv: 0, cancelCount: 0, deliveredCount: 0,
        lastSaleDaysAgo: 9999,
      }
    }

    const now = new Date()
    const seenOrders: Record<string, Set<string>> = {}

    for (const item of items) {
      const vid = item.vendor_id
      if (!vid || !statsMap[vid]) continue
      const order = item.orders as unknown as OrderJoin
      if (!order) continue

      if (!seenOrders[vid]) seenOrders[vid] = new Set()
      const isNewOrder = !seenOrders[vid].has(order.id)
      seenOrders[vid].add(order.id)

      statsMap[vid].gmv += item.subtotal ?? 0
      if (isNewOrder) {
        statsMap[vid].orderCount++
        if (order.status === 'cancelled') statsMap[vid].cancelCount++
        if (order.delivery_outcome === 'delivered') statsMap[vid].deliveredCount++
        const daysAgo = Math.floor((now.getTime() - new Date(order.created_at).getTime()) / 86400000)
        if (daysAgo < statsMap[vid].lastSaleDaysAgo) statsMap[vid].lastSaleDaysAgo = daysAgo
      }
    }

    const leaderboard = Object.values(statsMap)
      .map((v) => ({
        ...v,
        cancelRate: v.orderCount > 0 ? Math.round((v.cancelCount / v.orderCount) * 100) : 0,
        deliveryRate: v.orderCount > 0 ? Math.round((v.deliveredCount / v.orderCount) * 100) : 0,
        flagged: v.orderCount > 0 && (v.cancelCount / v.orderCount > 0.15 || v.lastSaleDaysAgo >= 45),
      }))
      .sort((a, b) => b.gmv - a.gmv)

    const now30 = new Date()
    now30.setDate(now30.getDate() - 30)
    const newSellers = vendors.filter((v) => new Date(v.created_at) >= now30).length

    return NextResponse.json({ leaderboard, newSellersThisMonth: newSellers })
  } catch (err) {
    logger.error('[GET /api/admin/analytics/sellers]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
