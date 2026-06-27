import { ShipmentInput, ShipmentResult } from './types'
import { extractRates, isValidWilaya, findWilayaRow } from './utils'
import { deliveryFetch } from './client'

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

  const res = await deliveryFetch(`${BASE_URL}/parcels`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Rex ${res.status}: ${text}`)
  }

  const data = await res.json()
  const tracking = String(
    data?.tracking_code ?? data?.tracking ?? data?.code ?? data?.id ?? ''
  )
  const labelUrl: string | undefined = data?.label ?? data?.label_url ?? undefined

  return { tracking, labelUrl }
}

export async function rexCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!rexConfigured()) throw new Error('Rex token not configured')
  return rexCreateShipmentWithToken(input, process.env.REX_TOKEN!)
}

export async function rexListParcels(token: string, pageSize = 100) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/parcels?page=1&per_page=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function rexGetRateWithToken(
  wilayaName: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null
  try {
    const res = await deliveryFetch(`${BASE_URL}/rates?wilaya=${encodeURIComponent(wilayaName)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    const row = findWilayaRow(data, wilayaName)
    return extractRates(row)
  } catch {
    return null
  }
}

export async function rexTrack(trackingCode: string, token: string) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/parcels/${encodeURIComponent(trackingCode)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}
