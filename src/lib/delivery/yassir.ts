import { ShipmentInput, ShipmentResult } from './types'

// Yassir Express Business API — package delivery
const BASE_URL = 'https://api.yassir.com/v1'

export function yassirConfigured(): boolean {
  return !!process.env.YASSIR_API_KEY
}

export async function yassirCreateShipmentWithKey(
  input: ShipmentInput,
  apiKey: string
): Promise<ShipmentResult> {
  const body = {
    sender: {
      name:    'ShopDZ',
      phone:   '',
      address: 'Alger',
    },
    recipient: {
      name:    input.fullName,
      phone:   input.phone,
      address: `${input.address}, ${input.city}, ${input.wilaya}`,
    },
    package: {
      description: input.items || 'Colis',
      value:       input.total,
      weight:      1,
    },
    notes: '',
  }

  const res = await fetch(`${BASE_URL}/deliveries`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'x-api-key':     apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Yassir ${res.status}: ${text}`)
  }

  const data = await res.json()
  const tracking = String(
    data?.tracking_number ?? data?.tracking_code ?? data?.delivery_id ?? data?.id ?? ''
  )
  const labelUrl: string | undefined = data?.label ?? data?.label_url ?? undefined

  return { tracking, labelUrl }
}

export async function yassirCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!yassirConfigured()) throw new Error('Yassir API key not configured')
  return yassirCreateShipmentWithKey(input, process.env.YASSIR_API_KEY!)
}

export async function yassirListParcels(apiKey: string, pageSize = 100) {
  try {
    const res = await fetch(`${BASE_URL}/deliveries?page=1&limit=${pageSize}`, {
      headers: { 'x-api-key': apiKey },
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function yassirTrack(trackingNumber: string, apiKey: string) {
  try {
    const res = await fetch(`${BASE_URL}/deliveries/${encodeURIComponent(trackingNumber)}`, {
      headers: { 'x-api-key': apiKey },
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}
