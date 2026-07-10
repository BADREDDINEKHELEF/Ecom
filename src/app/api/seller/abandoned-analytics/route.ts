import { NextRequest, NextResponse } from 'next/server'
import { copyCookies } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
import { logSellerDataAccess } from '@/lib/auth/sellerAudit'
import { checkSellerRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const response = NextResponse.next()
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, 'abandoned_analytics', 30, 60)
  if (!rl.allowed) return copyCookies(response, NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  ))

  try {
    const result = await requireVendorPermission(req, 'analytics:read', response)
    if (result instanceof NextResponse) return result
    const { ctx: { vendor } } = result

    if (!vendor.store_slug) return copyCookies(response, NextResponse.json({
      totalAbandoned: 0, recovered: 0, recoveryRate: 0, totalValue: 0,
      byWilaya: [], byDay: [],
    }))

    const admin = createAdminClient()
    const since = new Date()
    since.setDate(since.getDate() - 30)

    const { data: rows, error } = await admin
      .from('abandoned_checkouts')
      .select('session_id, status, cart_total, wilaya, updated_at')
      .eq('store_slug', vendor.store_slug)
      .gte('updated_at', since.toISOString())
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (error) throw error

    const all = rows ?? []
    const abandoned  = all.filter((r) => r.status === 'abandoned')
    const recovered  = all.filter((r) => r.status === 'recovered' || r.status === 'converted')

    const totalAbandoned = abandoned.length
    const recoveredCount = recovered.length
    const recoveryRate   = totalAbandoned > 0 ? Math.round((recoveredCount / totalAbandoned) * 100) : 0
    const totalValue     = abandoned.reduce((s, r) => s + (r.cart_total ?? 0), 0)

    // Group by wilaya
    const wilayaMap = new Map<string, { count: number; value: number }>()
    for (const r of abandoned) {
      const w = r.wilaya ?? 'Inconnue'
      const existing = wilayaMap.get(w) ?? { count: 0, value: 0 }
      wilayaMap.set(w, { count: existing.count + 1, value: existing.value + (r.cart_total ?? 0) })
    }
    const byWilaya = [...wilayaMap.entries()]
      .map(([wilaya, stats]) => ({ wilaya, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Group by day (last 14 days)
    const dayMap = new Map<string, number>()
    for (const r of abandoned) {
      const day = r.updated_at.slice(0, 10)
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1)
    }
    const byDay = [...dayMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)

    void logSellerDataAccess({
      vendorId:     vendor.id,
      action:       'view_abandoned',
      resourceType: 'abandoned_cart',
      ipAddress:    ip,
      userAgent:    req.headers.get('user-agent') ?? undefined,
    })

    return copyCookies(response, NextResponse.json({ totalAbandoned, recovered: recoveredCount, recoveryRate, totalValue, byWilaya, byDay }))
  } catch (err) {
    logger.error('[GET /api/seller/abandoned-analytics]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
