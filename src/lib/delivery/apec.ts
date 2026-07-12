import { ShipmentInput, ShipmentResult } from './types'
import { splitName, extractRates, isValidWilaya, findWilayaRow, toLocalAlgerianPhone, wilayaNameToId } from './utils'
import { deliveryFetch } from './client'

const BASE_URL = 'https://api.apec.dz/v1'

export function apecConfigured(): boolean {
  return !!(process.env.APEC_API_ID && process.env.APEC_API_TOKEN)
}

function buildHeaders(apiId: string, apiToken: string) {
  return {
    'Content-Type':  'application/json',
    'X-API-ID':      apiId,
    'X-API-TOKEN':   apiToken,
  }
}

export async function apecCreateShipmentWithCreds(
  input: ShipmentInput,
  apiId: string,
  apiToken: string
): Promise<ShipmentResult> {
  const { firstname, familyname } = splitName(input.fullName)

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
    throw new Error(`APEC ${res.status}: ${text}`)
  }

  const data = await res.json()
  const parcel = data?.[input.orderId] ?? data
  const tracking = String(
    parcel?.tracking ?? parcel?.tracking_code ?? parcel?.tracking_number ??
    parcel?.parcel_id ?? parcel?.id ?? ''
  )
  const labelUrl: string | undefined = parcel?.label ?? parcel?.label_url ?? undefined

  return { tracking, labelUrl }
}

export async function apecCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!apecConfigured()) throw new Error('APEC API keys not configured')
  return apecCreateShipmentWithCreds(input, process.env.APEC_API_ID!, process.env.APEC_API_TOKEN!)
}

export async function apecListParcels(apiId: string, apiToken: string, pageSize = 100) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/parcels/?page=1&page_size=${pageSize}`, {
      headers: buildHeaders(apiId, apiToken),
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function apecTrack(trackingNumber: string, apiId: string, apiToken: string) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/parcels/${encodeURIComponent(trackingNumber)}`, {
      headers: buildHeaders(apiId, apiToken),
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function apecGetRateWithCreds(
  wilayaName: string,
  apiId: string,
  apiToken: string,
  fromWilayaName?: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null
  try {
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
