import { ShipmentInput, ShipmentResult } from './types'
import { isValidWilaya } from './utils'
import { postShipment, extractTrackingInfo, fetchJsonOrNull, fetchRateOrNull } from './helpers'

const BASE_URL = 'https://api.colivraison.com/api'

export function colivraisonConfigured(): boolean {
  return !!process.env.COLIVRAISON_TOKEN
}

export async function colivraisonCreateShipmentWithToken(
  input: ShipmentInput,
  token: string
): Promise<ShipmentResult> {
  const body = {
    name:       input.fullName,
    phone:      input.phone,
    address:    input.address,
    wilaya:     input.wilaya,
    commune:    input.city,
    product:    input.items || 'Colis',
    price:      input.total,
    note:       input.isStopDesk && input.stopDeskCause ? input.stopDeskCause : '',
    is_stopdesk: input.isStopDesk ? 1 : 0,
    can_open:   0,
  }

  const { data } = await postShipment(
    'Colivraison',
    `${BASE_URL}/orders`,
    { 'Authorization': `Bearer ${token}` },
    body,
  )

  return extractTrackingInfo(data)
}

export async function colivraisonCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!colivraisonConfigured()) throw new Error('Colivraison token not configured')
  return colivraisonCreateShipmentWithToken(input, process.env.COLIVRAISON_TOKEN!)
}

export async function colivraisonListParcels(token: string, pageSize = 100) {
  return fetchJsonOrNull(`${BASE_URL}/orders?page=1&per_page=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function colivraisonGetRateWithToken(
  wilayaName: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null
  return fetchRateOrNull(
    `${BASE_URL}/pricing?wilaya=${encodeURIComponent(wilayaName)}`,
    { Authorization: `Bearer ${token}` },
    wilayaName,
  )
}

export async function colivraisonTrack(trackingCode: string, token: string) {
  return fetchJsonOrNull(`${BASE_URL}/orders/${encodeURIComponent(trackingCode)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
}
