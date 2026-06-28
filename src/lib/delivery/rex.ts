import { ShipmentInput, ShipmentResult } from './types'
import { isValidWilaya } from './utils'
import { postShipment, extractTrackingInfo, fetchJsonOrNull, fetchRateOrNull } from './helpers'

const BASE_URL = 'https://rexlivraison.com/api/v1'

export function rexConfigured(): boolean {
  return !!process.env.REX_TOKEN
}

export async function rexCreateShipmentWithToken(
  input: ShipmentInput,
  token: string
): Promise<ShipmentResult> {
  const body = {
    recipient_name:    input.fullName,
    recipient_phone:   input.phone,
    recipient_address: input.address,
    wilaya:            input.wilaya,
    commune:           input.city,
    product_name:      input.items || 'Colis',
    cod_amount:        input.total,
    note:              input.isStopDesk && input.stopDeskCause ? input.stopDeskCause : '',
    can_open:          0,
  }

  const { data } = await postShipment(
    'Rex',
    `${BASE_URL}/parcels`,
    { 'Authorization': `Bearer ${token}` },
    body,
  )

  return extractTrackingInfo(data)
}

export async function rexCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!rexConfigured()) throw new Error('Rex token not configured')
  return rexCreateShipmentWithToken(input, process.env.REX_TOKEN!)
}

export async function rexListParcels(token: string, pageSize = 100) {
  return fetchJsonOrNull(`${BASE_URL}/parcels?page=1&per_page=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function rexGetRateWithToken(
  wilayaName: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null
  return fetchRateOrNull(
    `${BASE_URL}/rates?wilaya=${encodeURIComponent(wilayaName)}`,
    { Authorization: `Bearer ${token}` },
    wilayaName,
  )
}

export async function rexTrack(trackingCode: string, token: string) {
  return fetchJsonOrNull(`${BASE_URL}/parcels/${encodeURIComponent(trackingCode)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
}
