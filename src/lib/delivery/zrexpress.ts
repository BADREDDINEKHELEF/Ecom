import { ShipmentInput, ShipmentResult } from './types'

const BASE_URL = 'https://www.zrexpress.dz/api'
const TIMEOUT  = 15_000

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

// Returns null when the wilaya name is not in the map — used for rates so we
// don't silently return Alger's price for an unknown/differently-spelled wilaya.
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
    signal: AbortSignal.timeout(TIMEOUT),
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
    const res = await fetch(`${BASE_URL}/parcel?page=1&page_size=${pageSize}`, {
      headers: { Authorization: `Token ${token}` },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

export async function zrGetRateWithToken(
  wilayaName: string,
  token: string
): Promise<{ homeDelivery: number; deskDelivery?: number } | null> {
  const id = wilayaToZrIdOrNull(wilayaName)
  if (id === null) return null  // unknown wilaya → caller falls back to static
  try {
    const res = await fetch(`${BASE_URL}/tarif?IDWilaya=${id}`, {
      headers: { Authorization: `Token ${token}` },
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

export async function zrTrack(trackingNumber: string, token: string) {
  try {
    const res = await fetch(`${BASE_URL}/parcel/${encodeURIComponent(trackingNumber)}`, {
      headers: { Authorization: `Token ${token}` },
      signal: AbortSignal.timeout(TIMEOUT),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
