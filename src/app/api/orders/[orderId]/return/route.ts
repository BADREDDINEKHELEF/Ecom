import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'return')
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de tentatives' }, { status: 429 })

  try {
    const { orderId } = await params
    const { reason, phone, photos } = await req.json().catch(() => ({}))

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json({ error: 'Raison requise (min 5 caractères)' }, { status: 400 })
    }
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json({ error: 'Téléphone requis pour vérification' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify the order belongs to this phone and is delivered
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, phone')
      .eq('id', orderId)
      .single()

    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    if (order.phone.replace(/\D/g, '') !== phone.replace(/\D/g, '')) {
      return NextResponse.json({ error: 'Numéro de téléphone incorrect' }, { status: 403 })
    }
    if (order.status !== 'delivered') {
      return NextResponse.json({ error: 'Retour possible uniquement pour les commandes livrées' }, { status: 400 })
    }

    // Check for existing return request
    const { data: existing } = await supabase
      .from('return_requests')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Une demande de retour existe déjà pour cette commande' }, { status: 409 })
    }

    // Get vendor from order items
    const { data: items } = await supabase
      .from('order_items')
      .select('vendor_id')
      .eq('order_id', orderId)
      .not('vendor_id', 'is', null)
      .limit(1)

    const vendorId = items?.[0]?.vendor_id ?? null

    const { data: returnReq, error: insertErr } = await supabase
      .from('return_requests')
      .insert({
        order_id:  orderId,
        vendor_id: vendorId,
        reason:    reason.trim().slice(0, 1000),
        photos:    Array.isArray(photos) ? photos.slice(0, 5) : [],
      })
      .select('id')
      .single()

    if (insertErr) throw insertErr

    return NextResponse.json({ id: returnReq.id }, { status: 201 })
  } catch (err) {
    logger.error('[POST /api/orders/[orderId]/return]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
