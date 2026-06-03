'use client'

import { useState } from 'react'
import { X, MapPin, ChevronDown } from 'lucide-react'
import { useGeolocation } from '@/hooks/useGeolocation'
import { COUNTRY_LOCALE } from '@/lib/locale/currencies'
import { useLangStore, useT } from '@/lib/store/langStore'
import type { Lang } from '@/lib/i18n/translations'

const CURRENCY_LABELS: Record<string, string> = {
  DZD: 'دج (DZD)', EUR: '€ (EUR)', USD: '$ (USD)',
  GBP: '£ (GBP)', MAD: 'MAD', TND: 'TND',
  EGP: 'EGP', SAR: 'SAR', AED: 'AED',
}

const REGIONS = [
  { code: 'DZ', label: '🇩🇿 Algeria — DZD' },
  { code: 'FR', label: '🇫🇷 France — EUR' },
  { code: 'MA', label: '🇲🇦 Morocco — MAD' },
  { code: 'TN', label: '🇹🇳 Tunisia — TND' },
  { code: 'US', label: '🇺🇸 USA — USD' },
]

export default function LocaleBanner() {
  const { locale, showBanner, dismissBanner, changeLocale } = useGeolocation()
  const { setLang } = useLangStore()
  const t = useT()
  const [showRegions, setShowRegions] = useState(false)

  if (!showBanner || !locale) return null

  const currencyLabel = CURRENCY_LABELS[locale.currency] ?? locale.currency

  const handleAccept = () => {
    setLang(locale.language as Lang)
    dismissBanner()
  }

  const handleRegionChange = (code: string) => {
    const loc = COUNTRY_LOCALE[code] ?? { currency: 'DZD', language: 'fr' as Lang }
    changeLocale({ country: code, currency: loc.currency, language: loc.language })
    setLang(loc.language as Lang)
    setShowRegions(false)
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <MapPin className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {locale.detected
              ? `${t.localeBanner.detected} ${locale.city}`
              : t.localeBanner.shoppingFrom}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {t.localeBanner.shoppingIn} <span className="font-semibold text-gray-700">{currencyLabel}</span>
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleAccept}
              className="flex-1 bg-indigo-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {t.localeBanner.continue}
            </button>
            <button
              onClick={() => setShowRegions(!showRegions)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 font-medium transition-colors"
            >
              {t.localeBanner.changeRegion} <ChevronDown className={`w-3 h-3 transition-transform ${showRegions ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showRegions && (
            <div className="mt-2 space-y-1">
              {REGIONS.map((r) => (
                <button
                  key={r.code}
                  onClick={() => handleRegionChange(r.code)}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${
                    locale.country === r.code ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={dismissBanner}
          className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
          aria-label={t.localeBanner.dismiss}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
