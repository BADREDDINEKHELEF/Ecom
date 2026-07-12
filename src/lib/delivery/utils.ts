import { WILAYA_DATA, ALL_WILAYAS } from '@/lib/data/wilayas'
import { normalizePhone } from '@/lib/validation/phone'

export function isValidWilaya(wilayaName: string): boolean {
  return wilayaName in WILAYA_DATA
}

/** Official Algerian wilaya numeric code (1–58) from the canonical ordering. */
export function wilayaNameToId(name: string): number | null {
  const idx = ALL_WILAYAS.findIndex((w) => w.toLowerCase() === name.trim().toLowerCase())
  return idx >= 0 ? idx + 1 : null
}

export function splitName(fullName: string): { firstname: string; familyname: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { firstname: parts[0], familyname: parts[0] }
  return { firstname: parts[0], familyname: parts.slice(1).join(' ') }
}

/**
 * Return the phone in the local Algerian 0X XX XX XX XX format.
 * Most carriers reject international prefixes (+213/213).
 */
export function toLocalAlgerianPhone(phone: string): string {
  const normalized = normalizePhone(phone)
  if (normalized.startsWith('+213')) return '0' + normalized.slice(4)
  if (normalized.startsWith('213') && normalized.length > 9) return '0' + normalized.slice(3)
  return normalized
}

export function extractRates(
  row: Record<string, unknown> | null | undefined
): { homeDelivery: number; deskDelivery?: number } | null {
  if (!row) return null

  const getVal = (keys: string[]): unknown => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) return row[key]
    }
    return undefined
  }

  const homeVal = getVal([
    'home_fee', 'tarif_a_domicile', 'domicile_fee', 'tarif_domicile',
    'TarifDomicile', 'Tarif', 'domicile', 'fee', 'tarif', 'prix', 'price',
    'home_delivery_fee', 'express_home', 'economic_home', 'total'
  ])

  const deskVal = getVal([
    'desk_fee', 'tarif_stopdesk', 'stop_desk_fee', 'tarif_bureau',
    'TarifBureau', 'bureau_fee', 'bureau', 'desk_delivery_fee',
    'express_stop_desk', 'economic_stop_desk', 'stop_desk'
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

export function findWilayaRow(
  data: unknown,
  wilayaName: string
): Record<string, unknown> | null {
  if (!data) return null

  const d = data as Record<string, unknown>
  const rows = Array.isArray(data)
    ? data
    : (Array.isArray(d.data)
      ? d.data
      : (Array.isArray(d.results) ? d.results : null))

  if (rows && Array.isArray(rows)) {
    const target = wilayaName.toLowerCase().trim()
    const targetId = wilayaNameToId(wilayaName)

    const getName = (r: unknown): string => {
      if (!r || typeof r !== 'object') return ''
      const rowObj = r as Record<string, unknown>
      const wilayaInfoName = typeof rowObj.wilaya_info === 'object' && rowObj.wilaya_info !== null
        ? String((rowObj.wilaya_info as Record<string, unknown>).name ?? '')
        : ''
      return String(
        rowObj.wilaya ??
        rowObj.wilaya_name ??
        rowObj.name ??
        rowObj.to_wilaya_name ??
        wilayaInfoName ??
        ''
      ).toLowerCase().trim()
    }

    // 1. Exact name match.
    const exactMatch = rows.find((r: unknown) => getName(r) === target)
    if (exactMatch) return exactMatch as Record<string, unknown>

    // 2. Numeric wilaya ID match (used by ZR / Procolis / EcoTrack rate tables).
    if (targetId != null) {
      const idMatch = rows.find((r: unknown) => {
        if (!r || typeof r !== 'object') return false
        const rowObj = r as Record<string, unknown>
        return rowObj.IDWilaya == targetId || rowObj.id == targetId || rowObj.wilaya_id == targetId
      })
      if (idMatch) return idMatch as Record<string, unknown>
    }

    // 3. Fuzzy (substring) name match with a warning.
    const fuzzyMatch = rows.find((r: unknown) => {
      const name = getName(r)
      if (!name) return false
      return name.includes(target) || target.includes(name)
    })
    if (fuzzyMatch) {
      console.warn(
        `[findWilayaRow] Fuzzy match used for wilaya "${wilayaName}" — ` +
        `matched "${getName(fuzzyMatch)}" instead of an exact name. ` +
        `Consider normalising spelling/accents.`
      )
      return fuzzyMatch as Record<string, unknown>
    }

    // 4. Single-row fallback: some carrier rate endpoints return one object
    // scoped by the requested wilaya query param, with no name/id fields.
    if (rows.length === 1) {
      return rows[0] as Record<string, unknown>
    }

    // No match found — do not silently fall back to an arbitrary row. Return
    // null so callers can surface "delivery not available to this wilaya".
    return null
  }
  
  const single = d.data ?? d.results ?? data
  return single as Record<string, unknown>
}
