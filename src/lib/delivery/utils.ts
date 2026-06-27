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

export function extractRates(row: any): { homeDelivery: number; deskDelivery?: number } | null {
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
}

export function normalizeAlgiersPhone(phone: string): string {
  return normalizePhone(phone)
}
