'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Fires custom DOM events for PixelLoadingBar:
 *   shopdzNavStart — fires when Next.js pushState/replaceState is called
 *   shopdzNavEnd   — fires when the pathname hook resolves to the new value
 *
 * Mount once in layout.tsx alongside PixelLoadingBar.
 */
export default function NavigationEvents() {
  const pathname = usePathname()
  const prevPathname = useRef(pathname)

  // Intercept browser history mutations to detect navigation start
  useEffect(() => {
    const origPush    = history.pushState.bind(history)
    const origReplace = history.replaceState.bind(history)

    history.pushState = function (...args) {
      window.dispatchEvent(new CustomEvent('shopdzNavStart'))
      return origPush(...args)
    }
    history.replaceState = function (...args) {
      window.dispatchEvent(new CustomEvent('shopdzNavStart'))
      return origReplace(...args)
    }

    return () => {
      history.pushState    = origPush
      history.replaceState = origReplace
    }
  }, [])

  // pathname change = navigation complete
  useEffect(() => {
    if (prevPathname.current === pathname) return
    prevPathname.current = pathname
    window.dispatchEvent(new CustomEvent('shopdzNavEnd', { detail: { pathname } }))
  }, [pathname])

  return null
}
