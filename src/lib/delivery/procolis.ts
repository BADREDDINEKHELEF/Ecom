import { ShipmentInput, ShipmentResult } from './types'
import { isValidWilaya } from './utils'
import { postShipment, fetchJsonOrNull, fetchRateOrNull } from './helpers'

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
        TypeColis: input.isStopDesk ? 1 : 0,
        Confrimee: 0,
        client: input.fullName,
        telephone: input.phone,
        adresse: input.address,
        ville: input.city,
        Wilaya: input.wilaya,
        produit: input.items || 'Colis',
        prix: input.total,
        remarque: input.isStopDesk && input.stopDeskCause ? input.stopDeskCause : '',
      },
    ],
  }

  const { data } = await postShipment(
    'Procolis',
    `${BASE_URL}/ajouter`,
    { 'Authorization': `Bearer ${token}` },
    body,
  )

  // Procolis response wraps created parcels in data.Colis[]
  const parcel = (Array.isArray(data?.Colis) ? (data.Colis as Record<string, unknown>[])[0] : null) ?? data
  const tracking = String(parcel.code_suivi ?? parcel.tracking ?? parcel.id ?? '')
  const labelUrl = String(parcel.label ?? parcel.label_url ?? parcel.bon_livraison ?? parcel.bon_url ?? '') || undefined

  return { tracking, labelUrl }
}

export async function procolisCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!procolisConfigured()) throw new Error('Procolis token not configured')
  return procolisCreateShipmentWithToken(input, process.env.PROCOLIS_TOKEN!)
}

export async function procolisListParcels(token: string, pageSize = 100) {
  return fetchJsonOrNull(`${BASE_URL}/colis?page=1&per_page=${pageSize}`, {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
  })
}

export async function procolisGetRateWithToken(
  wilayaName: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null
  return fetchRateOrNull(
    `${BASE_URL}/tarif?Wilaya=${encodeURIComponent(wilayaName)}`,
    { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    wilayaName,
  )
}

export async function procolisTrack(trackingNumber: string, token: string) {
  // Note: Procolis API uses '/traking' (their spelling) not '/tracking'
  return fetchJsonOrNull(
    `${BASE_URL}/traking?code_suivi=${encodeURIComponent(trackingNumber)}`,
    { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } },
  )
}
