import { WILAYA_DATA } from '@/lib/data/wilayas'
import { normalizePhone } from '@/lib/validation/phone'

export function isValidWilaya(wilayaName: string): boolean {
  return wilayaName in WILAYA_DATA
}

export function splitName(fullName: string): { firstname: string; familyname: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { firstname: parts[0], familyname: parts[0] }
  return { firstname: parts[0], familyname: parts.slice(1).join(' ') }
}

export function extractRates(
  row: Record<string, unknown> | null | undefined
): { homeDelivery: number; deskDelivery?: number } | null {
  if (!row) return null

  const getVal = (keys: string[]): unknown => {
    for (const key of keys) {
      if (row[key] !== undefined) return row[key]
    }
    return undefined
  }

  const homeVal = getVal([
    'home_fee', 'tarif_a_domicile', 'domicile_fee', 'tarif_domicile',
    'TarifDomicile', 'Tarif', 'domicile', 'fee', 'tarif', 'prix', 'price',
    'home_delivery_fee'
  ])

  const deskVal = getVal([
    'desk_fee', 'tarif_stopdesk', 'stop_desk_fee', 'tarif_bureau',
    'TarifBureau', 'bureau_fee', 'bureau', 'desk_delivery_fee'
  ])

  const home = homeVal !== undefined && homeVal !== null && homeVal !== '' ? Number(homeVal) : NaN
  const desk = deskVal !== undefined && deskVal !== null && deskVal !== '' ? Number(deskVal) : NaN

  if (isNaN(home)) return null

  return {
    homeDelivery: home,
    ...(!isNaN(desk) && desk >= 0 ? { deskDelivery: desk } : {})
  }
}

export function normalizeAlgiersPhone(phone: string): string {
  return normalizePhone(phone)
}
