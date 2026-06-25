import { ShipmentInput, ShipmentResult } from './types'
import { WILAYA_DATA } from '@/lib/data/wilayas'

const BASE_URL = 'https://api.colivraison.com/api'
const TIMEOUT  = 15_000

function isValidWilaya(wilayaName: string): boolean {
  return wilayaName in WILAYA_DATA
}

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
    note:       '',
    is_stopdesk: input.isStopDesk ? 1 : 0,
    can_open:   0,
  }

  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT),
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
    const res = await fetch(`${BASE_URL}/orders?page=1&per_page=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT),
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
    const res = await fetch(`${BASE_URL}/pricing?wilaya=${encodeURIComponent(wilayaName)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) return null
    const data = await res.json()
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return null
    const home = Number(row.home_fee ?? row.tarif_domicile ?? row.domicile ?? row.prix ?? row.price)
    const desk = Number(row.desk_fee ?? row.tarif_bureau ?? row.bureau)
    if (home === undefined || home === null || isNaN(home)) return null
    return { homeDelivery: home, ...(desk > 0 && !isNaN(desk) ? { deskDelivery: desk } : {}) }
  } catch {
    return null
  }
}

export async function colivraisonTrack(trackingCode: string, token: string) {
  try {
    const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(trackingCode)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}
