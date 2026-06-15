import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

const PayoutSchema = z.object({
  id: z.string().uuid(),
})

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const supabase = createAdminClient()

    const [commissionsRes, vendorsRes] = await Promise.all([
      supabase
        .from('commissions')
        .select('id, vendor_id, order_total_dzd, commission_amount_dzd, status, created_at, paid_at')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('vendors')
        .select('id, store_name, store_slug'),
    ])

    if (commissionsRes.error) throw commissionsRes.error

    const commissions = commissionsRes.data ?? []
    const vendorMap = new Map((vendorsRes.data ?? []).map((v) => [v.id, v]))

    const totalPending = commissions.filter((c) => c.status === 'pending')
      .reduce((s, c) => s + (c.commission_amount_dzd ?? 0), 0)
    const totalPaid = commissions.filter((c) => c.status === 'paid')
      .reduce((s, c) => s + (c.commission_amount_dzd ?? 0), 0)

    // Group by vendor
    const byVendor: Record<string, {
      id: string; name: string; slug: string
      pendingAmount: number; paidAmount: number; orderCount: number
    }> = {}
    for (const c of commissions) {
      const vid = c.vendor_id
      if (!vid) continue
      if (!byVendor[vid]) {
        const v = vendorMap.get(vid)
        byVendor[vid] = { id: vid, name: v?.store_name ?? 'Inconnu', slug: v?.store_slug ?? '', pendingAmount: 0, paidAmount: 0, orderCount: 0 }
      }
      byVendor[vid].orderCount++
      if (c.status === 'pending') byVendor[vid].pendingAmount += c.commission_amount_dzd ?? 0
      if (c.status === 'paid')    byVendor[vid].paidAmount    += c.commission_amount_dzd ?? 0
    }

    // Monthly MRR (commission amounts by month)
    const monthlyMap: Record<string, number> = {}
    for (const c of commissions) {
      const key = c.created_at.slice(0, 7) // YYYY-MM
      monthlyMap[key] = (monthlyMap[key] ?? 0) + (c.commission_amount_dzd ?? 0)
    }
    const monthly = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, amount]) => ({ month, amount: Math.round(amount) }))

    return NextResponse.json({
      totalPending: Math.round(totalPending),
      totalPaid:    Math.round(totalPaid),
      byVendor:     Object.values(byVendor).sort((a, b) => b.pendingAmount - a.pendingAmount),
      monthly,
      recent:       commissions.slice(0, 50).map((c) => ({
        ...c,
        vendorName: vendorMap.get(c.vendor_id ?? '')?.store_name ?? 'Inconnu',
      })),
    })
  } catch (err) {
    logger.error('[GET /api/admin/analytics/revenue]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = PayoutSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Valid commission id required' }, { status: 400 })

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('commissions')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', parsed.data.id)
      .eq('status', 'pending') // idempotent
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/admin/analytics/revenue]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
