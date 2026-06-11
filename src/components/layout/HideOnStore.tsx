'use client'

import { usePathname } from 'next/navigation'

export default function HideOnStore({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname?.startsWith('/store/')) return null
  return <>{children}</>
}
