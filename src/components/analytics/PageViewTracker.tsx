'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'
import { trackPageView as trackMetaPageView } from '@/lib/meta/events'

export default function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    trackPageView(pathname)

    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
    if (pixelId) {
      trackMetaPageView({
        storeId:       '__platform__',
        storeSlug:     '',
        pixelId,
        accessToken:   null,
        testEventCode: null,
        datasetId:     null,
        enabled:       true,
      })
    }
  }, [pathname])

  return null
}
