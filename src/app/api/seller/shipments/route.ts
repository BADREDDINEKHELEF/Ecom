import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createShipment, getVendorShipments, updateShipmentStatus,
  getVendorDeliveryConfig, updateShippingInfo, updateOrderStatus
} from '@/lib/supabase/queries'
import { dispatchShipment } from '@/lib/delivery/dispatch'
import { getClientIp } from '@/lib/utils/ip'

const CreateShipmentSchema = z.object({
  orderId:      z.string().uuid(),
  vendorId:     z.string().uuid(),
  provider:     z.string().min(1),
  trackingNumber: z.string().optional(),
  autoCreate:   z.boolean().optional().default(false),
  notes:        z.string().max(500).optional(),
})

async function getVendorFromSession(_req: NextRequest): Promise<string | null> {
  // NOTE: Seller auth via Supabase Auth requires the SSR client with cookie
  // access. For now we validate vendorId in the request body against the
  // session — full cookie-based auth should be added via @supabase/ssr
  // createServerClient in a future iteration.
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = CreateShipmentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { orderId, vendorId, provider, trackingNumber, autoCreate, notes } = parsed.data

    // Fetch order to get recipient details
    const supabase = createAdminClient()
    const { data: order } = await supabase
      .from('orders')
      .select('full_name, phone, wilaya, city, address, total')
      .eq('id', orderId)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    let finalTracking = trackingNumber ?? ''
    let labelUrl: string | undefined
    let requiresManual = true

    if (autoCreate && !trackingNumber) {
      const config = await getVendorDeliveryConfig(vendorId)
      const result = await dispatchShipment(
        provider,
        {
          orderId,
          fullName: order.full_name,
          phone: order.phone,
          address: order.address,
          city: order.city,
          wilaya: order.wilaya,
          total: order.total,
        },
        {
          yalidine_api_id:    config?.yalidine_api_id  ?? undefined,
          yalidine_api_token: config?.yalidine_api_token ?? undefined,
          procolis_token:     config?.procolis_token   ?? undefined,
          zr_token:           config?.zr_token         ?? undefined,
        }
      )
      finalTracking = result.tracking
      labelUrl = result.labelUrl
      requiresManual = result.requiresManual
    }

    const shipment = await createShipment({
      order_id: orderId,
      vendor_id: vendorId,
      provider,
      tracking_number: finalTracking || null,
      label_url: labelUrl ?? null,
      status: finalTracking ? 'in_transit' : 'pending',
      status_detail: requiresManual ? 'Awaiting tracking number' : null,
      wilaya: order.wilaya,
      city: order.city,
      recipient_name: order.full_name,
      recipient_phone: order.phone,
      declared_value: order.total,
      delivery_cost: 0,
      notes: notes ?? null,
    })

    if (finalTracking) {
      await updateShippingInfo(orderId, finalTracking, provider, labelUrl)
      await updateOrderStatus(orderId, 'shipped')
    }

    return NextResponse.json({ shipment, requiresManual })
  } catch (err) {
    console.error('[POST /api/seller/shipments]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const vendorId = searchParams.get('vendorId')
    const page = parseInt(searchParams.get('page') ?? '0')
    const status = searchParams.get('status') ?? undefined
    const provider = searchParams.get('provider') ?? undefined

    if (!vendorId) return NextResponse.json({ error: 'vendorId required' }, { status: 400 })

    const result = await getVendorShipments(vendorId, page, 50, { status, provider })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[GET /api/seller/shipments]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { shipmentId, trackingNumber, status, detail } = body as {
      shipmentId: string
      trackingNumber?: string
      status?: string
      detail?: string
    }
    if (!shipmentId) return NextResponse.json({ error: 'shipmentId required' }, { status: 400 })

    const supabase = createAdminClient()
    if (trackingNumber) {
      await supabase.from('shipments').update({ tracking_number: trackingNumber }).eq('id', shipmentId)
    }
    if (status) {
      await updateShipmentStatus(shipmentId, status, detail)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /api/seller/shipments]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
