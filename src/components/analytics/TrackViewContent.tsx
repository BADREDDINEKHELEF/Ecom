'use client'

import { useEffect } from 'react'
import { trackViewContent } from '@/lib/analytics'

interface Props {
  product: { id: string; name: string; price: number }
}

export default function TrackViewContent({ product }: Props) {
  useEffect(() => {
    trackViewContent(product)
  // Run once on mount — product identity doesn't change while on this page
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
