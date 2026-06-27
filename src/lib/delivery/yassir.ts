import { ShipmentInput, ShipmentResult } from './types'
import { deliveryFetch } from './client'

// Yassir Express Business API — package delivery
const BASE_URL = 'https://api.yassir.com/v1'

export function yassirConfigured(): boolean {
  return !!process.env.YASSIR_API_KEY
}

export async function yassirCreateShipmentWithKey(
  input: ShipmentInput,
  apiKey: string
): Promise<ShipmentResult> {
  const senderName = process.env.YASSIR_SENDER_NAME
  const senderPhone = process.env.YASSIR_SENDER_PHONE
  const senderAddress = process.env.YASSIR_SENDER_ADDRESS
  if (!senderName || !senderPhone || !senderAddress) {
    throw new Error('Yassir sender configuration not set (YASSIR_SENDER_NAME, YASSIR_SENDER_PHONE, YASSIR_SENDER_ADDRESS)')
  }
  const body = {
    sender: {
      name:    senderName,
      phone:   senderPhone,
      address: senderAddress,
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
    notes: input.isStopDesk ? 'Livraison en agence (stop desk) — prévenir le destinataire' : '',
  }

  const res = await deliveryFetch(`${BASE_URL}/deliveries`, {
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
    const res = await deliveryFetch(`${BASE_URL}/deliveries?page=1&limit=${pageSize}`, {
      headers: { 'x-api-key': apiKey },
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function yassirTrack(trackingNumber: string, apiKey: string) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/deliveries/${encodeURIComponent(trackingNumber)}`, {
      headers: { 'x-api-key': apiKey },
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}
