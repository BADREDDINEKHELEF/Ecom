import { NextRequest, NextResponse } from 'next/server'
import { copyCookies } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorDeliveryConfig } from '@/lib/supabase/vendors'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
import { dispatchGetStats } from '@/lib/delivery/dispatch'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit, checkUserRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

// GET /api/seller/delivery-dashboard
// Returns aggregate shipment stats from local DB + optionally from provider API
export async function GET(req: NextRequest) {
  const response = NextResponse.next()
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, 'delivery_dashboard', 60, 60)
  if (!rl.allowed) return copyCookies(response, NextResponse.json(
    { error: 'Trop de requêtes. Réessayez plus tard.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  ))
  const result = await requireVendorPermission(req, 'delivery:read', response)
  if (result instanceof NextResponse) return result
  const { ctx: { user, vendor } } = result

  const userRl = await checkUserRateLimit(user.id, 'delivery_dashboard', 60, 3600)
  if (!userRl.allowed) return copyCookies(response, NextResponse.json(
    { error: 'Limite atteinte. Réessayez plus tard.' },
    { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
  ))

  const admin = createAdminClient()

  try {
    // Local DB stats — always available
    const { data: rows } = await admin
      .from('shipments')
      .select('status, updated_at')
      .eq('vendor_id', vendor.id)
      .order('updated_at', { ascending: false })
      .limit(1000)

    const counts: Record<string, number> = {
      pending: 0, in_transit: 0, picked_up: 0, out_for_delivery: 0,
      delivered: 0, returned: 0, failed: 0, cancelled: 0,
    }
    let lastSynced: string | null = null

    for (const r of rows ?? []) {
      if (r.status in counts) counts[r.status]++
      if (!lastSynced) lastSynced = r.updated_at
    }

    const total = Object.values(counts).reduce((s, n) => s + n, 0)
    const finished = counts.delivered + counts.returned
    const dbStats = {
      total,
      pending:         counts.pending,
      inTransit:       counts.in_transit + counts.picked_up + counts.out_for_delivery,
      delivered:       counts.delivered,
      returned:        counts.returned,
      failed:          counts.failed,
      cancelled:       counts.cancelled,
      deliveryRate:    finished > 0 ? Math.round((counts.delivered / finished) * 100) : 0,
      returnRate:      finished > 0 ? Math.round((counts.returned  / finished) * 100) : 0,
    }

    // Provider live stats — best-effort, only when vendor has their own config
    let providerStats = null
    try {
      const config = await getVendorDeliveryConfig(vendor.id)
      // Never fall back to platform-level credentials — skip stats if vendor has no config
      if (config) {
        const provider = config.default_provider ?? 'yalidine'
        const vendorCreds = {
          yalidine_api_id:    config.yalidine_api_id    ?? undefined,
          yalidine_api_token: config.yalidine_api_token ?? undefined,
          procolis_token:     config.procolis_token     ?? undefined,
          procolis_key:       config.procolis_key       ?? undefined,
          zr_token:           config.zr_token           ?? undefined,
          zr_key:             config.zr_key             ?? undefined,
          colivraison_token:  config.colivraison_token  ?? undefined,
          maystro_token:      config.maystro_token      ?? undefined,
          rex_token:          config.rex_token          ?? undefined,
          yassir_api_key:     config.yassir_api_key     ?? undefined,
          ecom_api_key:       config.ecom_api_key       ?? undefined,
          ecom_api_token:      config.ecom_api_token      ?? undefined,
          apec_api_id:        config.apec_api_id        ?? undefined,
          apec_api_token:     config.apec_api_token     ?? undefined,
        }
        providerStats = await Promise.race([
          dispatchGetStats(provider, vendorCreds),
          new Promise<null>((res) => setTimeout(() => res(null), 5000)),
        ])
      }
    } catch {
      // Provider stats are optional — swallow error
    }

    return copyCookies(response, NextResponse.json({ dbStats, providerStats, lastSynced }))
  } catch (err) {
    logger.error('[GET /api/seller/delivery-dashboard]', {
      error: err instanceof Error ? err.message : String(err),
    })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
