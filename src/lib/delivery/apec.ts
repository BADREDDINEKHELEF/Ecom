import { ShipmentInput, ShipmentResult } from './types'
import { splitName, isValidWilaya } from './utils'
import { postShipment, extractTrackingInfo, fetchJsonOrNull, fetchRateOrNull } from './helpers'

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
  const body = {
    firstname,
    familyname,
    contact_phone:   input.phone,
    address:         input.address,
    to_wilaya_name:  input.wilaya,
    to_commune_name: input.city,
    product_list:    input.items || 'Colis',
    price:           input.total,
    stop_desk:       input.isStopDesk ? 1 : 0,
    do_insurance:    0,
    declared_value:  0,
    freeshipping:    0,
    height: 30,
    width:  30,
    length: 30,
    weight: 1,
  }

  const { data } = await postShipment(
    'APEC',
    `${BASE_URL}/parcels/`,
    buildHeaders(apiId, apiToken),
    body,
  )

  return extractTrackingInfo(data)
}

export async function apecCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!apecConfigured()) throw new Error('APEC API keys not configured')
  return apecCreateShipmentWithCreds(input, process.env.APEC_API_ID!, process.env.APEC_API_TOKEN!)
}

export async function apecListParcels(apiId: string, apiToken: string, pageSize = 100) {
  return fetchJsonOrNull(`${BASE_URL}/parcels/?page=1&page_size=${pageSize}`, {
    headers: buildHeaders(apiId, apiToken),
  })
}

export async function apecTrack(trackingNumber: string, apiId: string, apiToken: string) {
  return fetchJsonOrNull(`${BASE_URL}/parcels/${encodeURIComponent(trackingNumber)}`, {
    headers: buildHeaders(apiId, apiToken),
  })
}

export async function apecGetRateWithCreds(
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
