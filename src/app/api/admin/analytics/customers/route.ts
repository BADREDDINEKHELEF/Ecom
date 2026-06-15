import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    // All non-cancelled orders with phone (customer identifier for anonymous orders)
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, phone, total, created_at, status')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Aggregate by phone number
    const phoneMap: Record<string, { orderCount: number; totalSpend: number; lastOrder: string; firstOrder: string }> = {}
    for (const order of orders ?? []) {
      const p = order.phone
      if (!p) continue
      if (!phoneMap[p]) phoneMap[p] = { orderCount: 0, totalSpend: 0, lastOrder: order.created_at, firstOrder: order.created_at }
      phoneMap[p].orderCount++
      phoneMap[p].totalSpend += order.total ?? 0
      if (order.created_at > phoneMap[p].lastOrder)  phoneMap[p].lastOrder  = order.created_at
      if (order.created_at < phoneMap[p].firstOrder) phoneMap[p].firstOrder = order.created_at
    }

    const now = new Date()
    const customers = Object.entries(phoneMap).map(([phone, d]) => {
      const daysSinceLast = Math.floor((now.getTime() - new Date(d.lastOrder).getTime()) / 86400000)
      const segment = d.orderCount >= 5 ? 'VIP'
        : d.orderCount >= 2 ? 'Régulier'
        : 'Nouveau'
      return {
        phone:       phone.slice(0, 6) + '****',
        orderCount:  d.orderCount,
        totalSpend:  d.totalSpend,
        avgOrder:    Math.round(d.totalSpend / d.orderCount),
        lastOrderDaysAgo: daysSinceLast,
        segment,
        churnRisk: daysSinceLast >= 60 && d.orderCount >= 2,
      }
    })

    const segments = {
      vip:      customers.filter((c) => c.segment === 'VIP').length,
      regular:  customers.filter((c) => c.segment === 'Régulier').length,
      new:      customers.filter((c) => c.segment === 'Nouveau').length,
    }

    const repeatRate = customers.length > 0
      ? Math.round((customers.filter((c) => c.orderCount >= 2).length / customers.length) * 100)
      : 0

    const churnRisk = customers.filter((c) => c.churnRisk).length

    const top20 = [...customers]
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, 20)

    return NextResponse.json({
      segments,
      repeatRate,
      churnRisk,
      totalCustomers: customers.length,
      top20,
    })
  } catch (err) {
    logger.error('[GET /api/admin/analytics/customers]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
