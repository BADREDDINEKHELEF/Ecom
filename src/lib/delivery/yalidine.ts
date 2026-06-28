import { ShipmentInput, ShipmentResult } from './types'
import { splitName, extractRates, isValidWilaya, findWilayaRow } from './utils'
import { deliveryFetch } from './client'
import { logger } from '@/lib/logger'

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
  const body = {
    firstname,
    familyname,
    contact_phone: input.phone,
    address: input.address,
    to_wilaya_name: input.wilaya,
    to_commune_name: input.city,
    product_list: input.items || 'Colis',
    price: input.total,
    stop_desk: input.isStopDesk ? 1 : 0,
    do_insurance: 0,
    declared_value: 0,
    freeshipping: 0,
    height: 30,
    width: 30,
    length: 30,
    weight: 1,
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
  return {
    tracking: String(data.tracking ?? data.tracking_code ?? data.tracking_number ?? data.parcel_id ?? data.id ?? ''),
    labelUrl: data.label ?? data.label_url ?? undefined,
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
    if (!res.ok) {
      logger.warn('[yalidineTrack] non-ok response', { status: res.status, trackingNumber })
      return null
    }
    return res.json()
  } catch (err) {
    logger.error('[yalidineTrack] failed', { error: err instanceof Error ? err.message : String(err), trackingNumber })
    return null
  }
}

export async function yalidineListParcels(apiId: string, apiToken: string, pageSize = 100) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/parcels/?page=1&page_size=${pageSize}`, {
      headers: buildHeaders(apiId, apiToken),
    })
    if (!res.ok) {
      logger.warn('[yalidineListParcels] non-ok response', { status: res.status })
      return null
    }
    return res.json()
  } catch (err) {
    logger.error('[yalidineListParcels] failed', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function yalidineGetRates(wilayaName: string) {
  if (!isValidWilaya(wilayaName)) return null
  if (!yalidineConfigured()) return null
  try {
    const res = await deliveryFetch(`${BASE_URL}/delivery-fees/?to_wilaya_name=${encodeURIComponent(wilayaName)}`, {
      headers: buildHeaders(process.env.YALIDINE_API_ID!, process.env.YALIDINE_API_TOKEN!),
    })
    if (!res.ok) {
      logger.warn('[yalidineGetRates] non-ok response', { status: res.status, wilayaName })
      return null
    }
    return await res.json()
  } catch (err) {
    logger.error('[yalidineGetRates] failed', { error: err instanceof Error ? err.message : String(err), wilayaName })
    return null
  }
}

export async function yalidineGetRateWithCreds(
  wilayaName: string,
  apiId: string,
  apiToken: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null
  try {
    const res = await deliveryFetch(`${BASE_URL}/delivery-fees/?to_wilaya_name=${encodeURIComponent(wilayaName)}`, {
      headers: buildHeaders(apiId, apiToken),
    })
    if (!res.ok) {
      logger.warn('[yalidineGetRateWithCreds] non-ok response', { status: res.status, wilayaName })
      return null
    }
    const data = await res.json()
    const row = findWilayaRow(data, wilayaName)
    return extractRates(row)
  } catch (err) {
    logger.error('[yalidineGetRateWithCreds] failed', { error: err instanceof Error ? err.message : String(err), wilayaName })
    return null
  }
}
