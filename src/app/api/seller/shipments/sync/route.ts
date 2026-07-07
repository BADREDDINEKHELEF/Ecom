import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient, copyCookies } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorByUserIdServer, getVendorDeliveryConfig } from '@/lib/supabase/vendors'
import { updateShipmentStatus } from '@/lib/supabase/shipments'
import { updateOrderStatus } from '@/lib/supabase/orders'
import { dispatchTrack } from '@/lib/delivery/dispatch'
import { logger } from '@/lib/logger'
import { checkSellerRateLimit, checkUserDualRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

// POST /api/seller/shipments/sync
// Fetches live status from each provider for all active (non-terminal) shipments
// and updates them in the database. Returns { synced, skipped, errors }.
export async function POST(req: NextRequest) {
  const response = NextResponse.next()
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, 'shipments_sync', 10, 60)
  if (!rl.allowed) return copyCookies(response, NextResponse.json(
    { error: 'Trop de requêtes. Réessayez plus tard.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  ))
  const supabase = createRouteClient(req, response)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return copyCookies(response, NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))

  const userRl = await checkUserDualRateLimit(user.id, 'shipments_sync', {
    burstMax: 3, burstWindowSecs: 60,
    sustainedMax: 20, sustainedWindowSecs: 3600,
  })
  if (!userRl.allowed) return copyCookies(response, NextResponse.json(
    { error: 'Limite atteinte. Réessayez plus tard.' },
    { status: 429, headers: { 'Retry-After': String(userRl.retryAfterSeconds) } }
  ))

  const vendor = await getVendorByUserIdServer(user.id)
  if (!vendor) return copyCookies(response, NextResponse.json({ error: 'Vendor not found' }, { status: 403 }))

  const admin = createAdminClient()

  // Only sync shipments that are not yet in a terminal state
  const { data: activeShipments, error: fetchErr } = await admin
    .from('shipments')
    .select('id, provider, tracking_number, status, order_id')
    .eq('vendor_id', vendor.id)
    .not('tracking_number', 'is', null)
    .neq('status', 'delivered')
    .neq('status', 'returned')
    .neq('status', 'cancelled')
    .neq('status', 'failed')
    .order('updated_at', { ascending: true })
    .limit(50)

  if (fetchErr) {
    logger.error('[POST /api/seller/shipments/sync] fetch error', { error: fetchErr.message })
    return copyCookies(response, NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 }))
  }

  const config = await getVendorDeliveryConfig(vendor.id)
  const vendorCreds = {
    yalidine_api_id:    config?.yalidine_api_id    ?? undefined,
    yalidine_api_token: config?.yalidine_api_token ?? undefined,
    procolis_token:     config?.procolis_token     ?? undefined,
    zr_token:           config?.zr_token           ?? undefined,
    colivraison_token:  config?.colivraison_token  ?? undefined,
    maystro_token:      config?.maystro_token      ?? undefined,
    rex_token:          config?.rex_token          ?? undefined,
    yassir_api_key:     config?.yassir_api_key     ?? undefined,
    ecom_api_key:       config?.ecom_api_key       ?? undefined,
    ecom_api_token:      config?.ecom_api_token      ?? undefined,
    apec_api_id:        config?.apec_api_id        ?? undefined,
    apec_api_token:     config?.apec_api_token     ?? undefined,
  }

  let synced = 0
  let skipped = 0
  let errors = 0

  await Promise.allSettled(
    (activeShipments ?? []).map(async (shipment) => {
      if (!shipment.tracking_number) { skipped++; return }

      try {
        const result = await dispatchTrack(shipment.provider, shipment.tracking_number, vendorCreds)
        if (!result) { skipped++; return }

        // Only write to DB if status actually changed
        if (result.status !== shipment.status) {
          await updateShipmentStatus(shipment.id, result.status, result.detail)
          // Mirror terminal statuses to the parent order so revenue/stats stay accurate
          if (result.status === 'delivered') {
            await updateOrderStatus(shipment.order_id, 'delivered')
          } else if (result.status === 'returned') {
            await updateOrderStatus(shipment.order_id, 'returned')
          }
          synced++
        } else {
          skipped++
        }
      } catch (err) {
        errors++
        logger.error('[sync] shipment error', {
          id: shipment.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    })
  )

  return copyCookies(response, NextResponse.json({ synced, skipped, errors }))
}
