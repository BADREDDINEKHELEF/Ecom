'use client'

import { useState, useEffect } from 'react'
import { Eye } from 'lucide-react'
import { useT } from '@/lib/store/langStore'

interface Props {
  productId: string
}

export default function LiveViewers({ productId }: Props) {
  const t  = useT()
  const ts = t.store
  const [viewers, setViewers] = useState<number | null>(null)

  useEffect(() => {
    // Deterministic per product per day — same value for the same product all day, changes daily.
    // Computed client-side only to avoid SSR/CSR hydration mismatch.
    const dayOfYear = Math.floor(Date.now() / 86_400_000)
    const seed      = productId.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, dayOfYear)
    setViewers(4 + (seed % 14)) // 4–17
  }, [productId])

  if (viewers === null) return null

  return (
    <div className="flex items-center gap-2 text-sm text-[#6e6e73]">
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
      </span>
      <Eye className="w-4 h-4 text-[#86868b]" />
      <span>
        {ts.viewersCount.replace('{n}', String(viewers))}
      </span>
    </div>
  )
}
