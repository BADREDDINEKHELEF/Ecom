import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorDeliveryConfig } from '@/lib/supabase/vendors'
import { updateShipmentStatus } from '@/lib/supabase/shipments'
import { updateOrderStatus } from '@/lib/supabase/orders'
import { dispatchTrack } from '@/lib/delivery/dispatch'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const ACTIVE_STATUSES = ['pending', 'in_transit', 'picked_up', 'out_for_delivery']

// GET /api/cron/sync-shipments — called by Vercel Cron every 2 hours
// Polls all delivery providers for up-to-date shipment statuses across all vendors.
// Processes the 200 most-stale shipments per run (ordered by updated_at ASC).
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Oldest-first so stale shipments are always prioritised when >200 are active
  const { data: shipments, error } = await admin
    .from('shipments')
    .select('id, vendor_id, provider, tracking_number, status, order_id')
    .in('status', ACTIVE_STATUSES)
    .not('tracking_number', 'is', null)
    .order('updated_at', { ascending: true })
    .limit(200)

  if (error) {
    logger.error('[cron/sync-shipments] fetch error', { error: error.message })
    return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 })
  }

  if (!shipments?.length) {
    return NextResponse.json({ synced: 0, total: 0 })
  }

  // Group by vendor so each vendor's API config is loaded only once
  const byVendor = new Map<string, typeof shipments>()
  for (const s of shipments) {
    const list = byVendor.get(s.vendor_id) ?? []
    list.push(s)
    byVendor.set(s.vendor_id, list)
  }

  let synced = 0
  let errors = 0

  // Vendors processed sequentially; shipments within a vendor in batches of 5
  // to avoid hammering provider APIs with too many concurrent requests
  for (const [vendorId, vendorShipments] of byVendor) {
    const config = await getVendorDeliveryConfig(vendorId)
    const vendorCreds = {
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

    for (let i = 0; i < vendorShipments.length; i += 5) {
      const batch = vendorShipments.slice(i, i + 5)
      await Promise.allSettled(batch.map(async (shipment) => {
        try {
          const result = await dispatchTrack(
            shipment.provider,
            shipment.tracking_number!,
            vendorCreds
          )
          if (!result || result.status === shipment.status) return

          await updateShipmentStatus(shipment.id, result.status, result.detail)

          if (result.status === 'delivered') {
            await updateOrderStatus(shipment.order_id, 'delivered')
          } else if (result.status === 'returned') {
            await updateOrderStatus(shipment.order_id, 'returned')
          }

          synced++
        } catch (err) {
          errors++
          logger.error('[cron/sync-shipments]', {
            shipmentId: shipment.id,
            provider:   shipment.provider,
            error:      err instanceof Error ? err.message : String(err),
          })
        }
      }))
    }
  }

  logger.info('[cron/sync-shipments] done', { synced, total: shipments.length, errors })
  return NextResponse.json({ synced, total: shipments.length, errors })
}
