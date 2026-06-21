import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'
import { maskPhone } from '@/lib/utils/mask'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ALLOWED_PHOTO_HOSTS = new Set([
  'supabase.co',
  'supabase.in',
])

function isSafePhotoUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false
  try {
    const parsed = new URL(url)
    if (!['https:'].includes(parsed.protocol)) return false
    return [...ALLOWED_PHOTO_HOSTS].some((h) => parsed.hostname.endsWith(h))
  } catch {
    return false
  }
}

const ReturnSchema = z.object({
  reason: z.string().min(5).max(1000).transform((v) => v.trim()),
  phone:  z.string().min(8).max(20),
  photos: z.array(z.string()).max(5).optional().default([]),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params
  if (!UUID_RE.test(orderId)) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

  const ip = getClientIp(req)

  // Gate 1: IP-based
  const ipRl = await checkPublicRateLimit(ip, 'return_ip')
  if (!ipRl.allowed) {
    logger.warn('[return] rate limit: IP', { ip, orderId })
    return NextResponse.json({ error: 'Trop de tentatives' }, { status: 429 })
  }

  // Gate 2: per order — 5 attempts per order per hour (prevents phone brute-force on a known orderId)
  const orderRl = await checkPublicRateLimit(`return_order:${orderId}`, 'return_per_order')
  if (!orderRl.allowed) {
    logger.warn('[return] rate limit: per-order', { orderId, ip })
    return NextResponse.json({ error: 'Trop de tentatives' }, { status: 429 })
  }

  try {
    let rawBody: unknown
    try { rawBody = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = ReturnSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides', details: parsed.error.issues }, { status: 400 })
    }

    const { reason, phone, photos: rawPhotos } = parsed.data
    const photos = (rawPhotos ?? []).filter(isSafePhotoUrl)

    // Gate 3: per phone — 5 return requests per phone per hour
    const cleanPhone = phone.replace(/\D/g, '')
    const phoneRl = await checkPublicRateLimit(`return_phone:${cleanPhone}`, 'return_per_phone')
    if (!phoneRl.allowed) {
      logger.warn('[return] rate limit: per-phone', { phone: maskPhone(phone), orderId, ip })
      return NextResponse.json({ error: 'Trop de tentatives' }, { status: 429 })
    }

    const supabase = createAdminClient()

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, phone')
      .eq('id', orderId)
      .single()

    if (!order) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })

    if (order.phone.replace(/\D/g, '') !== cleanPhone) {
      logger.warn('[return] phone mismatch', { orderId, ip, provided: maskPhone(phone) })
      return NextResponse.json({ error: 'Numéro de téléphone incorrect' }, { status: 403 })
    }

    if (order.status !== 'delivered') {
      return NextResponse.json({ error: 'Retour possible uniquement pour les commandes livrées' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('return_requests')
      .select('id')
      .eq('order_id', orderId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Une demande de retour existe déjà pour cette commande' }, { status: 409 })
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('vendor_id')
      .eq('order_id', orderId)
      .not('vendor_id', 'is', null)
      .limit(1)

    const vendorId = items?.[0]?.vendor_id ?? null

    const { data: returnReq, error: insertErr } = await supabase
      .from('return_requests')
      .insert({ order_id: orderId, vendor_id: vendorId, reason, photos })
      .select('id')
      .single()

    if (insertErr) throw insertErr

    return NextResponse.json({ id: returnReq.id }, { status: 201 })
  } catch (err) {
    logger.error('[POST /api/orders/[orderId]/return]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
