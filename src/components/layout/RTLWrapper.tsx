'use client'

import { useEffect } from 'react'
import { useRTL } from '@/lib/store/langStore'

export default function RTLWrapper({ children }: { children: React.ReactNode }) {
  const isRTL = useRTL()

  useEffect(() => {
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', isRTL ? 'ar' : 'fr')
  }, [isRTL])

  return <>{children}</>
}
