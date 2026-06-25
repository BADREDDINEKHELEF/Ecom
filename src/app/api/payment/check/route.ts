import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkPublicRateLimit(ip, 'payment_check')
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const orderId = req.nextUrl.searchParams.get('orderId')
    if (!orderId) {
      return NextResponse.json({ error: 'orderId requis' }, { status: 400 })
    }

    const { data: order, error } = await createAdminClient()
      .from('orders')
      .select('id, status, payment_status')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    if (order.status === 'confirmed' && order.payment_status === 'paid') {
      return NextResponse.json({ paid: true, status: order.status })
    }

    if (order.status === 'cancelled' || order.payment_status === 'failed') {
      return NextResponse.json({ paid: false, status: order.status })
    }

    return NextResponse.json({ paid: false, status: order.status })
  } catch (err) {
    logger.error('[GET /api/payment/check]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
