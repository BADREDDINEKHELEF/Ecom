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
import { dispatchShipment } from '@/lib/delivery/dispatch'

const CreateShipmentSchema = z.object({
  orderId:        z.string().uuid(),
  provider:       z.string().min(1),
  trackingNumber: z.string().optional(),
  autoCreate:     z.boolean().optional().default(false),
  notes:          z.string().max(500).optional(),
})

const PatchShipmentSchema = z.object({
  shipmentId:     z.string().uuid(),
  trackingNumber: z.string().optional(),
  status:         z.string().optional(),
  detail:         z.string().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = createRouteClient(req)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vendor = await getVendorByUserIdServer(user.id)
  if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = CreateShipmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { orderId, provider, trackingNumber, autoCreate, notes } = parsed.data

  try {
    const admin = createAdminClient()

    // Verify the order exists and contains at least one item from this vendor
    const [{ data: order }, { data: vendorItem }] = await Promise.all([
      admin.from('orders').select('full_name, phone, wilaya, city, address, total, status').eq('id', orderId).single(),
      admin.from('order_items').select('id').eq('order_id', orderId).eq('vendor_id', vendor.id).limit(1).maybeSingle(),
    ])

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (!vendorItem) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    let finalTracking = trackingNumber ?? ''
    let labelUrl: string | undefined
    let requiresManual = true

    if (autoCreate && !trackingNumber) {
      const config = await getVendorDeliveryConfig(vendor.id)
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
        return NextResponse.json({ error: `Delivery provider error: ${msg}` }, { status: 502 })
      }
      finalTracking  = result.tracking
      labelUrl       = result.labelUrl
      requiresManual = result.requiresManual
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
      delivery_cost:   0,
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
  const supabase = createRouteClient(req)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vendor = await getVendorByUserIdServer(user.id)
  if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const page     = parseInt(searchParams.get('page') ?? '0')
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
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { shipmentId, trackingNumber, status, detail } = parsed.data

  try {
    const admin = createAdminClient()

    // Verify shipment belongs to authenticated vendor before updating
    const { data: existing } = await admin
      .from('shipments')
      .select('id, vendor_id')
      .eq('id', shipmentId)
      .single()

    if (!existing) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    if (existing.vendor_id !== vendor.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (trackingNumber) {
      await admin.from('shipments').update({ tracking_number: trackingNumber }).eq('id', shipmentId)
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
