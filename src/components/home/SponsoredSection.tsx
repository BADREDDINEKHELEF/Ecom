'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Zap, ArrowRight } from 'lucide-react'
import { useT } from '@/lib/store/langStore'
import { formatPrice } from '@/lib/utils'

interface SponsoredProduct {
  id: string
  name: string
  price: number
  image: string | null
  niche_id: string
  store_name: string
  store_slug: string
}

export default function SponsoredSection() {
  const [products, setProducts] = useState<SponsoredProduct[]>([])
  const [loading, setLoading] = useState(true)
  const t = useT()

  useEffect(() => {
    fetch('/api/sponsored?placement=homepage&limit=4')
      .then((r) => { if (!r.ok) throw new Error('fetch failed'); return r.json() })
      .then((d) => setProducts(Array.isArray(d.products) ? d.products : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  if (!loading && products.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-end justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-amber-600 font-semibold text-xs uppercase tracking-wider mb-0.5">Sponsorisé</p>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900">Produits mis en avant</h2>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="rounded-2xl bg-gray-100 animate-pulse aspect-[3/4]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/${p.niche_id}/${p.id}`}
              className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-gray-100 relative"
            >
              {/* Sponsored badge */}
              <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-amber-500/90 text-white text-[10px] font-black px-2 py-0.5 rounded-full backdrop-blur-sm">
                <Zap className="w-2.5 h-2.5" />
                Sponsorisé
              </div>

              {/* Image */}
              <div className="aspect-square bg-gray-50 overflow-hidden">
                {p.image ? (
                  <Image
                    src={p.image}
                    alt={p.name}
                    width={300}
                    height={300}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Zap className="w-10 h-10 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">{p.name}</p>
                <p className="text-xs text-gray-400 mb-2">{p.store_name}</p>
                <p className="text-base font-black text-gray-900">{formatPrice(p.price)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
