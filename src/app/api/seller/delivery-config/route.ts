import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRouteClient, copyCookies } from '@/lib/supabase/server'
import { getVendorByUserIdServer, getVendorDeliveryConfig, saveVendorDeliveryConfig } from '@/lib/supabase/vendors'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

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
  ecom_api_key:        z.string().max(500).nullable().optional(),
  ecom_api_token:       z.string().max(500).nullable().optional(),
  apec_api_id:         z.string().max(200).nullable().optional(),
  apec_api_token:      z.string().max(500).nullable().optional(),
  auto_create_shipment: z.boolean().optional(),
  notify_whatsapp:     z.boolean().optional(),
  notify_sms:          z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'delivery_config_read', 60, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const supabase = createRouteClient(req, response)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return copyCookies(response, NextResponse.json({ error: 'Vendor not found' }, { status: 403 }))

    const config = await getVendorDeliveryConfig(vendor.id)
    const mask = (v?: string | null) => v ? '••••••••' : ''

    const redacted = config ? {
      default_provider:     config.default_provider,
      auto_create_shipment: config.auto_create_shipment,
      notify_whatsapp:      config.notify_whatsapp,
      notify_sms:           config.notify_sms,
      yalidine_api_id:      mask(config.yalidine_api_id),
      yalidine_api_token:   mask(config.yalidine_api_token),
      procolis_token:       mask(config.procolis_token),
      zr_token:             mask(config.zr_token),
      colivraison_token:    mask(config.colivraison_token),
      maystro_token:        mask(config.maystro_token),
      rex_token:            mask(config.rex_token),
      yassir_api_key:       mask(config.yassir_api_key),
      ecom_api_key:         mask(config.ecom_api_key),
      ecom_api_token:        mask(config.ecom_api_token),
      apec_api_id:          mask(config.apec_api_id),
      apec_api_token:       mask(config.apec_api_token),
      has_yalidine:         !!(config.yalidine_api_id && config.yalidine_api_token),
      has_procolis:         !!config.procolis_token,
      has_zr:               !!config.zr_token,
      has_colivraison:      !!config.colivraison_token,
      has_maystro:          !!config.maystro_token,
      has_rex:              !!config.rex_token,
      has_yassir:           !!config.yassir_api_key,
      has_ecom:             !!(config.ecom_api_key && config.ecom_api_token),
      has_apec:             !!(config.apec_api_id && config.apec_api_token),
    } : null
    return copyCookies(response, NextResponse.json({ config: redacted }))
  } catch (err) {
    logger.error('[GET /api/seller/delivery-config]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

export async function PATCH(req: NextRequest) {
  const response = NextResponse.next()
  try {
    const ip = getClientIp(req)
    const rl = await checkSellerRateLimit(ip, 'delivery_config_write', 10, 60)
    if (!rl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Trop de requêtes. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    ))
    const supabase = createRouteClient(req, response)
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

    const userRl = await checkUserRateLimit(user.id, 'delivery_config', 10, 3600)
    if (!userRl.allowed) return copyCookies(response, NextResponse.json(
      { error: 'Limite atteinte. Réessayez plus tard.' },
      { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
    ))

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return copyCookies(response, NextResponse.json({ error: 'Vendor not found' }, { status: 403 }))

    let body: unknown
    try { body = await req.json() } catch {
      return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
    }

    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) return copyCookies(response, NextResponse.json({ error: 'Validation failed' }, { status: 400 }))

    const updates = { ...parsed.data }
    const existing = await getVendorDeliveryConfig(vendor.id)
    if (existing) {
      const merge = (newVal: string | null | undefined, oldVal: string | null | undefined) => {
        if (newVal === '••••••••') return oldVal
        return newVal
      }
      if (updates.yalidine_api_id !== undefined)    updates.yalidine_api_id    = merge(updates.yalidine_api_id, existing.yalidine_api_id)
      if (updates.yalidine_api_token !== undefined) updates.yalidine_api_token = merge(updates.yalidine_api_token, existing.yalidine_api_token)
      if (updates.procolis_token !== undefined)     updates.procolis_token     = merge(updates.procolis_token, existing.procolis_token)
      if (updates.zr_token !== undefined)           updates.zr_token           = merge(updates.zr_token, existing.zr_token)
      if (updates.colivraison_token !== undefined)  updates.colivraison_token  = merge(updates.colivraison_token, existing.colivraison_token)
      if (updates.maystro_token !== undefined)      updates.maystro_token      = merge(updates.maystro_token, existing.maystro_token)
      if (updates.rex_token !== undefined)          updates.rex_token          = merge(updates.rex_token, existing.rex_token)
      if (updates.yassir_api_key !== undefined)     updates.yassir_api_key     = merge(updates.yassir_api_key, existing.yassir_api_key)
      if (updates.ecom_api_key !== undefined)       updates.ecom_api_key       = merge(updates.ecom_api_key, existing.ecom_api_key)
      if (updates.ecom_api_token !== undefined)     updates.ecom_api_token     = merge(updates.ecom_api_token, existing.ecom_api_token)
      if (updates.apec_api_id !== undefined)        updates.apec_api_id        = merge(updates.apec_api_id, existing.apec_api_id)
      if (updates.apec_api_token !== undefined)     updates.apec_api_token     = merge(updates.apec_api_token, existing.apec_api_token)
    }

    try {
      await saveVendorDeliveryConfig(vendor.id, updates)
    } catch (dbErr: unknown) {
      // Supabase throws PostgrestError (not a standard Error) — extract message explicitly
      const pg = dbErr as { message?: string; code?: string; details?: string; hint?: string }
      const msg = pg?.message ?? (dbErr instanceof Error ? dbErr.message : JSON.stringify(dbErr))
      const detail = [pg?.code, pg?.details, pg?.hint].filter(Boolean).join(' | ')
      logger.error('[PATCH /api/seller/delivery-config] db error', { error: msg, detail })
      return copyCookies(response, NextResponse.json({ error: detail ? `${msg} — ${detail}` : msg }, { status: 500 }))
    }
    return copyCookies(response, NextResponse.json({ ok: true }))
  } catch (err) {
    logger.error('[PATCH /api/seller/delivery-config]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
