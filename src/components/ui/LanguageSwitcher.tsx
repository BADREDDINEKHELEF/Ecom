'use client'

import { useState, useEffect } from 'react'
import { useLangStore } from '@/lib/store/langStore'
import type { Lang } from '@/lib/i18n/translations'

const LANGS: { code: Lang; flag: string; label: string }[] = [
  { code: 'ar', flag: '🇩🇿', label: 'عربي' },
  { code: 'fr', flag: '🇫🇷', label: 'FR' },
  { code: 'en', flag: '🇬🇧', label: 'EN' },
]

export default function LanguageSwitcher() {
  const { lang, setLang } = useLangStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Render a neutral skeleton until hydrated to avoid SSR/client mismatch
  if (!mounted) {
    return <div className="w-24 h-7 bg-gray-100 rounded-lg animate-pulse" />
  }

  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
      {LANGS.map(({ code, flag, label }) => (
        <button
          key={code}
          type="button"
          aria-pressed={lang === code}
          aria-label={`Changer la langue en ${label}`}
          onClick={() => setLang(code)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            lang === code
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <span aria-hidden="true">{flag}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
