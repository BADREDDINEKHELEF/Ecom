// Static exchange rates relative to DZD (updated periodically)
export const EXCHANGE_RATES: Record<string, number> = {
  DZD: 1,
  EUR: 0.0068,
  USD: 0.0074,
  GBP: 0.0059,
  MAD: 0.074,   // Morocco
  TND: 0.023,   // Tunisia
  EGP: 0.366,   // Egypt
  SAR: 0.028,   // Saudi Arabia
  AED: 0.027,   // UAE
  QAR: 0.027,   // Qatar
}

export const COUNTRY_LOCALE: Record<string, { currency: string; language: 'fr' | 'ar' | 'en' }> = {
  DZ: { currency: 'DZD', language: 'fr' },
  MA: { currency: 'MAD', language: 'fr' },
  TN: { currency: 'TND', language: 'fr' },
  FR: { currency: 'EUR', language: 'fr' },
  BE: { currency: 'EUR', language: 'fr' },
  SA: { currency: 'SAR', language: 'ar' },
  EG: { currency: 'EGP', language: 'ar' },
  AE: { currency: 'AED', language: 'ar' },
  QA: { currency: 'QAR', language: 'ar' },
  GB: { currency: 'GBP', language: 'en' },
  US: { currency: 'USD', language: 'en' },
}

export const DEFAULT_LOCALE = { country: 'DZ', city: 'Algiers', currency: 'DZD', language: 'fr' as const }

export function formatLocalPrice(amountDZD: number, currency: string): string {
  const rate = EXCHANGE_RATES[currency] ?? 1
  const converted = amountDZD * rate
  const formatter = new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'DZD' ? 0 : 2,
  })
  return formatter.format(converted)
}
