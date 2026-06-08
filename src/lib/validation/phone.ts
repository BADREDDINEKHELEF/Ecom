/**
 * Algerian phone validation utilities.
 *
 * Valid formats:
 *   Local:         0[5-7]XXXXXXXX  (10 digits, starts with 0)
 *   International: +213[5-7]XXXXXXXX or 213[5-7]XXXXXXXX (12/13 chars)
 *
 * Used by API route validators, form components, and Zod schemas.
 */

export const ALGERIAN_PHONE_REGEX = /^(\+?213|0)[5-7]\d{8}$/

export function isValidAlgerianPhone(phone: string): boolean {
  return ALGERIAN_PHONE_REGEX.test(phone.replace(/[\s\-().]/g, ''))
}

/**
 * Normalise to local format (0XXXXXXXXX) for storage.
 * All callers store the local format in the DB so tracking/lookup is consistent.
 */
export function normalizePhone(phone: string): string {
  const clean = phone.replace(/[\s\-().+]/g, '')
  if (clean.startsWith('213')) return '0' + clean.slice(3)
  return clean
}

/**
 * Format for display: 0X XX XX XX XX
 */
export function formatPhone(phone: string): string {
  const n = normalizePhone(phone)
  if (n.length === 10) {
    return `${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 6)} ${n.slice(6, 8)} ${n.slice(8, 10)}`
  }
  return phone
}
