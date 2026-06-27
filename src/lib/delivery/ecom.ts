import { ShipmentInput, ShipmentResult } from './types'
import { extractRates, isValidWilaya, findWilayaRow } from './utils'
import { deliveryFetch } from './client'

const BASE_URL = 'https://ecom-dz.net/api/v1'

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
    res = await deliveryFetch(`${BASE_URL}/parcels`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept':        'application/json',
      },
      body: JSON.stringify(body),
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
    const res = await deliveryFetch(`${BASE_URL}/parcels?page=1&per_page=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
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
    const url = `${BASE_URL}/delivery-fees?wilaya=${encodeURIComponent(wilayaName)}`
    const res = await deliveryFetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn(`[ecomGetRateWithToken] failed for wilaya=${wilayaName}: status=${res.status} body=${body}`)
      return null
    }
    
    const data = await res.json()
    const row = findWilayaRow(data, wilayaName)
    const rate = extractRates(row)
    return rate
  } catch (err: any) {
    console.error(`[ecomGetRateWithToken] error for wilaya=${wilayaName}:`, err.message || err)
    return null
  }
}

export async function ecomTrack(trackingNumber: string, token: string) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/parcels/${encodeURIComponent(trackingNumber)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}
