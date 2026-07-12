import { ShipmentInput, ShipmentResult } from './types'
import { splitName, extractRates, isValidWilaya, findWilayaRow, toLocalAlgerianPhone, wilayaNameToId } from './utils'
import { deliveryFetch } from './client'

const BASE_URL = 'https://api.yalidine.app/v1'

function buildHeaders(apiId: string, apiToken: string) {
  return {
    'Content-Type': 'application/json',
    'X-API-ID': apiId,
    'X-API-TOKEN': apiToken,
  }
}

export function yalidineConfigured(): boolean {
  return !!(process.env.YALIDINE_API_ID && process.env.YALIDINE_API_TOKEN)
}

async function createShipmentWithHeaders(
  input: ShipmentInput,
  apiId: string,
  apiToken: string
): Promise<ShipmentResult> {
  const { firstname, familyname } = splitName(input.fullName)

  /**
   * Yalidine create-parcel payload per official integration docs
   * (Laravel-Yalidine, DZBuild, CourierDZ).
   * Required: order_id, from_wilaya_name, firstname, familyname, contact_phone,
   * address, to_commune_name, to_wilaya_name, product_list, price, do_insurance,
   * declared_value, length, width, height, weight, freeshipping, is_stopdesk,
   * has_exchange. stopdesk_id is required when is_stopdesk=true.
   */
  const body: Record<string, unknown> = {
    order_id: input.orderId,
    from_wilaya_name: input.fromWilaya ?? undefined,
    firstname,
    familyname,
    contact_phone: toLocalAlgerianPhone(input.phone),
    address: input.address,
    to_commune_name: input.city,
    to_wilaya_name: input.wilaya,
    product_list: input.items || 'Colis',
    price: input.total,
    do_insurance: 0,
    declared_value: input.total,
    length: 30,
    width: 30,
    height: 30,
    weight: 1,
    freeshipping: 0,
    is_stopdesk: !!input.isStopDesk,
    has_exchange: !!input.isExchange,
  }

  if (input.isStopDesk) {
    if (input.stopDeskId) body.stopdesk_id = input.stopDeskId
    // product_to_collect is only meaningful for exchange shipments.
    if (input.isExchange && input.productToCollect) {
      body.product_to_collect = input.productToCollect
    }
  }

  const res = await deliveryFetch(`${BASE_URL}/parcels/`, {
    method: 'POST',
    headers: buildHeaders(apiId, apiToken),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Yalidine ${res.status}: ${text}`)
  }

  const data = await res.json()
  /**
   * Yalidine returns an object keyed by order_id:
   * { [order_id]: { success: 'true', tracking: '...', label: '...', ... } }
   * We first try that shape, then fall back to a flat object.
   */
  const parcel = data?.[input.orderId] ?? data
  return {
    tracking: String(
      parcel?.tracking ?? parcel?.tracking_code ?? parcel?.tracking_number ??
      parcel?.parcel_id ?? parcel?.id ?? ''
    ),
    labelUrl: parcel?.label ?? parcel?.label_url ?? undefined,
  }
}

export async function yalidineCreateShipmentWithCreds(
  input: ShipmentInput,
  apiId: string,
  apiToken: string
): Promise<ShipmentResult> {
  return createShipmentWithHeaders(input, apiId, apiToken)
}

export async function yalidineCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!yalidineConfigured()) throw new Error('Yalidine API keys not configured')
  return createShipmentWithHeaders(
    input,
    process.env.YALIDINE_API_ID!,
    process.env.YALIDINE_API_TOKEN!
  )
}

export async function yalidineTrack(trackingNumber: string, apiId: string, apiToken: string) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/parcels/${encodeURIComponent(trackingNumber)}/`, {
      headers: buildHeaders(apiId, apiToken),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function yalidineListParcels(apiId: string, apiToken: string, pageSize = 100) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/parcels/?page=1&page_size=${pageSize}`, {
      headers: buildHeaders(apiId, apiToken),
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function yalidineGetRates(
  wilayaName: string,
  fromWilayaName?: string
) {
  if (!isValidWilaya(wilayaName)) return null
  if (!yalidineConfigured()) return null
  return yalidineGetRateWithCreds(wilayaName, process.env.YALIDINE_API_ID!, process.env.YALIDINE_API_TOKEN!, fromWilayaName)
}

export async function yalidineGetRateWithCreds(
  wilayaName: string,
  apiId: string,
  apiToken: string,
  fromWilayaName?: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null
  try {
    /**
     * Official Yalidine fee endpoint is /v1/fees?from_wilaya_id=&to_wilaya_id=.
     * It returns per-commune rates; we extract express_home / express_stop_desk.
     * Fall back to the legacy /delivery-fees/?to_wilaya_name= endpoint when the
     * origin wilaya is not available.
     */
    let url: string
    const toId = wilayaNameToId(wilayaName)
    if (fromWilayaName && toId != null) {
      const fromId = wilayaNameToId(fromWilayaName)
      if (fromId != null) {
        url = `${BASE_URL}/fees/?from_wilaya_id=${fromId}&to_wilaya_id=${toId}`
      } else {
        url = `${BASE_URL}/delivery-fees/?to_wilaya_name=${encodeURIComponent(wilayaName)}`
      }
    } else {
      url = `${BASE_URL}/delivery-fees/?to_wilaya_name=${encodeURIComponent(wilayaName)}`
    }

    const res = await deliveryFetch(url, {
      headers: buildHeaders(apiId, apiToken),
    })
    if (!res.ok) return null
    const data = await res.json()
    const row = findWilayaRow(data, wilayaName)
    return extractRates(row)
  } catch {
    return null
  }
}
