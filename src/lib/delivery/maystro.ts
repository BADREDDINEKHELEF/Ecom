import { ShipmentInput, ShipmentResult } from './types'
import { postShipment, extractTrackingInfo, fetchJsonOrNull, fetchRateOrNull } from './helpers'
import { wilayaNameToId, wilayaNameToIdOrThrow } from '@/lib/data/wilayaIds'

const BASE_URL = 'https://maystro-delivery.com/api/v1'

export function maystroConfigured(): boolean {
  return !!process.env.MAYSTRO_TOKEN
}

export async function maystroCreateShipmentWithToken(
  input: ShipmentInput,
  token: string
): Promise<ShipmentResult> {
  const wilayaId = wilayaNameToIdOrThrow('Maystro', input.wilaya)

  const body = {
    client_name:      input.fullName,
    client_phone:     input.phone,
    destination_text: input.address,
    wilaya:           wilayaId,
    commune:          input.city,
    product_price:    input.total,
    note:             input.isStopDesk && input.stopDeskCause ? `${input.items || 'Colis'} — ${input.stopDeskCause}` : (input.items || ''),
    product_name:     input.items || 'Colis',
    can_open_package: false,
    is_exchange:      false,
    is_stopdesk:      !!input.isStopDesk,
  }

  const { data } = await postShipment(
    'Maystro',
    `${BASE_URL}/orders/`,
    { 'Authorization': `Bearer ${token}` },
    body,
  )

  return extractTrackingInfo(data)
}

export async function maystroCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!maystroConfigured()) throw new Error('Maystro token not configured')
  return maystroCreateShipmentWithToken(input, process.env.MAYSTRO_TOKEN!)
}

export async function maystroListParcels(token: string, pageSize = 100) {
  return fetchJsonOrNull(`${BASE_URL}/orders/?page=1&page_size=${pageSize}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function maystroGetRateWithToken(
  wilayaName: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  const wilayaId = wilayaNameToId(wilayaName)
  if (!wilayaId) return null
  return fetchRateOrNull(
    `${BASE_URL}/shipping-prices/?wilaya=${wilayaId}`,
    { Authorization: `Bearer ${token}` },
    wilayaName,
  )
}

export async function maystroTrack(trackingCode: string, token: string) {
  return fetchJsonOrNull(`${BASE_URL}/orders/${encodeURIComponent(trackingCode)}/`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
}
