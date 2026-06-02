'use client'

import { useState, useEffect } from 'react'
import { COUNTRY_LOCALE, DEFAULT_LOCALE } from '@/lib/locale/currencies'

export interface DetectedLocale {
  country: string
  city: string
  currency: string
  language: 'fr' | 'ar' | 'en'
  detected: boolean
}

const STORAGE_KEY = 'casbah_locale'
const DISMISSED_KEY = 'casbah_locale_dismissed'

export function useGeolocation() {
  const [locale, setLocale] = useState<DetectedLocale | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Already stored
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DetectedLocale
        setLocale(parsed)
        const dismissed = localStorage.getItem(DISMISSED_KEY)
        if (!dismissed) setShowBanner(true)
        return
      } catch {}
    }

    // Detect via browser geolocation
    if (!navigator.geolocation) {
      setLocale({ ...DEFAULT_LOCALE, detected: false })
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords
          const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`)
          if (!res.ok) throw new Error('geocode failed')
          const data = await res.json()

          // Reverse-geocode also returns country_code via Nominatim `address.country_code`
          const countryCode = (data.countryCode ?? 'DZ').toUpperCase()
          const cityName = data.city || DEFAULT_LOCALE.city
          const countryLocale = COUNTRY_LOCALE[countryCode] ?? { currency: 'DZD', language: 'fr' as const }

          const detected: DetectedLocale = {
            country: countryCode,
            city: cityName,
            currency: countryLocale.currency,
            language: countryLocale.language,
            detected: true,
          }

          localStorage.setItem(STORAGE_KEY, JSON.stringify(detected))
          setLocale(detected)
          setShowBanner(true)
        } catch {
          const fallback = { ...DEFAULT_LOCALE, detected: false }
          setLocale(fallback)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
        }
      },
      () => {
        const fallback = { ...DEFAULT_LOCALE, detected: false }
        setLocale(fallback)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
      },
      { timeout: 8000, enableHighAccuracy: false }
    )
  }, [])

  const dismissBanner = () => {
    setShowBanner(false)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  const changeLocale = (newLocale: Partial<DetectedLocale>) => {
    const updated = { ...locale!, ...newLocale }
    setLocale(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setShowBanner(false)
    localStorage.setItem(DISMISSED_KEY, '1')
  }

  return { locale, showBanner, dismissBanner, changeLocale }
}
