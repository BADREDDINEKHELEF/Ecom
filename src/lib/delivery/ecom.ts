import { ShipmentInput, ShipmentResult } from './types'
import { isValidWilaya } from './utils'
import { extractTrackingInfo, fetchJsonOrNull, fetchRateOrNull } from './helpers'
import { deliveryFetch } from './client'

const BASE_URL = 'https://ecom-dz.net/Api_v1'

function authHeaders(key: string, token: string): Record<string, string> {
  return { 'Key': key, 'Token': token, 'Accept': 'application/json' }
}

export function ecomConfigured(): boolean {
  return !!process.env.ECOM_API_KEY && !!process.env.ECOM_API_TOKEN
}

export async function ecomCreateShipmentWithToken(
  input: ShipmentInput,
  key: string,
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
    note:         input.isStopDesk && input.stopDeskCause ? input.stopDeskCause : '',
    is_stopdesk:  input.isStopDesk ? 1 : 0,
    can_open:     false,
  }

  let res: Response
  try {
    res = await deliveryFetch(`${BASE_URL}/parcels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(key, token),
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
  return extractTrackingInfo(data)
}

export async function ecomCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!ecomConfigured()) throw new Error('Ecom Delivery API key/token not configured')
  return ecomCreateShipmentWithToken(input, process.env.ECOM_API_KEY!, process.env.ECOM_API_TOKEN!)
}

export async function ecomListParcels(key: string, token: string, pageSize = 100) {
  return fetchJsonOrNull(`${BASE_URL}/parcels?page=1&per_page=${pageSize}`, {
    headers: authHeaders(key, token),
  })
}

export async function ecomGetRateWithToken(
  wilayaName: string,
  key: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null
  return fetchRateOrNull(
    `${BASE_URL}/delivery-fees?wilaya=${encodeURIComponent(wilayaName)}`,
    authHeaders(key, token),
    wilayaName,
  )
}

export async function ecomTrack(trackingNumber: string, key: string, token: string) {
  return fetchJsonOrNull(`${BASE_URL}/parcels/${encodeURIComponent(trackingNumber)}`, {
    headers: authHeaders(key, token),
  })
}
