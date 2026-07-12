import { NextResponse } from 'next/server'
import { timingSafeEqual, createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVendorDeliveryConfig } from '@/lib/supabase/vendors'
import { updateShipmentStatus } from '@/lib/supabase/shipments'
import { updateOrderStatus } from '@/lib/supabase/orders'
import { dispatchTrack } from '@/lib/delivery/dispatch'
import { logger } from '@/lib/logger'
import { notifyOrderDelivered } from '@/lib/notifications/whatsapp'

export const dynamic = 'force-dynamic'

const ACTIVE_STATUSES = ['pending', 'in_transit', 'picked_up', 'out_for_delivery']

// Fixed size used to pad both buffers before timingSafeEqual so that the
// comparison never leaks secret length and always runs in constant time.
const HMAC_PAD_SIZE = 128

if (!process.env.CRON_SECRET) {
  logger.error(
    '[cron/sync-shipments] CRITICAL: CRON_SECRET env var is not set. ' +
    'The cron endpoint is effectively unprotected in this environment.'
  )
}

function safeCompare(provided: string, expected: string): boolean {
  // Hash both values so the comparison buffers are always the same fixed
  // length, preventing a length-based oracle attack regardless of input size.
  const a = Buffer.alloc(HMAC_PAD_SIZE)
  const b = Buffer.alloc(HMAC_PAD_SIZE)
  Buffer.from(createHash('sha256').update(provided).digest()).copy(a)
  Buffer.from(createHash('sha256').update(expected).digest()).copy(b)
  return timingSafeEqual(a, b)
}

// GET /api/cron/sync-shipments — called by Vercel Cron every 2 hours
// Polls all delivery providers for up-to-date shipment statuses across all vendors.
// Processes the 200 most-stale shipments per run (ordered by updated_at ASC).
export async function GET(request: Request) {
  const provided = (request.headers.get('authorization') ?? '').replace('Bearer ', '')
  const expected = process.env.CRON_SECRET ?? ''
  // When CRON_SECRET is unset both sides hash to the same value, but we still
  // enforce rejection so unprotected deployments fail loudly rather than silently.
  const secretConfigured = expected.length > 0
  const valid = secretConfigured && safeCompare(provided, expected)
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Oldest-first so stale shipments are always prioritised when >200 are active
  const { data: shipments, error } = await admin
    .from('shipments')
    .select('id, vendor_id, provider, tracking_number, status, order_id, recipient_name, recipient_phone, orders(email)')
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

  // Pre-fetch all vendor configs and origin wilayas in parallel
  const vendorIds = Array.from(byVendor.keys())
  const [configResults, vendorWilayaResults] = await Promise.all([
    Promise.all(vendorIds.map(id => getVendorDeliveryConfig(id))),
    Promise.all(vendorIds.map(async (id) => {
      const { data } = await admin.from('vendors').select('wilaya').eq('id', id).maybeSingle()
      return data?.wilaya as string | undefined
    })),
  ])
  const vendorConfigMap = new Map(vendorIds.map((id, i) => [id, configResults[i]]))
  const vendorWilayaMap = new Map(vendorIds.map((id, i) => [id, vendorWilayaResults[i]]))

  let synced = 0
  let errors = 0

  // Vendors processed sequentially; shipments within a vendor in batches of 5
  // to avoid hammering provider APIs with too many concurrent requests
  for (const [vendorId, vendorShipments] of byVendor) {
    const config = vendorConfigMap.get(vendorId) ?? null
    if (!config) {
      logger.warn('[cron/sync-shipments] no delivery config for vendor, skipping', { vendorId })
      continue
    }
    const vendorCreds = {
      yalidine_api_id:    config?.yalidine_api_id    ?? undefined,
      yalidine_api_token: config?.yalidine_api_token ?? undefined,
      procolis_token:     config?.procolis_token     ?? undefined,
      procolis_key:       config?.procolis_key       ?? undefined,
      zr_token:           config?.zr_token           ?? undefined,
      zr_key:             config?.zr_key             ?? undefined,
      colivraison_token:  config?.colivraison_token  ?? undefined,
      maystro_token:      config?.maystro_token      ?? undefined,
      rex_token:          config?.rex_token          ?? undefined,
      yassir_api_key:     config?.yassir_api_key     ?? undefined,
      ecom_api_key:       config?.ecom_api_key       ?? undefined,
      ecom_api_token:     config?.ecom_api_token     ?? undefined,
      apec_api_id:        config?.apec_api_id        ?? undefined,
      apec_api_token:     config?.apec_api_token     ?? undefined,
      from_wilaya:        vendorWilayaMap.get(vendorId),
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

          // Update the order first so that if the process crashes between the
          // two writes, the order state is already correct. The shipment row is
          // the source-of-truth read by the cron on the next run, so it is
          // updated last — a still-active shipment status is safer to re-process
          // than a delivered order left pointing at an active shipment.
          if (result.status === 'delivered') {
            await updateOrderStatus(shipment.order_id, 'delivered')
            if (shipment.recipient_phone && shipment.recipient_name) {
              await notifyOrderDelivered(
                shipment.recipient_phone,
                shipment.recipient_name,
                'fr'
              ).catch((err) =>
                logger.error('[cron/sync-shipments] WhatsApp delivery notification failed', {
                  shipmentId: shipment.id,
                  error: err instanceof Error ? err.message : String(err),
                })
              )
            }
          } else if (result.status === 'returned') {
            await updateOrderStatus(shipment.order_id, 'returned')
          }

          await updateShipmentStatus(shipment.id, result.status, result.detail)

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
