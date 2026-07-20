/**
 * Normalization utilities for Meta and TikTok tracking.
 * Safe to run both on client and server (no Node.js dependencies).
 */

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('213')) return digits
  if (digits.startsWith('0')) return '213' + digits.slice(1)
  return digits
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
