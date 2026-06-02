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

export const useLangStore = create<LangStore>()(
  persist(
    (set, get) => ({
      lang: 'fr' as Lang,
      isRTL: false,
      t: translations.fr,
      setLang: (lang: Lang) =>
        set({ lang, t: translations[lang], isRTL: lang === 'ar' }),
    }),
    {
      name: 'shopdz-lang',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.t = translations[state.lang]
          state.isRTL = state.lang === 'ar'
        }
      },
    }
  )
)

// Convenience hook with t shortcut
export const useT = () => useLangStore((s) => s.t)
export const useLang = () => useLangStore((s) => s.lang)
export const useRTL = () => useLangStore((s) => s.isRTL)
