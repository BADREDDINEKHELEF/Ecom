import { ShipmentInput, ShipmentResult } from './types'
import { WILAYA_DATA } from '@/lib/data/wilayas'

const BASE_URL = 'https://procolis.com/api_v2'
const TIMEOUT  = 15_000

function isValidWilaya(wilayaName: string): boolean {
  return wilayaName in WILAYA_DATA
}

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
        remarque: '',
      },
    ],
  }

  const res = await fetch(`${BASE_URL}/ajouter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Procolis ${res.status}: ${text}`)
  }

  const data = await res.json()
  // Procolis response wraps created parcels in data.Colis[]
  const parcel = (Array.isArray(data?.Colis) ? data.Colis : [])[0] ?? data ?? {}
  const tracking = String(parcel.code_suivi ?? parcel.tracking ?? parcel.id ?? '')

  return { tracking }
}

export async function procolisCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!procolisConfigured()) throw new Error('Procolis token not configured')
  return procolisCreateShipmentWithToken(input, process.env.PROCOLIS_TOKEN!)
}

export async function procolisListParcels(token: string, pageSize = 100) {
  try {
    const res = await fetch(`${BASE_URL}/colis?page=1&per_page=${pageSize}`, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function procolisGetRateWithToken(
  wilayaName: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null
  try {
    const res = await fetch(`${BASE_URL}/tarif?Wilaya=${encodeURIComponent(wilayaName)}`, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

export async function procolisTrack(trackingNumber: string, token: string) {
  try {
    // Note: Procolis API uses '/traking' (their spelling) not '/tracking'
    const res = await fetch(
      `${BASE_URL}/traking?code_suivi=${encodeURIComponent(trackingNumber)}`,
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(TIMEOUT),
      }
    )
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}
