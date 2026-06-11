import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserId, getVendorDeliveryConfig, saveVendorDeliveryConfig } from '@/lib/supabase/vendors'
import { logger } from '@/lib/logger'

const PatchSchema = z.object({
  default_provider:    z.string().max(50).optional(),
  yalidine_api_id:     z.string().max(200).nullable().optional(),
  yalidine_api_token:  z.string().max(500).nullable().optional(),
  procolis_token:      z.string().max(500).nullable().optional(),
  zr_token:            z.string().max(500).nullable().optional(),
  ecom_token:          z.string().max(500).nullable().optional(),
  apec_api_id:         z.string().max(200).nullable().optional(),
  apec_api_token:      z.string().max(500).nullable().optional(),
  auto_create_shipment: z.boolean().optional(),
  notify_whatsapp:     z.boolean().optional(),
  notify_sms:          z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserId(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const config = await getVendorDeliveryConfig(vendor.id)
    return NextResponse.json({ config })
  } catch (err) {
    logger.error('[GET /api/seller/delivery-config]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const vendor = await getVendorByUserId(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

    await saveVendorDeliveryConfig(vendor.id, parsed.data)
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/seller/delivery-config]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
