'use client'

import { useEffect } from 'react'
import { trackViewContent } from '@/lib/analytics'
import { trackViewContent as trackMetaViewContent } from '@/lib/meta/events'

interface Props {
  product: { id: string; name: string; price: number }
}

export default function TrackViewContent({ product }: Props) {
  useEffect(() => {
    trackViewContent(product)

    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
    if (pixelId) {
      trackMetaViewContent(
        {
          storeId:       '__platform__',
          storeSlug:     '',
          pixelId,
          accessToken:   null,
          testEventCode: null,
          datasetId:     null,
          enabled:       true,
        },
        {
          content_ids:  [product.id],
          content_name: product.name,
          content_type: 'product',
          value:        product.price,
          currency:     'DZD',
          contents:     [{ id: product.id, quantity: 1, price: product.price }],
        },
      )
    }
  // Run once on mount — product identity doesn't change while on this page
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
