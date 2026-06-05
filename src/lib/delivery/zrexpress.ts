import { ShipmentInput, ShipmentResult } from './types'

const BASE_URL = 'https://www.zrexpress.dz/api'

export function zrConfigured(): boolean {
  return !!process.env.ZR_TOKEN
}

export async function zrCreateShipmentWithToken(
  input: ShipmentInput,
  token: string
): Promise<ShipmentResult> {
  const body = {
    TypeLivraison: 0,
    TypeColis: 0,
    Confrimee: 1,
    Client: input.fullName,
    MobileA: input.phone,
    MobileB: '',
    Adresse: input.address,
    IDWilaya: input.wilaya,
    Commune: input.city,
    Total: input.total,
    Note: input.items || '',
    TProduit: 'N/A',
    id_Externe: input.orderId ?? '',
    Source: 0,
  }

  const res = await fetch(`${BASE_URL}/parcel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ZR Express ${res.status}: ${text}`)
  }

  const data = await res.json()
  const tracking = String(data?.codsv ?? data?.tracking ?? data?.id ?? '')

  return { tracking }
}

export async function zrCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!zrConfigured()) throw new Error('ZR Express token not configured')
  return zrCreateShipmentWithToken(input, process.env.ZR_TOKEN!)
}
