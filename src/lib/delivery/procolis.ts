import { ShipmentInput, ShipmentResult } from './types'
import { extractRates, isValidWilaya, findWilayaRow, toLocalAlgerianPhone, wilayaNameToId } from './utils'
import { deliveryFetch } from './client'
import { logger } from '@/lib/logger'

const BASE_URL = 'https://procolis.com/api_v1'

function authHeaders(token: string, key: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'token': token,
    'key': key,
  }
}

export function procolisConfigured(): boolean {
  return !!process.env.PROCOLIS_TOKEN && !!process.env.PROCOLIS_KEY
}

export async function procolisCreateShipmentWithToken(
  input: ShipmentInput,
  token: string,
  key: string
): Promise<ShipmentResult> {
  const wilayaId = wilayaNameToId(input.wilaya)
  if (wilayaId == null) throw new Error(`Procolis: unknown wilaya "${input.wilaya}"`)

  /**
   * Procolis v1 create payload per CourierDZ / DZBuild docs.
   * Endpoint: POST /api_v1/add_colis
   * Headers: token, key
   * Body: { Colis: [{ Tracking, TypeLivraison, TypeColis, Confrimee, Client, MobileA,
   *                  MobileB, Adresse, IDWilaya, Commune, Total, Note, TProduit,
   *                  id_Externe, Source }] }
   */
  const body = {
    Colis: [
      {
        Tracking: input.externalReference ?? '',
        TypeLivraison: input.isStopDesk ? 1 : 0,
        TypeColis: input.isExchange ? 1 : 0,
        Confrimee: 1,
        Client: input.fullName,
        MobileA: toLocalAlgerianPhone(input.phone),
        MobileB: input.phoneSecondary ? toLocalAlgerianPhone(input.phoneSecondary) : '',
        Adresse: input.address,
        IDWilaya: wilayaId,
        Commune: input.city,
        Total: input.total,
        Note: input.isStopDesk && input.stopDeskCause ? input.stopDeskCause : (input.items || ''),
        TProduit: input.items || 'Colis',
        id_Externe: input.orderId ?? '',
        Source: 'ShopDZ',
      },
    ],
  }

  const res = await deliveryFetch(`${BASE_URL}/add_colis`, {
    method: 'POST',
    headers: authHeaders(token, key),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Procolis ${res.status}: ${text}`)
  }

  const data = await res.json()
  const parcel = (Array.isArray(data?.Colis) ? data.Colis : [])[0] ?? data ?? {}
  const message = parcel.MessageRetour
  if (message && message !== 'Good') {
    throw new Error(`Procolis create failed: ${message}`)
  }
  const tracking = String(parcel.code_suivi ?? parcel.tracking ?? parcel.id ?? '')
  const labelUrl = String(parcel.label ?? parcel.label_url ?? parcel.bon_livraison ?? parcel.bon_url ?? '') || undefined

  return { tracking, labelUrl }
}

export async function procolisCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!procolisConfigured()) throw new Error('Procolis token+key not configured')
  return procolisCreateShipmentWithToken(input, process.env.PROCOLIS_TOKEN!, process.env.PROCOLIS_KEY!)
}

export async function procolisListParcels(token: string, key: string, pageSize = 100) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/colis?page=1&per_page=${pageSize}`, {
      headers: authHeaders(token, key),
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[procolisListParcels]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function procolisGetRateWithToken(
  wilayaName: string,
  token: string,
  key: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null
  try {
    const res = await deliveryFetch(`${BASE_URL}/tarification`, {
      method: 'POST',
      headers: authHeaders(token, key),
    })
    if (!res.ok) return null
    const data = await res.json()
    const wilayaId = wilayaNameToId(wilayaName)
    let row: Record<string, unknown> | null = null
    if (Array.isArray(data)) {
      row = data.find((r: unknown) => {
        const rec = r as Record<string, unknown>
        return rec.IDWilaya == wilayaId || rec.Wilaya === wilayaName
      }) ?? null
    }
    if (!row) row = findWilayaRow(data, wilayaName)
    return extractRates(row)
  } catch (err: unknown) {
    logger.error('[procolisGetRateWithToken]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function procolisTrack(trackingNumber: string, token: string, key: string) {
  try {
    const body = { Colis: [{ Tracking: trackingNumber }] }
    const res = await deliveryFetch(`${BASE_URL}/lire`, {
      method: 'POST',
      headers: authHeaders(token, key),
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[procolisTrack]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}
