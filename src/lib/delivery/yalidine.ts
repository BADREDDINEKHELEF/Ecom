import { ShipmentInput, ShipmentResult } from './types'
import { WILAYA_DATA } from '@/lib/data/wilayas'

const BASE_URL = 'https://api.yalidine.app/v1'
const TIMEOUT  = 15_000

function isValidWilaya(wilayaName: string): boolean {
  return wilayaName in WILAYA_DATA
}

function buildHeaders(apiId: string, apiToken: string) {
  return {
    'Content-Type': 'application/json',
    'X-API-ID': apiId,
    'X-API-TOKEN': apiToken,
  }
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { firstname: parts[0], familyname: parts[0] }
  return { firstname: parts[0], familyname: parts.slice(1).join(' ') }
}

export function yalidineConfigured(): boolean {
  return !!(process.env.YALIDINE_API_ID && process.env.YALIDINE_API_TOKEN)
}

async function createShipmentWithHeaders(
  input: ShipmentInput,
  apiId: string,
  apiToken: string
): Promise<ShipmentResult> {
  const { firstname, familyname } = splitName(input.fullName)
  const body = {
    firstname,
    familyname,
    contact_phone: input.phone,
    address: input.address,
    to_wilaya_name: input.wilaya,
    to_commune_name: input.city,
    product_list: input.items || 'Colis',
    price: input.total,
    stop_desk: input.isStopDesk ? 1 : 0,
    do_insurance: 0,
    declared_value: 0,
    freeshipping: 0,
    height: 30,
    width: 30,
    length: 30,
    weight: 1,
  }
  const res = await fetch(`${BASE_URL}/parcels/`, {
    method: 'POST',
    headers: buildHeaders(apiId, apiToken),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Yalidine ${res.status}: ${text}`)
  }
  const data = await res.json()
  return {
    tracking: String(data.tracking ?? data.tracking_code ?? data.tracking_number ?? data.parcel_id ?? data.id ?? ''),
    labelUrl: data.label ?? data.label_url ?? undefined,
  }
}

export async function yalidineCreateShipmentWithCreds(
  input: ShipmentInput,
  apiId: string,
  apiToken: string
): Promise<ShipmentResult> {
  return createShipmentWithHeaders(input, apiId, apiToken)
}

export async function yalidineCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!yalidineConfigured()) throw new Error('Yalidine API keys not configured')
  return createShipmentWithHeaders(
    input,
    process.env.YALIDINE_API_ID!,
    process.env.YALIDINE_API_TOKEN!
  )
}

export async function yalidineTrack(trackingNumber: string, apiId: string, apiToken: string) {
  try {
    const res = await fetch(`${BASE_URL}/parcels/${encodeURIComponent(trackingNumber)}/`, {
      headers: buildHeaders(apiId, apiToken),
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function yalidineListParcels(apiId: string, apiToken: string, pageSize = 100) {
  try {
    const res = await fetch(`${BASE_URL}/parcels/?page=1&page_size=${pageSize}`, {
      headers: buildHeaders(apiId, apiToken),
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function yalidineGetRates(wilayaName: string) {
  if (!isValidWilaya(wilayaName)) return null
  if (!yalidineConfigured()) return null
  try {
    const res = await fetch(`${BASE_URL}/delivery-fees/?to_wilaya_name=${encodeURIComponent(wilayaName)}`, {
      headers: buildHeaders(process.env.YALIDINE_API_ID!, process.env.YALIDINE_API_TOKEN!),
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function yalidineGetRateWithCreds(
  wilayaName: string,
  apiId: string,
  apiToken: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null
  try {
    const res = await fetch(`${BASE_URL}/delivery-fees/?to_wilaya_name=${encodeURIComponent(wilayaName)}`, {
      headers: buildHeaders(apiId, apiToken),
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
