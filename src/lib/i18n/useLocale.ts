'use client'

import { useState, useEffect } from 'react'
import type { Lang } from './translations'

const STORAGE_KEY = 'storedz_locale'

export function useLocale() {
  const [locale, setLocaleState] = useState<Lang>('fr')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (stored && ['fr', 'ar', 'en'].includes(stored)) {
      setLocaleState(stored)
      applyToDocument(stored)
    }
  }, [])

  const setLocale = (l: Lang) => {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
    applyToDocument(l)
  }

  return { locale, setLocale }
}

function applyToDocument(lang: Lang) {
  if (typeof document === 'undefined') return
  document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
}
