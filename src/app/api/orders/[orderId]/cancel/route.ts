import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientIp } from '@/lib/utils/ip'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { logger } from '@/lib/logger'
import { maskPhone } from '@/lib/utils/mask'

const CancelSchema = z.object({
  phone: z.string().min(8).max(20),
})

function normalizePhone(phone: string): string {
  const clean = phone.replace(/[\s\-().+]/g, '')
  if (clean.startsWith('0') && clean.length === 10) return '213' + clean.slice(1)
  return clean
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params
  if (!UUID_RE.test(orderId)) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  const ip = getClientIp(req)

  // Gate 1: IP-based — 10 per hour (was 30/min; cancel is rare enough to be stricter)
  const ipRl = await checkPublicRateLimit(ip, 'order_cancel_ip')
  if (!ipRl.allowed) {
    logger.warn('[cancel] rate limit: IP', { ip, orderId })
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 })
  }

  // Gate 2: per order — 5 attempts per order per hour across all IPs.
  // Prevents brute-forcing the phone number for a known orderId.
  const orderRl = await checkPublicRateLimit(`cancel_order:${orderId}`, 'order_cancel_per_order')
  if (!orderRl.allowed) {
    logger.warn('[cancel] rate limit: per-order', { orderId, ip })
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CancelSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Numéro de téléphone requis' }, { status: 400 })

  const phone = normalizePhone(parsed.data.phone)
  const phoneAlt = phone.startsWith('213') ? '0' + phone.slice(3) : '213' + phone.slice(1)

  // Gate 3: per phone — 3 cancel attempts per phone per hour.
  // Prevents a single phone number from cancelling many orders in a script.
  const phoneRl = await checkPublicRateLimit(`cancel_phone:${phone}`, 'order_cancel_per_phone')
  if (!phoneRl.allowed) {
    logger.warn('[cancel] rate limit: per-phone', { phone: maskPhone(phone), orderId, ip })
    return NextResponse.json({ error: 'Trop de tentatives. Réessayez plus tard.' }, { status: 429 })
  }

  try {
    const supabase = createAdminClient()

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, phone')
      .eq('id', orderId)
      .single()

    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

    const orderPhone = normalizePhone(order.phone)
    if (orderPhone !== phone && orderPhone !== phoneAlt) {
      logger.warn('[cancel] phone mismatch', { orderId, ip, provided: maskPhone(phone) })
      return NextResponse.json({ error: 'Numéro de téléphone incorrect' }, { status: 403 })
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Cette commande ne peut plus être annulée' }, { status: 409 })
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'pending') // Idempotency guard

    if (error) throw error

    logger.info('[cancel] order cancelled', { orderId, ip, phone: maskPhone(phone) })
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[POST /api/orders/[id]/cancel]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
