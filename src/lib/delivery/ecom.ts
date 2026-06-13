import { ShipmentInput, ShipmentResult } from './types'

const BASE_URL = 'https://ecomdelivery.dz/api/v1'

export function ecomConfigured(): boolean {
  return !!process.env.ECOM_TOKEN
}

export async function ecomCreateShipmentWithToken(
  input: ShipmentInput,
  token: string
): Promise<ShipmentResult> {
  const body = {
    client_name:    input.fullName,
    client_phone:   input.phone,
    adresse:        input.address,
    wilaya:         input.wilaya,
    commune:        input.city,
    montant:        input.total,
    produit:        input.items || 'Colis',
    remarque:       '',
    can_open:       false,
  }

  const res = await fetch(`${BASE_URL}/parcels`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ecom Delivery ${res.status}: ${text}`)
  }

  const data = await res.json()
  const tracking = String(
    data?.tracking ?? data?.code_suivi ?? data?.tracking_code ?? data?.id ?? ''
  )
  const labelUrl: string | undefined = data?.label ?? data?.label_url ?? undefined

  return { tracking, labelUrl }
}

export async function ecomCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!ecomConfigured()) throw new Error('Ecom Delivery token not configured')
  return ecomCreateShipmentWithToken(input, process.env.ECOM_TOKEN!)
}

export async function ecomTrack(trackingNumber: string, token: string) {
  const res = await fetch(`${BASE_URL}/parcels/${encodeURIComponent(trackingNumber)}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}
