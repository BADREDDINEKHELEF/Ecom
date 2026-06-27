import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import { logger } from '@/lib/logger'
import {
  createShipment, getVendorShipments, updateShipmentStatus,
  getVendorDeliveryConfig, updateShippingInfo, updateOrderStatus
} from '@/lib/supabase/queries'
import { dispatchShipment, dispatchGetRate } from '@/lib/delivery/dispatch'
import { checkSellerRateLimit, checkUserDualRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { WILAYA_DATA, ZONE_CONFIG } from '@/lib/data/wilayas'

const SUPPORTED_PROVIDERS = ['yalidine', 'procolis', 'zr', 'colivraison', 'maystro', 'rex', 'yassir', 'ecom', 'apec', 'manual'] as const
const SHIPMENT_STATUSES   = ['pending', 'in_transit', 'picked_up', 'out_for_delivery', 'delivered', 'returned', 'failed', 'cancelled'] as const
const TRACKING_REGEX      = /^[A-Za-z0-9]{6,20}$/

const CreateShipmentSchema = z.object({
  orderId:        z.string().uuid(),
  provider:       z.enum(SUPPORTED_PROVIDERS),
  trackingNumber: z.string().regex(TRACKING_REGEX).optional(),
  isStopDesk:     z.boolean().optional(),
  stopDeskCause:  z.string().max(300).optional().nullable(),
  autoCreate:     z.boolean().optional().default(false),
  notes:          z.string().max(500).optional(),
})

const PatchShipmentSchema = z.object({
  shipmentId:     z.string().uuid(),
  trackingNumber: z.string().regex(TRACKING_REGEX).optional(),
  status:         z.enum(SHIPMENT_STATUSES).optional(),
  detail:         z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, 'shipments_create', 20, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes. Réessayez plus tard.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )
  const supabase = createRouteClient(req)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userRl = await checkUserDualRateLimit(user.id, 'shipments', {
    burstMax: 5, burstWindowSecs: 60,
    sustainedMax: 30, sustainedWindowSecs: 3600,
  })
  if (!userRl.allowed) return NextResponse.json(
    { error: 'Limite atteinte. Réessayez plus tard.' },
    { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
  )

  const vendor = await getVendorByUserIdServer(user.id)
  if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateShipmentSchema.safeParse(body)
  if (!parsed.success) {
    const details = process.env.NODE_ENV === 'development' ? parsed.error.flatten() : undefined
    return NextResponse.json({ error: 'Validation failed', ...(details && { details }) }, { status: 400 })
  }

  const { orderId, provider, trackingNumber, isStopDesk, stopDeskCause, autoCreate, notes } = parsed.data

  try {
    const admin = createAdminClient()

    // Verify the order exists and contains at least one item from this vendor
    const [{ data: order }, { data: vendorItems }] = await Promise.all([
      admin.from('orders').select('full_name, phone, wilaya, city, address, total, status, is_stopdesk, stop_desk_cause').eq('id', orderId).single(),
      admin.from('order_items').select('product_name, quantity').eq('order_id', orderId).eq('vendor_id', vendor.id),
    ])

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (!vendorItems || vendorItems.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let finalTracking = trackingNumber ?? ''
    let labelUrl: string | undefined
    let requiresManual = true

    // Prevent duplicate shipments for the same order+vendor (race condition guard)
    const { data: existingShipment } = await admin
      .from('shipments')
      .select('id')
      .eq('order_id', orderId)
      .eq('vendor_id', vendor.id)
      .limit(1)
      .maybeSingle()
    if (existingShipment) {
      return NextResponse.json({ error: 'A shipment already exists for this order' }, { status: 409 })
    }

    const config = provider !== 'manual' ? await getVendorDeliveryConfig(vendor.id) : null

    if (autoCreate && !trackingNumber && provider !== 'manual') {
      const itemsString = vendorItems
        .map((item) => `${item.product_name} x ${item.quantity}`)
        .join(', ')
        .slice(0, 500)

      let result
      try {
        result = await dispatchShipment(
          provider,
          {
            orderId,
            fullName: order.full_name,
            phone:    order.phone,
            address:  order.address,
            city:     order.city,
            wilaya:   order.wilaya,
            total:    order.total,
            items:    itemsString,
            isStopDesk: isStopDesk ?? order.is_stopdesk ?? false,
            stopDeskCause: stopDeskCause ?? (order as typeof order & { stop_desk_cause?: string | null }).stop_desk_cause ?? null,
          },
          {
            yalidine_api_id:    config?.yalidine_api_id    ?? undefined,
            yalidine_api_token: config?.yalidine_api_token ?? undefined,
            procolis_token:     config?.procolis_token     ?? undefined,
            zr_token:           config?.zr_token           ?? undefined,
            colivraison_token:  config?.colivraison_token  ?? undefined,
            maystro_token:      config?.maystro_token      ?? undefined,
            rex_token:          config?.rex_token          ?? undefined,
            yassir_api_key:     config?.yassir_api_key     ?? undefined,
            ecom_token:         config?.ecom_token         ?? undefined,
            apec_api_id:        config?.apec_api_id        ?? undefined,
            apec_api_token:     config?.apec_api_token     ?? undefined,
          }
        )
      } catch (providerErr) {
        const msg = providerErr instanceof Error ? providerErr.message : String(providerErr)
        logger.error(`[POST /api/seller/shipments] provider=${provider} error`, { error: msg })
        return NextResponse.json({ error: 'Delivery provider error. Please check your configuration and try again.' }, { status: 502 })
      }
      finalTracking  = result.tracking
      labelUrl       = result.labelUrl
      requiresManual = result.requiresManual
    }

    // Resolve delivery cost from carrier API, fallback to static zone price
    let resolvedDeliveryCost = 0
    if (provider !== 'manual') {
      try {
        const rate = await dispatchGetRate(provider, order.wilaya, config ?? undefined, true)
        if (rate) {
          resolvedDeliveryCost = (order.is_stopdesk && rate.deskDelivery != null) ? rate.deskDelivery : rate.homeDelivery
        } else {
          const zone = WILAYA_DATA[order.wilaya]?.zone ?? 3
          resolvedDeliveryCost = ZONE_CONFIG[zone].cost
        }
      } catch (rateErr) {
        logger.warn(`[POST /api/seller/shipments] failed to fetch rate for provider=${provider} wilaya=${order.wilaya}`, { error: rateErr })
        const zone = WILAYA_DATA[order.wilaya]?.zone ?? 3
        resolvedDeliveryCost = ZONE_CONFIG[zone].cost
      }
    } else {
      const zone = WILAYA_DATA[order.wilaya]?.zone ?? 3
      resolvedDeliveryCost = ZONE_CONFIG[zone].cost
    }

    const shipment = await createShipment({
      order_id:        orderId,
      vendor_id:       vendor.id,
      provider,
      tracking_number: finalTracking || null,
      label_url:       labelUrl ?? null,
      status:          finalTracking ? 'in_transit' : 'pending',
      status_detail:   requiresManual ? 'Awaiting tracking number' : null,
      wilaya:          order.wilaya,
      city:            order.city,
      recipient_name:  order.full_name,
      recipient_phone: order.phone,
      declared_value:  order.total,
      delivery_cost:   resolvedDeliveryCost,
      notes:           notes ?? null,
    })

    if (finalTracking) {
      await updateShippingInfo(orderId, finalTracking, provider, labelUrl)
      // Only advance to 'shipped' from safe states — never regress a delivered/cancelled order
      if (order.status && ['pending', 'confirmed'].includes(order.status)) {
        await updateOrderStatus(orderId, 'shipped')
      }
    }

    return NextResponse.json({ shipment, requiresManual })
  } catch (err) {
    logger.error('[POST /api/seller/shipments]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, 'shipments_read', 60, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes. Réessayez plus tard.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )
  const supabase = createRouteClient(req)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vendor = await getVendorByUserIdServer(user.id)
  if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const page     = Math.max(0, parseInt(searchParams.get('page') ?? '0') || 0)
    const status   = searchParams.get('status')   ?? undefined
    const provider = searchParams.get('provider') ?? undefined

    const result = await getVendorShipments(vendor.id, page, 50, { status, provider })
    return NextResponse.json(result)
  } catch (err) {
    logger.error('[GET /api/seller/shipments]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, 'shipments_patch', 20, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes. Réessayez plus tard.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )
  const supabase = createRouteClient(req)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vendor = await getVendorByUserIdServer(user.id)
  if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = PatchShipmentSchema.safeParse(body)
  if (!parsed.success) {
    const details = process.env.NODE_ENV === 'development' ? parsed.error.flatten() : undefined
    return NextResponse.json({ error: 'Validation failed', ...(details && { details }) }, { status: 400 })
  }

  const { shipmentId, trackingNumber, status, detail } = parsed.data

  try {
    const admin = createAdminClient()

    // Verify shipment belongs to authenticated vendor before updating
    const { data: existing } = await admin
      .from('shipments')
      .select('id, vendor_id, order_id, provider')
      .eq('id', shipmentId)
      .single()

    if (!existing) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    if (existing.vendor_id !== vendor.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (trackingNumber) {
      await admin.from('shipments').update({ tracking_number: trackingNumber }).eq('id', shipmentId)
      // Propagate to orders table so customer tracking page reflects the new number
      await updateShippingInfo(existing.order_id, trackingNumber, existing.provider)
    }
    if (status) {
      await updateShipmentStatus(shipmentId, status, detail)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/seller/shipments]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
