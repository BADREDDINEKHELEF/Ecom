import { ShipmentInput, ShipmentResult } from './types'
import { extractRates, findWilayaRow } from './utils'
import { deliveryFetch } from './client'
import { logger } from '@/lib/logger'

const BASE_URL = 'https://www.zrexpress.dz/api'

// ZR Express uses numeric wilaya IDs (1–58) matching the official DZ order
const WILAYA_NAME_TO_ZR_ID: Record<string, number> = {
  'Adrar': 1, 'Chlef': 2, 'Laghouat': 3, 'Oum El Bouaghi': 4, 'Batna': 5,
  'Béjaïa': 6, 'Biskra': 7, 'Béchar': 8, 'Blida': 9, 'Bouira': 10,
  'Tamanrasset': 11, 'Tébessa': 12, 'Tlemcen': 13, 'Tiaret': 14, 'Tizi Ouzou': 15,
  'Alger': 16, 'Djelfa': 17, 'Jijel': 18, 'Sétif': 19, 'Saïda': 20,
  'Skikda': 21, 'Sidi Bel Abbès': 22, 'Annaba': 23, 'Guelma': 24, 'Constantine': 25,
  'Médéa': 26, 'Mostaganem': 27, 'Msila': 28, 'Mascara': 29, 'Ouargla': 30,
  'Oran': 31, 'El Bayadh': 32, 'Illizi': 33, 'Bordj Bou Arreridj': 34, 'Boumerdès': 35,
  'El Tarf': 36, 'Tindouf': 37, 'Tissemsilt': 38, 'El Oued': 39, 'Khenchela': 40,
  'Souk Ahras': 41, 'Tipaza': 42, 'Mila': 43, 'Aïn Defla': 44, 'Naâma': 45,
  'Aïn Témouchent': 46, 'Ghardaïa': 47, 'Relizane': 48, 'Timimoun': 49, 'Bordj Badji Mokhtar': 50,
  'Ouled Djellal': 51, 'Béni Abbès': 52, 'In Salah': 53, 'In Guezzam': 54, 'Touggourt': 55,
  'Djanet': 56, 'El Meghaier': 57, 'El Meniaa': 58,
}

function wilayaToZrId(name: string): number {
  const id = WILAYA_NAME_TO_ZR_ID[name] ?? WILAYA_NAME_TO_ZR_ID[name.trim()]
  if (!id) throw new Error(`ZR Express: unknown wilaya "${name}"`)
  return id
}

function wilayaToZrIdOrNull(name: string): number | null {
  return WILAYA_NAME_TO_ZR_ID[name] ?? WILAYA_NAME_TO_ZR_ID[name.trim()] ?? null
}

export function zrConfigured(): boolean {
  return !!process.env.ZR_TOKEN
}

export async function zrCreateShipmentWithToken(
  input: ShipmentInput,
  token: string
): Promise<ShipmentResult> {
  const body = {
    TypeLivraison: input.isStopDesk ? 1 : 0,
    TypeColis: 0,
    Confrimee: 1,
    Client: input.fullName,
    MobileA: input.phone,
    MobileB: '',
    Adresse: input.address,
    IDWilaya: wilayaToZrId(input.wilaya),
    Commune: input.city,
    Total: input.total,
    Note: input.isStopDesk && input.stopDeskCause ? `${input.items || ''} — ${input.stopDeskCause}` : (input.items || ''),
    TProduit: 'N/A',
    id_Externe: input.orderId ?? '',
    Source: 0,
  }

  const res = await deliveryFetch(`${BASE_URL}/parcel`, {
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

export async function zrListParcels(token: string, pageSize = 100) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/parcel?page=1&page_size=${pageSize}`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!res.ok) {
      logger.warn('[zrListParcels] non-ok response', { status: res.status })
      return null
    }
    return res.json()
  } catch (err) {
    logger.error('[zrListParcels] failed', { error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

export async function zrGetRateWithToken(
  wilayaName: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  const id = wilayaToZrIdOrNull(wilayaName)
  if (id === null) return null
  try {
    const res = await deliveryFetch(`${BASE_URL}/tarif?IDWilaya=${id}`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!res.ok) {
      logger.warn('[zrGetRateWithToken] non-ok response', { status: res.status, wilayaName })
      return null
    }
    const data = await res.json()
    const row = findWilayaRow(data, wilayaName)
    return extractRates(row)
  } catch (err) {
    logger.error('[zrGetRateWithToken] failed', { error: err instanceof Error ? err.message : String(err), wilayaName })
    return null
  }
}

export async function zrTrack(trackingNumber: string, token: string) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/parcel/${encodeURIComponent(trackingNumber)}`, {
      headers: { Authorization: `Token ${token}` },
    })
    if (!res.ok) {
      logger.warn('[zrTrack] non-ok response', { status: res.status, trackingNumber })
      return null
    }
    return res.json()
  } catch (err) {
    logger.error('[zrTrack] failed', { error: err instanceof Error ? err.message : String(err), trackingNumber })
    return null
  }
}
