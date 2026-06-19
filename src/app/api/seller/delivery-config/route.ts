import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserIdServer, getVendorDeliveryConfig, saveVendorDeliveryConfig } from '@/lib/supabase/vendors'
import { logger } from '@/lib/logger'

const PatchSchema = z.object({
  default_provider:    z.string().max(50).optional(),
  yalidine_api_id:     z.string().max(200).nullable().optional(),
  yalidine_api_token:  z.string().max(500).nullable().optional(),
  procolis_token:      z.string().max(500).nullable().optional(),
  zr_token:            z.string().max(500).nullable().optional(),
  colivraison_token:   z.string().max(500).nullable().optional(),
  maystro_token:       z.string().max(500).nullable().optional(),
  rex_token:           z.string().max(500).nullable().optional(),
  yassir_api_key:      z.string().max(500).nullable().optional(),
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

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    const config = await getVendorDeliveryConfig(vendor.id)
    // Never send raw API credentials to the browser — only expose presence flags.
    const redacted = config ? {
      default_provider:     config.default_provider,
      auto_create_shipment: config.auto_create_shipment,
      notify_whatsapp:      config.notify_whatsapp,
      notify_sms:           config.notify_sms,
      has_yalidine:         !!(config.yalidine_api_id && config.yalidine_api_token),
      has_procolis:         !!config.procolis_token,
      has_zr:               !!config.zr_token,
      has_colivraison:      !!config.colivraison_token,
      has_maystro:          !!config.maystro_token,
      has_rex:              !!config.rex_token,
      has_yassir:           !!config.yassir_api_key,
      has_ecom:             !!config.ecom_token,
      has_apec:             !!(config.apec_api_id && config.apec_api_token),
    } : null
    return NextResponse.json({ config: redacted })
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

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 403 })

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 })

    try {
      await saveVendorDeliveryConfig(vendor.id, parsed.data)
    } catch (dbErr: unknown) {
      // Supabase throws PostgrestError (not a standard Error) — extract message explicitly
      const pg = dbErr as { message?: string; code?: string; details?: string; hint?: string }
      const msg = pg?.message ?? (dbErr instanceof Error ? dbErr.message : JSON.stringify(dbErr))
      const detail = [pg?.code, pg?.details, pg?.hint].filter(Boolean).join(' | ')
      logger.error('[PATCH /api/seller/delivery-config] db error', { error: msg, detail })
      return NextResponse.json({ error: 'Failed to save delivery configuration' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[PATCH /api/seller/delivery-config]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
