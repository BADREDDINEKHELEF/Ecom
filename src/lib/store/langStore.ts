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
        set({ lang, t: translations[lang], isRTL: lang === 'ar' })
        setCookieLang(lang)
      },
    }),
    {
      name: 'casbah-lang',
      partialize: (state) => ({ lang: state.lang }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.t = translations[state.lang]
          state.isRTL = state.lang === 'ar'
          setCookieLang(state.lang)
        }
      },
    }
  )
)

// useT always derives fresh from lang — never stale
export const useT = () => {
  const lang = useLangStore((s) => s.lang)
  return translations[lang]
}
export const useLang = () => useLangStore((s) => s.lang)
export const useRTL = () => useLangStore((s) => s.isRTL)
