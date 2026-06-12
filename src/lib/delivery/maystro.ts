import { ShipmentInput, ShipmentResult } from './types'

const BASE_URL = 'https://maystro-delivery.com/api/v1'

export function maystroConfigured(): boolean {
  return !!process.env.MAYSTRO_TOKEN
}

export async function maystroCreateShipmentWithToken(
  input: ShipmentInput,
  token: string
): Promise<ShipmentResult> {
  const body = {
    client_name:      input.fullName,
    client_phone:     input.phone,
    destination_text: input.address,
    wilaya:           input.wilaya,
    commune:          input.city,
    product_price:    input.total,
    note:             input.items || '',
    product_name:     input.items || 'Colis',
    can_open_package: false,
    is_exchange:      false,
  }

  const res = await fetch(`${BASE_URL}/orders/`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Maystro ${res.status}: ${text}`)
  }

  const data = await res.json()
  const tracking = String(
    data?.tracking ?? data?.tracking_code ?? data?.order_id ?? data?.id ?? ''
  )
  const labelUrl: string | undefined = data?.label ?? data?.label_url ?? undefined

  return { tracking, labelUrl }
}

export async function maystroCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!maystroConfigured()) throw new Error('Maystro token not configured')
  return maystroCreateShipmentWithToken(input, process.env.MAYSTRO_TOKEN!)
}

export async function maystroTrack(trackingCode: string, token: string) {
  const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(trackingCode)}/`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}
