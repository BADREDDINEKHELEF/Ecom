'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function HideOnStore({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Render children during SSR/hydration to avoid tree mismatch, then hide
  // on client-only store/admin/seller routes after mounting.
  if (
    mounted &&
    (
      pathname?.startsWith('/store/') ||
      pathname?.startsWith('/shop/') ||
      pathname?.startsWith('/admin') ||
      pathname?.startsWith('/seller')
    )
  ) {
    return null
  }

  return <>{children}</>
}
