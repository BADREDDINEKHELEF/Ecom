import { ShipmentInput, ShipmentResult } from './types'

const BASE_URL = 'https://api.apec.dz/v1'

export function apecConfigured(): boolean {
  return !!(process.env.APEC_API_ID && process.env.APEC_API_TOKEN)
}

function buildHeaders(apiId: string, apiToken: string) {
  return {
    'Content-Type':  'application/json',
    'X-API-ID':      apiId,
    'X-API-TOKEN':   apiToken,
  }
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { firstname: parts[0], familyname: parts[0] }
  return { firstname: parts[0], familyname: parts.slice(1).join(' ') }
}

export async function apecCreateShipmentWithCreds(
  input: ShipmentInput,
  apiId: string,
  apiToken: string
): Promise<ShipmentResult> {
  const { firstname, familyname } = splitName(input.fullName)
  const body = {
    firstname,
    familyname,
    contact_phone:   input.phone,
    address:         input.address,
    to_wilaya_name:  input.wilaya,
    to_commune_name: input.city,
    product_list:    input.items || 'Colis',
    price:           input.total,
    do_insurance:    0,
    declared_value:  0,
    freeshipping:    0,
    height: 30,
    width:  30,
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
    throw new Error(`APEC ${res.status}: ${text}`)
  }

  const data = await res.json()
  const tracking = String(data?.tracking ?? data?.tracking_code ?? data?.tracking_number ?? data?.parcel_id ?? data?.id ?? '')
  const labelUrl: string | undefined = data?.label ?? data?.label_url ?? undefined

  return { tracking, labelUrl }
}

export async function apecCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!apecConfigured()) throw new Error('APEC API keys not configured')
  return apecCreateShipmentWithCreds(input, process.env.APEC_API_ID!, process.env.APEC_API_TOKEN!)
}

export async function apecTrack(trackingNumber: string, apiId: string, apiToken: string) {
  const res = await fetch(`${BASE_URL}/parcels/${encodeURIComponent(trackingNumber)}`, {
    headers: buildHeaders(apiId, apiToken),
  })
  if (!res.ok) return null
  return res.json()
}
