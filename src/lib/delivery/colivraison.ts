import { ShipmentInput, ShipmentResult } from './types'
import { extractRates, isValidWilaya, findWilayaRow } from './utils'
import { deliveryFetch } from './client'

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

  const res = await deliveryFetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Colivraison ${res.status}: ${text}`)
  }

  const data = await res.json()
  const tracking = String(
    data?.tracking_code ?? data?.code_suivi ?? data?.id ?? data?.order_id ?? ''
  )
  const labelUrl: string | undefined =
    data?.label ?? data?.label_url ?? data?.bon_url ?? undefined

  return { tracking, labelUrl }
}

export async function colivraisonCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!colivraisonConfigured()) throw new Error('Colivraison token not configured')
  return colivraisonCreateShipmentWithToken(input, process.env.COLIVRAISON_TOKEN!)
}

export async function colivraisonListParcels(token: string, pageSize = 100) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/orders?page=1&per_page=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function colivraisonGetRateWithToken(
  wilayaName: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  try {
    if (!isValidWilaya(wilayaName)) return null
    const res = await deliveryFetch(`${BASE_URL}/pricing?wilaya=${encodeURIComponent(wilayaName)}`, {
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

export async function colivraisonTrack(trackingCode: string, token: string) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/orders/${encodeURIComponent(trackingCode)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}
