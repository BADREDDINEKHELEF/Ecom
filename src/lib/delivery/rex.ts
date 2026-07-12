import { ShipmentInput, ShipmentResult } from './types'
import { extractRates, isValidWilaya, findWilayaRow, toLocalAlgerianPhone, wilayaNameToId } from './utils'
import { deliveryFetch } from './client'
import { logger } from '@/lib/logger'

/**
 * Rex Livraison is powered by the EcoTrack platform.
 * Docs: CourierDZ EcotrackProviderIntegration + DZBuild EcoTrack docs.
 */
const BASE_URL = 'https://rex.ecotrack.dz'

function authHeaders(token: string): Record<string, string> {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

export function rexConfigured(): boolean {
  return !!process.env.REX_TOKEN
}

export async function rexCreateShipmentWithToken(
  input: ShipmentInput,
  token: string
): Promise<ShipmentResult> {
  const wilayaId = wilayaNameToId(input.wilaya)
  if (wilayaId == null) throw new Error(`Rex: unknown wilaya "${input.wilaya}"`)

  /**
   * EcoTrack create order payload.
   * Endpoint: POST /api/v1/create/order
   * type: 1=Livraison, 2=Echange, 3=PICKUP, 4=Recouvrement
   */
  const body: Record<string, unknown> = {
    reference: input.orderId ?? '',
    nom_client: input.fullName,
    telephone: toLocalAlgerianPhone(input.phone),
    telephone_2: input.phoneSecondary ? toLocalAlgerianPhone(input.phoneSecondary) : '',
    adresse: input.address,
    code_postal: '',
    commune: input.city,
    code_wilaya: wilayaId,
    montant: input.total,
    remarque: input.isStopDesk && input.stopDeskCause ? input.stopDeskCause : (input.items || ''),
    produit: input.items || 'Colis',
    stock: 0,
    type: input.isExchange ? 2 : 1,
    stop_desk: input.isStopDesk ? 1 : 0,
    boutique: 'ShopDZ',
  }

  if (input.isExchange && input.productToCollect) {
    body.produit_a_recupere = input.productToCollect
  }

  const res = await deliveryFetch(`${BASE_URL}/api/v1/create/order`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Rex ${res.status}: ${text}`)
  }

  const data = await res.json()
  if (data?.success === false) {
    throw new Error(`Rex create failed: ${data?.message ?? 'unknown error'}`)
  }
  const tracking = String(
    data?.tracking ?? data?.tracking_code ?? data?.tracking_number ??
    data?.reference ?? data?.id ?? ''
  )
  const labelUrl: string | undefined = data?.label ?? data?.label_url ??
    (tracking ? `${BASE_URL}/api/v1/get/order/label?tracking=${encodeURIComponent(tracking)}` : undefined)

  return { tracking, labelUrl }
}

export async function rexCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!rexConfigured()) throw new Error('Rex token not configured')
  return rexCreateShipmentWithToken(input, process.env.REX_TOKEN!)
}

export async function rexListParcels(token: string, pageSize = 100) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/api/v1/get/orders?page=1&per_page=${pageSize}`, {
      headers: authHeaders(token),
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[rexListParcels]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function rexGetRateWithToken(
  wilayaName: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  if (!isValidWilaya(wilayaName)) return null
  try {
    const res = await deliveryFetch(`${BASE_URL}/api/v1/get/fees`, {
      headers: authHeaders(token),
    })
    if (!res.ok) return null
    const data = await res.json()
    const wilayaId = wilayaNameToId(wilayaName)
    let row: Record<string, unknown> | null = null
    if (data && typeof data === 'object' && Array.isArray(data.livraison)) {
      row = data.livraison.find((r: unknown) => {
        const rec = r as Record<string, unknown>
        return rec.wilaya_id == wilayaId || rec.wilaya_name === wilayaName
      }) ?? null
    }
    if (!row) row = findWilayaRow(data, wilayaName)
    return extractRates(row)
  } catch (err: unknown) {
    logger.error('[rexGetRateWithToken]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function rexTrack(trackingCode: string, token: string) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/api/v1/get/order/${encodeURIComponent(trackingCode)}`, {
      headers: authHeaders(token),
    })
    if (!res.ok) return null
    return res.json()
  } catch (err: unknown) {
    logger.error('[rexTrack]', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}
