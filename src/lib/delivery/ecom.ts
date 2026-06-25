import { ShipmentInput, ShipmentResult } from './types'
import { WILAYA_DATA } from '@/lib/data/wilayas'

const BASE_URL = 'https://ecom-dz.net/api/v1'
const TIMEOUT  = 15_000

function isValidWilaya(wilayaName: string): boolean {
  return wilayaName in WILAYA_DATA
}

export function ecomConfigured(): boolean {
  return !!process.env.ECOM_TOKEN
}

export async function ecomCreateShipmentWithToken(
  input: ShipmentInput,
  token: string
): Promise<ShipmentResult> {
  const body = {
    name:         input.fullName,
    phone:        input.phone,
    address:      input.address,
    wilaya:       input.wilaya,
    commune:      input.city,
    price:        input.total,
    product:      input.items || 'Colis',
    note:         '',
    is_stopdesk:  input.isStopDesk ? 1 : 0,
    can_open:     false,
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}/parcels`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept':        'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT),
    })
  } catch (networkErr) {
    throw new Error(`Ecom Delivery network error: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`)
  }

  if (!res.ok) {
    let detail = ''
    try {
      const json = await res.json()
      detail = json?.message ?? json?.error ?? JSON.stringify(json)
    } catch {
      detail = await res.text().catch(() => '')
    }
    throw new Error(`Ecom Delivery ${res.status}: ${detail || res.statusText}`)
  }

  const data = await res.json()
  const tracking = String(
    data?.tracking ?? data?.tracking_code ?? data?.tracking_number ??
    data?.code_suivi ?? data?.parcel_id ?? data?.id ?? ''
  )
  const labelUrl: string | undefined = data?.label ?? data?.label_url ?? undefined

  return { tracking, labelUrl }
}

export async function ecomCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!ecomConfigured()) throw new Error('Ecom Delivery token not configured')
  return ecomCreateShipmentWithToken(input, process.env.ECOM_TOKEN!)
}

export async function ecomListParcels(token: string, pageSize = 100) {
  try {
    const res = await fetch(`${BASE_URL}/parcels?page=1&per_page=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function ecomGetRateWithToken(
  wilayaName: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null
  try {
    const res = await fetch(`${BASE_URL}/delivery-fees?wilaya=${encodeURIComponent(wilayaName)}`, {
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

export async function ecomTrack(trackingNumber: string, token: string) {
  try {
    const res = await fetch(`${BASE_URL}/parcels/${encodeURIComponent(trackingNumber)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}
