'use client'

import { useEffect } from 'react'
import { useRTL, useLang } from '@/lib/store/langStore'

export default function RTLWrapper({ children }: { children: React.ReactNode }) {
  const isRTL = useRTL()
  const lang  = useLang()

  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('dir',  isRTL ? 'rtl' : 'ltr')
    html.setAttribute('lang', lang)
    // Toggle Cairo font class — picked up by globals.css [dir="rtl"] rule
    html.classList.toggle('font-arabic', isRTL)
  }, [isRTL, lang])

  return <>{children}</>
}
