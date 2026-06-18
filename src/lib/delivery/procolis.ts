import { ShipmentInput, ShipmentResult } from './types'

const BASE_URL = 'https://procolis.com/api_v2'

export function procolisConfigured(): boolean {
  return !!process.env.PROCOLIS_TOKEN
}

export async function procolisCreateShipmentWithToken(
  input: ShipmentInput,
  token: string
): Promise<ShipmentResult> {
  const body = {
    Colis: [
      {
        TypeColis: 0,
        Confrimee: 0,
        client: input.fullName,
        telephone: input.phone,
        adresse: input.address,
        ville: input.city,
        Wilaya: input.wilaya,
        produit: input.items || 'Colis',
        prix: input.total,
        remarque: '',
      },
    ],
  }

  const res = await fetch(`${BASE_URL}/ajouter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Procolis ${res.status}: ${text}`)
  }

  const data = await res.json()
  const parcel = (data?.parcel_list ?? data?.Colis ?? [])[0] ?? {}
  const tracking = String(parcel.tracking ?? parcel.code_suivi ?? '')

  return { tracking }
}

export async function procolisCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!procolisConfigured()) throw new Error('Procolis token not configured')
  return procolisCreateShipmentWithToken(input, process.env.PROCOLIS_TOKEN!)
}

export async function procolisListParcels(token: string, pageSize = 100) {
  try {
    const res = await fetch(`${BASE_URL}/colis?page=1&per_page=${pageSize}`, {
      headers: { 'Content-Type': 'application/json', token },
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function procolisTrack(trackingNumber: string, token: string) {
  const res = await fetch(
    `${BASE_URL}/traking?token=${encodeURIComponent(token)}&code_suivi=${encodeURIComponent(trackingNumber)}`
  )
  if (!res.ok) return null
  return res.json()
}
