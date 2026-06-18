import { ShipmentInput, ShipmentResult } from './types'

const BASE_URL = 'https://api.yalidine.app/v1'

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
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function yalidineGetRates(wilayaName: string) {
  if (!yalidineConfigured()) return null
  try {
    const res = await fetch(`${BASE_URL}/delivery-fees/?to_wilaya_name=${encodeURIComponent(wilayaName)}`, {
      headers: buildHeaders(process.env.YALIDINE_API_ID!, process.env.YALIDINE_API_TOKEN!),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
