'use client'

import { usePathname } from 'next/navigation'

export default function HideOnStore({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (
    pathname?.startsWith('/store/') ||
    pathname?.startsWith('/shop/') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/seller')
  ) return null
  return <>{children}</>
}
