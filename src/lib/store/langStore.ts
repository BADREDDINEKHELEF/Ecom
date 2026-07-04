'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Lang, translations } from '@/lib/i18n/translations'

interface LangStore {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (typeof translations)[Lang]
  isRTL: boolean
}

function setCookieLang(lang: Lang) {
  if (typeof document !== 'undefined') {
    document.cookie = `casbah-lang=${lang}; path=/; max-age=31536000; SameSite=Lax`
  }
}

export const useLangStore = create<LangStore>()(
  persist(
    (set) => ({
      lang: 'fr' as Lang,
      isRTL: false,
      t: translations.fr,
      setLang: (lang: Lang) => {
        const validLang = translations[lang] ? lang : 'fr'
        set({ lang: validLang, t: translations[validLang], isRTL: validLang === 'ar' })
        setCookieLang(validLang)
      },
    }),
    {
      name: 'casbah-lang',
      partialize: (state) => ({ lang: state.lang }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const validLang = translations[state.lang] ? state.lang : 'fr'
          state.lang = validLang
          state.t = translations[validLang]
          state.isRTL = validLang === 'ar'
          setCookieLang(validLang)
        }
      },
    }
  )
)

// useT always derives fresh from lang — never stale
export const useT = () => {
  const lang = useLangStore((s) => s.lang)
  return translations[lang] ?? translations.fr
}
export const useLang = () => useLangStore((s) => s.lang)
export const useRTL = () => useLangStore((s) => s.isRTL)
