import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { updateShippingInfo, updateOrderStatus } from '@/lib/supabase/queries'
import { dispatchShipment } from '@/lib/delivery/dispatch'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorDeliveryConfig } from '@/lib/supabase/vendors'
import { logger } from '@/lib/logger'
import type { ShipmentInput } from '@/lib/delivery/types'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const SUPPORTED_PROVIDERS = ['yalidine', 'procolis', 'zr', 'colivraison', 'maystro', 'rex', 'yassir', 'ecom', 'apec', 'manual'] as const

const Schema = z.object({
  orderId:    z.string().uuid(),
  provider:   z.enum(SUPPORTED_PROVIDERS),
  tracking:   z.string().max(100).optional(),
  autoCreate: z.boolean().optional().default(false),
  orderData:  z.object({
    orderId:  z.string().max(200),
    fullName: z.string().max(200),
    phone:    z.string().max(30),
    address:  z.string().max(500),
    city:     z.string().max(100),
    wilaya:   z.string().max(100),
    total:    z.number().nonnegative(),
    items:    z.string().max(500).optional(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'delivery_shipment', 30, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { orderId, provider, tracking, autoCreate, orderData } = parsed.data

  try {
    const admin = createAdminClient()

    // Fetch order + vendor_id from order_items in parallel
    const [orderRes, itemsRes] = await Promise.all([
      admin
        .from('orders')
        .select('full_name, phone, wilaya, city, address, total, status')
        .eq('id', orderId)
        .single(),
      admin
        .from('order_items')
        .select('vendor_id')
        .eq('order_id', orderId)
        .not('vendor_id', 'is', null)
        .limit(1),
    ])

    if (!orderRes.data) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    const order = orderRes.data

    // Resolve vendor delivery credentials (use first vendor found in order)
    const vendorId = itemsRes.data?.[0]?.vendor_id as string | undefined
    const vendorConfig = vendorId ? await getVendorDeliveryConfig(vendorId) : null

    let finalTracking = tracking ?? ''
    let labelUrl: string | undefined

    if (autoCreate && orderData && provider !== 'manual') {
      const input: ShipmentInput = {
        orderId:  orderData.orderId,
        fullName: orderData.fullName,
        phone:    orderData.phone,
        address:  orderData.address,
        city:     orderData.city,
        wilaya:   orderData.wilaya,
        total:    orderData.total,
        items:    orderData.items,
      }
      const creds = vendorConfig ? {
        yalidine_api_id:    vendorConfig.yalidine_api_id    ?? undefined,
        yalidine_api_token: vendorConfig.yalidine_api_token ?? undefined,
        procolis_token:     vendorConfig.procolis_token     ?? undefined,
        zr_token:           vendorConfig.zr_token           ?? undefined,
        colivraison_token:  vendorConfig.colivraison_token  ?? undefined,
        maystro_token:      vendorConfig.maystro_token      ?? undefined,
        rex_token:          vendorConfig.rex_token          ?? undefined,
        yassir_api_key:     vendorConfig.yassir_api_key     ?? undefined,
        ecom_token:         vendorConfig.ecom_token         ?? undefined,
        apec_api_id:        vendorConfig.apec_api_id        ?? undefined,
        apec_api_token:     vendorConfig.apec_api_token     ?? undefined,
      } : undefined
      const result = await dispatchShipment(provider, input, creds)
      finalTracking = result.tracking
      labelUrl = result.labelUrl
    }

    if (!finalTracking) {
      return NextResponse.json({ error: 'Tracking number required' }, { status: 400 })
    }

    await updateShippingInfo(orderId, finalTracking, provider, labelUrl)

    // Only advance to 'shipped' from safe states — never regress a delivered/cancelled order
    if (['pending', 'confirmed'].includes(order.status ?? '')) {
      await updateOrderStatus(orderId, 'shipped')
    }

    return NextResponse.json({ tracking: finalTracking, labelUrl })
  } catch (err) {
    logger.error('[POST /api/delivery/shipment]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to create shipment' }, { status: 500 })
  }
}
