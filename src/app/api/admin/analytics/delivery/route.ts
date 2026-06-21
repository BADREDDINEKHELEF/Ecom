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
    const { searchParams } = new URL(req.url)
    const days = Math.min(365, Math.max(7, parseInt(searchParams.get('days') ?? '30')))
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabase
      .from('orders')
      .select('id, wilaya, delivery_provider, delivery_outcome, created_at, updated_at')
      .gte('created_at', since.toISOString())
      .not('delivery_provider', 'is', null)

    if (error) throw error

    // Aggregate by provider
    const providerMap: Record<string, {
      total: number; delivered: number; returned: number; totalDays: number; dayCount: number
    }> = {}

    for (const order of data ?? []) {
      const p = order.delivery_provider ?? 'direct'
      if (!providerMap[p]) providerMap[p] = { total: 0, delivered: 0, returned: 0, totalDays: 0, dayCount: 0 }
      providerMap[p].total++
      if (order.delivery_outcome === 'delivered') {
        providerMap[p].delivered++
        if (order.updated_at && order.created_at) {
          const days = (new Date(order.updated_at).getTime() - new Date(order.created_at).getTime()) / 86400000
          if (days > 0 && days < 60) { providerMap[p].totalDays += days; providerMap[p].dayCount++ }
        }
      }
      if (order.delivery_outcome === 'returned') providerMap[p].returned++
    }

    const providers = Object.entries(providerMap).map(([provider, d]) => ({
      provider,
      total:          d.total,
      delivered:      d.delivered,
      returned:       d.returned,
      avgDays:        d.dayCount > 0 ? Math.round((d.totalDays / d.dayCount) * 10) / 10 : null,
      onTimeRate:     d.total > 0 ? Math.round((d.delivered / d.total) * 100) : 0,
      returnRate:     d.total > 0 ? Math.round((d.returned  / d.total) * 100) : 0,
    })).sort((a, b) => b.total - a.total)

    // Aggregate by wilaya
    const wilayaMap: Record<string, { total: number; delivered: number; returned: number }> = {}
    for (const order of data ?? []) {
      const w = order.wilaya ?? 'Inconnue'
      if (!wilayaMap[w]) wilayaMap[w] = { total: 0, delivered: 0, returned: 0 }
      wilayaMap[w].total++
      if (order.delivery_outcome === 'delivered') wilayaMap[w].delivered++
      if (order.delivery_outcome === 'returned')  wilayaMap[w].returned++
    }

    const byWilaya = Object.entries(wilayaMap)
      .map(([wilaya, d]) => ({
        wilaya,
        total:      d.total,
        delivered:  d.delivered,
        returned:   d.returned,
        returnRate: d.total > 0 ? Math.round((d.returned / d.total) * 100) : 0,
      }))
      .sort((a, b) => b.returnRate - a.returnRate)
      .slice(0, 20)

    return NextResponse.json({ providers, byWilaya, days })
  } catch (err) {
    logger.error('[GET /api/admin/analytics/delivery]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
