import { ShipmentInput, ShipmentResult } from './types'
import { postShipment, fetchJsonOrNull, fetchRateOrNull } from './helpers'
import { wilayaNameToId, wilayaNameToIdOrThrow } from '@/lib/data/wilayaIds'

const BASE_URL = 'https://www.zrexpress.dz/api'

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
    IDWilaya: wilayaNameToIdOrThrow('ZR Express', input.wilaya),
    Commune: input.city,
    Total: input.total,
    Note: input.isStopDesk && input.stopDeskCause ? `${input.items || ''} — ${input.stopDeskCause}` : (input.items || ''),
    TProduit: 'N/A',
    id_Externe: input.orderId ?? '',
    Source: 0,
  }

  const { data } = await postShipment(
    'ZR Express',
    `${BASE_URL}/parcel`,
    { Authorization: `Token ${token}` },
    body,
  )
  const tracking = String(data.codsv ?? data.tracking ?? data.id ?? '')

  return { tracking }
}

export async function zrCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!zrConfigured()) throw new Error('ZR Express token not configured')
  return zrCreateShipmentWithToken(input, process.env.ZR_TOKEN!)
}

export async function zrListParcels(token: string, pageSize = 100) {
  return fetchJsonOrNull(`${BASE_URL}/parcel?page=1&page_size=${pageSize}`, {
    headers: { Authorization: `Token ${token}` },
  })
}

export async function zrGetRateWithToken(
  wilayaName: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  const id = wilayaNameToId(wilayaName)
  if (id === null) return null
  return fetchRateOrNull(
    `${BASE_URL}/tarif?IDWilaya=${id}`,
    { Authorization: `Token ${token}` },
    wilayaName,
  )
}

export async function zrTrack(trackingNumber: string, token: string) {
  return fetchJsonOrNull(`${BASE_URL}/parcel/${encodeURIComponent(trackingNumber)}`, {
    headers: { Authorization: `Token ${token}` },
  })
}
