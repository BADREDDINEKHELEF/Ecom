import { ShipmentInput, ShipmentResult } from './types'
import { splitName, isValidWilaya } from './utils'
import { postShipment, fetchJsonOrNull, fetchRateOrNull } from './helpers'

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
  
  const { data } = await postShipment(
    'Yalidine',
    `${BASE_URL}/parcels/`,
    buildHeaders(apiId, apiToken),
    body,
  )

  return {
    tracking: String(data.tracking ?? data.tracking_code ?? data.tracking_number ?? data.parcel_id ?? data.id ?? ''),
    labelUrl: (data.label ?? data.label_url ?? undefined) as string | undefined,
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
  return fetchJsonOrNull(`${BASE_URL}/parcels/${encodeURIComponent(trackingNumber)}/`, {
    headers: buildHeaders(apiId, apiToken),
  })
}

export async function yalidineListParcels(apiId: string, apiToken: string, pageSize = 100) {
  return fetchJsonOrNull(`${BASE_URL}/parcels/?page=1&page_size=${pageSize}`, {
    headers: buildHeaders(apiId, apiToken),
  })
}

export async function yalidineGetRates(wilayaName: string) {
  if (!isValidWilaya(wilayaName)) return null
  if (!yalidineConfigured()) return null
  return fetchJsonOrNull(`${BASE_URL}/delivery-fees/?to_wilaya_name=${encodeURIComponent(wilayaName)}`, {
    headers: buildHeaders(process.env.YALIDINE_API_ID!, process.env.YALIDINE_API_TOKEN!),
  })
}

export async function yalidineGetRateWithCreds(
  wilayaName: string,
  apiId: string,
  apiToken: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null
  return fetchRateOrNull(
    `${BASE_URL}/delivery-fees/?to_wilaya_name=${encodeURIComponent(wilayaName)}`,
    buildHeaders(apiId, apiToken),
    wilayaName,
  )
}
