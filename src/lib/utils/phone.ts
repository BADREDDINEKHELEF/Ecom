import parse, { isValidPhoneNumber } from 'libphonenumber-js'

/**
 * Checks if a phone number is a valid Algerian number.
 * This provides a free and robust way to verify the format and possibility of a number.
 * @param phone The phone number to check.
 * @returns `true` if the number is a valid Algerian number, `false` otherwise.
 */
export function isValidAlgerianPhone(phone: string): boolean {
  return isValidPhoneNumber(phone, 'DZ')
}

/**
 * Normalizes a phone number to the international E.164 format for Algeria (+213...).
 * It handles various input formats like '0551234567', '213551234567', or '+213 55 123 4567'.
 * Throws an error if the number is invalid, ensuring only valid formats are processed.
 * @param phone The raw phone number string.
 * @returns The normalized phone number in E.164 format.
 */
export function normalizePhone(phone: string): string {
  const phoneNumber = parse(phone, 'DZ')
  if (!phoneNumber || !phoneNumber.isValid()) {
    throw new Error(`Invalid Algerian phone number provided: ${phone}`)
  }
  return phoneNumber.number
}

/**
 * Generates common storage variants for a normalized Algerian phone number.
 * Supabase stores numbers as `+213...`, but some parts of the app might use the `0...` format.
 * This helper provides both for safe database lookups.
 * @param normalizedPhone An E.164 formatted phone number (e.g., +213551234567).
 * @returns An array containing the E.164 format and the local `0...` format.
 */
export function getPhoneVariants(normalizedPhone: string): string[] {
  const localFormat = '0' + normalizedPhone.slice(4) // slice(4) to remove '+213'
  return [normalizedPhone, localFormat]
}