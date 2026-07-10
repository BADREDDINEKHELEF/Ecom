import { NextResponse } from 'next/server'
import { timingSafeEqual, createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendTelegramAlert } from '@/lib/notifications/telegram'
import { logger } from '@/lib/logger'

const HMAC_PAD_SIZE = 128

function safeCompare(provided: string, expected: string): boolean {
  const a = Buffer.alloc(HMAC_PAD_SIZE)
  const b = Buffer.alloc(HMAC_PAD_SIZE)
  Buffer.from(createHash('sha256').update(provided).digest()).copy(a)
  Buffer.from(createHash('sha256').update(expected).digest()).copy(b)
  return timingSafeEqual(a, b)
}

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const adminClient = createAdminClient()

  const provided = (request.headers.get('authorization') ?? '').replace('Bearer ', '')
  const expected = process.env.CRON_SECRET ?? ''
  const valid = expected.length > 0 && safeCompare(provided, expected)
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const ySince = yesterday.toISOString().slice(0, 10)

    // Yesterday's orders
    const { data: orders } = await adminClient
      .from('orders')
      .select('total, status')
      .gte('created_at', `${ySince}T00:00:00`)
      .lt('created_at', `${now.toISOString().slice(0, 10)}T00:00:00`)

    const totalOrders = orders?.length ?? 0
    const gmv = orders?.reduce((s, o) => s + (o.total ?? 0), 0) ?? 0
    const cancelled = orders?.filter((o) => o.status === 'cancelled').length ?? 0
    const cancelRate = totalOrders > 0 ? Math.round((cancelled / totalOrders) * 100) : 0

    // Pending commissions
    const { data: pendingComm } = await adminClient
      .from('commissions')
      .select('commission_amount_dzd')
      .eq('status', 'pending')

    const pendingTotal = pendingComm?.reduce((s, c) => s + (c.commission_amount_dzd ?? 0), 0) ?? 0

    // New vendors yesterday
    const { count: newVendors } = await adminClient
      .from('vendors')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', `${ySince}T00:00:00`)
      .lt('created_at', `${now.toISOString().slice(0, 10)}T00:00:00`)

    // Zero-result searches yesterday
    const { data: zeroSearches } = await adminClient
      .from('analytics_events')
      .select('metadata')
      .eq('event', 'search')
      .gte('created_at', `${ySince}T00:00:00`)
      .lt('created_at', `${now.toISOString().slice(0, 10)}T00:00:00`)

    const zeroResultCount = (zeroSearches ?? []).filter(
      (e) => (e.metadata as Record<string, unknown>)?.results_count === 0,
    ).length

    // Build alert message
    const severity = cancelRate > 20 || totalOrders === 0 ? 'high' : 'medium'

    const lines = [
      `📊 <b>Rapport quotidien StoreDz</b> — ${ySince}`,
      '',
      `📦 Commandes : <b>${totalOrders}</b>`,
      `💰 GMV : <b>${gmv.toLocaleString('fr')} DA</b>`,
      `❌ Taux annulation : <b>${cancelRate}%</b>${cancelRate > 20 ? ' ⚠️' : ''}`,
      `🏪 Nouveaux vendeurs : <b>${newVendors ?? 0}</b>`,
      `💳 Commissions en attente : <b>${pendingTotal.toLocaleString('fr')} DA</b>`,
      `🔍 Recherches sans résultat : <b>${zeroResultCount}</b>`,
    ]

    await sendTelegramAlert(lines.join('\n'), severity)

    return NextResponse.json({ ok: true, date: ySince, orders: totalOrders, gmv })
  } catch (err) {
    logger.error('[cron/analytics-alerts]', { error: err instanceof Error ? err.message : String(err) })
    await sendTelegramAlert('🔴 Erreur cron analytics-alerts — voir les logs Vercel', 'critical')
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
