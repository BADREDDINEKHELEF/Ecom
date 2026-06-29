'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/analytics'
import { trackPageView as trackMetaPageView } from '@/lib/meta/events'

export default function PageViewTracker() {
  const pathname = usePathname()
  // Skip the initial mount: AnalyticsScripts already fires fbq('track','PageView')
  // synchronously after fbq('init') to guarantee the event is not dropped if
  // fbevents.js has not finished loading when this effect first runs.
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

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
