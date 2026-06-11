import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientIp } from '@/lib/utils/ip'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { logger } from '@/lib/logger'

const CancelSchema = z.object({
  phone: z.string().min(8).max(20),
})

function normalizePhone(phone: string): string {
  const clean = phone.replace(/[\s\-().+]/g, '')
  if (clean.startsWith('0') && clean.length === 10) return '213' + clean.slice(1)
  return clean
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'order_cancel')
  if (!rl.allowed) {
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
      return NextResponse.json({ error: 'Numéro de téléphone incorrect' }, { status: 403 })
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ error: 'Cette commande ne peut plus être annulée' }, { status: 409 })
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[POST /api/orders/[id]/cancel]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Une erreur est survenue' }, { status: 500 })
  }
}
