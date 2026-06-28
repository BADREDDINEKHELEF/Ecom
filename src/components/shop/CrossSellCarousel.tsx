'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ProductCard from './ProductCard'
import type { Product } from '@/types'

interface Props {
  nicheId: string
  excludeId: string
  title?: string
}

export default function CrossSellCarousel({ nicheId, excludeId, title = 'Vous aimerez aussi' }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/products/related?nicheId=${nicheId}&excludeId=${excludeId}&limit=8`)
      .then((r) => r.json())
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch((err) => { console.error('[CrossSellCarousel] fetch failed:', err instanceof Error ? err.message : String(err)) })
  }, [nicheId, excludeId])

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' })
  }

  if (products.length === 0) return null

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => scroll('left')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Précédent">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={() => scroll('right')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Suivant">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 scrollbar-none scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {products.map((product) => (
          <div key={product.id} className="flex-shrink-0 w-52 sm:w-60" style={{ scrollSnapAlign: 'start' }}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
