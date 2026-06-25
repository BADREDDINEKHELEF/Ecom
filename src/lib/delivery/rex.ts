import { ShipmentInput, ShipmentResult } from './types'
import { WILAYA_DATA } from '@/lib/data/wilayas'

const BASE_URL = 'https://rexlivraison.com/api/v1'
const TIMEOUT  = 15_000

function isValidWilaya(wilayaName: string): boolean {
  return wilayaName in WILAYA_DATA
}

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
    note:              '',
    can_open:          0,
  }

  const res = await fetch(`${BASE_URL}/parcels`, {
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
    const res = await fetch(`${BASE_URL}/parcels?page=1&per_page=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT),
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
    const res = await fetch(`${BASE_URL}/rates?wilaya=${encodeURIComponent(wilayaName)}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) return null
    const data = await res.json()
    const row = Array.isArray(data) ? data[0] : (Array.isArray(data?.data) ? data.data[0] : (data?.data ?? data))
    if (!row) return null
    const home = Number(
      row.home_fee ??
      row.tarif_a_domicile ??
      row.domicile_fee ??
      row.tarif_domicile ??
      row.TarifDomicile ??
      row.Tarif ??
      row.domicile ??
      row.fee ??
      row.tarif ??
      row.prix ??
      row.price ??
      row.home_delivery_fee
    )
    const desk = Number(
      row.desk_fee ??
      row.tarif_stopdesk ??
      row.stop_desk_fee ??
      row.tarif_bureau ??
      row.TarifBureau ??
      row.bureau_fee ??
      row.bureau ??
      row.desk_delivery_fee
    )
    if (home === undefined || home === null || isNaN(home)) return null
    return {
      homeDelivery: home,
      ...(desk !== null && desk !== undefined && !isNaN(desk) && desk >= 0 ? { deskDelivery: desk } : {})
    }
  } catch {
    return null
  }
}

export async function rexTrack(trackingCode: string, token: string) {
  try {
    const res = await fetch(`${BASE_URL}/parcels/${encodeURIComponent(trackingCode)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}
