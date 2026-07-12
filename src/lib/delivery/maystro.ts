import { ShipmentInput, ShipmentResult } from './types'
import { toLocalAlgerianPhone, wilayaNameToId } from './utils'
import { deliveryFetch } from './client'
import { logger } from '@/lib/logger'

/**
 * Maystro Delivery API.
 * Official docs: https://maystro.gitbook.io/maystro-delivery-documentation
 * We use the deprecated-but-documented /stores/orders_store/ endpoint because
 * the newest endpoint requires a product UUID catalog that ShopDZ does not yet sync.
 */
const BASE_URL = 'https://backend.maystro-delivery.com/api'

function authHeaders(token: string): Record<string, string> {
  // Official examples use "Token <token>" (DRF knox token auth).
  return {
    'Content-Type':  'application/json',
    'Authorization': `Token ${token}`,
  }
}

export function maystroConfigured(): boolean {
  return !!process.env.MAYSTRO_TOKEN
}

export async function maystroCreateShipmentWithToken(
  input: ShipmentInput,
  token: string
): Promise<ShipmentResult> {
  const wilayaId = wilayaNameToId(input.wilaya)
  if (wilayaId == null) throw new Error(`Maystro: unknown wilaya "${input.wilaya}"`)

  /**
   * Deprecated endpoint: POST /stores/orders_store/
   * Docs show wilaya as string id ("16") and commune as integer id.
   * ShopDZ currently sends the commune name; a numeric commune mapping is required
   * for production use. The products array is mandatory; we use orderId as a
   * placeholder product_id because ShopDZ does not yet sync Maystro product catalog.
   */
  const body: Record<string, unknown> = {
    source: 4,
    external_order_id: input.orderId,
    destination_text: input.address,
    product_price: input.total,
    customer_name: input.fullName,
    customer_phone: toLocalAlgerianPhone(input.phone),
    express: false,
    wilaya: String(wilayaId),
    commune: input.city,
    note_to_driver: input.isStopDesk && input.stopDeskCause
      ? `${input.items || 'Colis'} — ${input.stopDeskCause}`
      : (input.items || ''),
    delivery_type: input.isStopDesk ? 2 : 1,
    products: [
      {
        product_id: input.orderId,
        quantity: 1,
        logistical_description: input.items || 'Colis',
      },
    ],
  }

  const res = await deliveryFetch(`${BASE_URL}/stores/orders_store/`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Maystro ${res.status}: ${text}`)
  }

  const data = await res.json()
  const tracking = String(
    data?.display_id ?? data?.tracking ?? data?.tracking_code ?? data?.order_id ?? data?.id ?? ''
  )
  const labelUrl: string | undefined = data?.label ?? data?.label_url ??
    (tracking ? `${BASE_URL}/stores/orders_store/${tracking}/label/` : undefined)

  return { tracking, labelUrl }
}

export async function maystroCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!maystroConfigured()) throw new Error('Maystro token not configured')
  return maystroCreateShipmentWithToken(input, process.env.MAYSTRO_TOKEN!)
}

export async function maystroListParcels(token: string, pageSize = 100) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/stores/orders/?page=1&page_size=${pageSize}`, {
      headers: authHeaders(token),
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[maystroListParcels]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function maystroTrack(trackingCode: string, token: string) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/stores/orders/${encodeURIComponent(trackingCode)}/`, {
      headers: authHeaders(token),
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[maystroTrack]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}
