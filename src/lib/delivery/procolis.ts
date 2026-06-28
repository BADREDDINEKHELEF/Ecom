import { ShipmentInput, ShipmentResult } from './types'
import { extractRates, isValidWilaya, findWilayaRow } from './utils'
import { deliveryFetch } from './client'
import { logger } from '@/lib/logger'

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

  const res = await deliveryFetch(`${BASE_URL}/ajouter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Procolis ${res.status}: ${text}`)
  }

  const data = await res.json()
  // Procolis response wraps created parcels in data.Colis[]
  const parcel = (Array.isArray(data?.Colis) ? data.Colis : [])[0] ?? data ?? {}
  const tracking = String(parcel.code_suivi ?? parcel.tracking ?? parcel.id ?? '')
  const labelUrl = String(parcel.label ?? parcel.label_url ?? parcel.bon_livraison ?? parcel.bon_url ?? '') || undefined

  return { tracking, labelUrl }
}

export async function procolisCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!procolisConfigured()) throw new Error('Procolis token not configured')
  return procolisCreateShipmentWithToken(input, process.env.PROCOLIS_TOKEN!)
}

export async function procolisListParcels(token: string, pageSize = 100) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/colis?page=1&per_page=${pageSize}`, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) {
      logger.warn('[procolisListParcels] non-ok response', { status: res.status })
      return null
    }
    return res.json()
  } catch (err) {
    logger.error('[procolisListParcels] failed', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function procolisGetRateWithToken(
  wilayaName: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null
  try {
    const res = await deliveryFetch(`${BASE_URL}/tarif?Wilaya=${encodeURIComponent(wilayaName)}`, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) {
      logger.warn('[procolisGetRateWithToken] non-ok response', { status: res.status, wilayaName })
      return null
    }
    const data = await res.json()
    const row = findWilayaRow(data, wilayaName)
    return extractRates(row)
  } catch (err) {
    logger.error('[procolisGetRateWithToken] failed', { error: err instanceof Error ? err.message : String(err), wilayaName })
    return null
  }
}

export async function procolisTrack(trackingNumber: string, token: string) {
  try {
    // Note: Procolis API uses '/traking' (their spelling) not '/tracking'
    const res = await deliveryFetch(
      `${BASE_URL}/traking?code_suivi=${encodeURIComponent(trackingNumber)}`,
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      }
    )
    if (!res.ok) {
      logger.warn('[procolisTrack] non-ok response', { status: res.status, trackingNumber })
      return null
    }
    return res.json()
  } catch (err) {
    logger.error('[procolisTrack] failed', { error: err instanceof Error ? err.message : String(err), trackingNumber })
    return null
  }
}
