import { ShipmentInput, ShipmentResult } from './types'
import { extractRates, findWilayaRow } from './utils'
import { deliveryFetch } from './client'

const BASE_URL = 'https://maystro-delivery.com/api/v1'

// Maystro API requires numeric wilaya codes, not name strings
const WILAYA_TO_ID: Record<string, number> = {
  'Adrar': 1, 'Chlef': 2, 'Laghouat': 3, 'Oum El Bouaghi': 4, 'Batna': 5,
  'Béjaïa': 6, 'Biskra': 7, 'Béchar': 8, 'Blida': 9, 'Bouira': 10,
  'Tamanrasset': 11, 'Tébessa': 12, 'Tlemcen': 13, 'Tiaret': 14, 'Tizi Ouzou': 15,
  'Alger': 16, 'Djelfa': 17, 'Jijel': 18, 'Sétif': 19, 'Saïda': 20,
  'Skikda': 21, 'Sidi Bel Abbès': 22, 'Annaba': 23, 'Guelma': 24, 'Constantine': 25,
  'Médéa': 26, 'Mostaganem': 27, 'Msila': 28, 'Mascara': 29, 'Ouargla': 30,
  'Oran': 31, 'El Bayadh': 32, 'Illizi': 33, 'Bordj Bou Arreridj': 34, 'Boumerdès': 35,
  'El Tarf': 36, 'Tindouf': 37, 'Tissemsilt': 38, 'El Oued': 39, 'Khenchela': 40,
  'Souk Ahras': 41, 'Tipaza': 42, 'Mila': 43, 'Aïn Defla': 44, 'Naâma': 45,
  'Aïn Témouchent': 46, 'Ghardaïa': 47, 'Relizane': 48, 'Timimoun': 49,
  'Bordj Badji Mokhtar': 50, 'Ouled Djellal': 51, 'Béni Abbès': 52,
  'In Salah': 53, 'In Guezzam': 54, 'Touggourt': 55, 'Djanet': 56,
  'El Meghaier': 57, 'El Meniaa': 58,
}

function wilayaToId(name: string): number | null {
  return WILAYA_TO_ID[name] ?? WILAYA_TO_ID[name.trim()] ?? null
}

export function maystroConfigured(): boolean {
  return !!process.env.MAYSTRO_TOKEN
}

export async function maystroCreateShipmentWithToken(
  input: ShipmentInput,
  token: string
): Promise<ShipmentResult> {
  const wilayaId = wilayaToId(input.wilaya)
  if (!wilayaId) throw new Error(`Maystro: unknown wilaya "${input.wilaya}"`)

  const body = {
    client_name:      input.fullName,
    client_phone:     input.phone,
    destination_text: input.address,
    wilaya:           wilayaId,
    commune:          input.city,
    product_price:    input.total,
    note:             input.isStopDesk && input.stopDeskCause ? `${input.items || 'Colis'} — ${input.stopDeskCause}` : (input.items || ''),
    product_name:     input.items || 'Colis',
    can_open_package: false,
    is_exchange:      false,
    is_stopdesk:      !!input.isStopDesk,
  }

  const res = await deliveryFetch(`${BASE_URL}/orders/`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Maystro ${res.status}: ${text}`)
  }

  const data = await res.json()
  const tracking = String(
    data?.tracking ?? data?.tracking_code ?? data?.order_id ?? data?.id ?? ''
  )
  const labelUrl: string | undefined = data?.label ?? data?.label_url ?? undefined

  return { tracking, labelUrl }
}

export async function maystroCreateShipment(input: ShipmentInput): Promise<ShipmentResult> {
  if (!maystroConfigured()) throw new Error('Maystro token not configured')
  return maystroCreateShipmentWithToken(input, process.env.MAYSTRO_TOKEN!)
}

export async function maystroListParcels(token: string, pageSize = 100) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/orders/?page=1&page_size=${pageSize}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function maystroGetRateWithToken(
  wilayaName: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  const wilayaId = wilayaToId(wilayaName)
  if (!wilayaId) return null
  try {
    const res = await deliveryFetch(`${BASE_URL}/shipping-prices/?wilaya=${wilayaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    const row = findWilayaRow(data, wilayaName)
    return extractRates(row)
  } catch {
    return null
  }
}

export async function maystroTrack(trackingCode: string, token: string) {
  try {
    const res = await deliveryFetch(`${BASE_URL}/orders/${encodeURIComponent(trackingCode)}/`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}
