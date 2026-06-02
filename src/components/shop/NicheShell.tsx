'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, SlidersHorizontal } from 'lucide-react'
import { useT } from '@/lib/store/langStore'
import { getNiche } from '@/lib/data/niches'
import ProductCard from '@/components/shop/ProductCard'
import SortSelect from '@/components/shop/SortSelect'
import { Product } from '@/types'
import { Suspense } from 'react'

type NicheKey = 'cars' | 'animals' | 'kids' | 'deco'

interface Props {
  nicheId: string
  category?: string
  products: Product[]
}

export default function NicheShell({ nicheId, category, products }: Props) {
  const t = useT()
  const niche = getNiche(nicheId)
  if (!niche) return null

  const nicheT = t.niches[nicheId as NicheKey]
  const name        = nicheT?.name        ?? niche.name
  const description = nicheT?.description ?? niche.description
  const catLabels   = nicheT?.categoryLabels ?? niche.categories

  return (
    <>
      {/* Banner */}
      <section className={`relative bg-gradient-to-br ${niche.gradient} text-white overflow-hidden`}>
        <div className="absolute inset-0">
          <Image src={niche.banner} alt={name} fill className="object-cover opacity-30" sizes="100vw" priority />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <nav className="text-sm text-white/60 mb-6 flex items-center gap-2">
            <Link href="/" className="hover:text-white transition-colors">{t.common.back}</Link>
            <ArrowRight className="w-3 h-3 rtl:rotate-180" />
            <span className="text-white font-medium">{name}</span>
          </nav>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-6xl">{niche.emoji}</span>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black">{name}</h1>
              <p className="text-white/70 mt-1">{description}</p>
            </div>
          </div>
          <p className="text-white/50 text-sm">{products.length} {t.common.products}</p>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-gray-900">{t.common.categories}</h3>
              </div>
              <ul className="space-y-1">
                <li>
                  <Link href={`/${nicheId}`}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${!category ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}>
                    {t.common.allProducts}
                  </Link>
                </li>
                {niche.categories.map((cat, i) => (
                  <li key={cat}>
                    <Link href={`/${nicheId}?category=${encodeURIComponent(cat)}`}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${category === cat ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'}`}>
                      {catLabels[i] ?? cat}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">
                <span className="font-bold text-gray-900">{products.length}</span> {t.common.products}
                {category && <> — <span className="font-semibold text-indigo-600">{catLabels[niche.categories.indexOf(category)] ?? category}</span></>}
              </p>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500">{t.common.sort}:</label>
                <Suspense fallback={<div className="w-40 h-9 bg-gray-100 rounded-lg animate-pulse" />}>
                  <SortSelect />
                </Suspense>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center">
                <p className="text-gray-400 text-4xl mb-3">{niche.emoji}</p>
                <p className="font-semibold text-gray-700 mb-2">{t.common.noProducts}</p>
                <Link href={`/${nicheId}`} className="text-indigo-600 text-sm hover:underline">{t.common.clearFilters}</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
                {products.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
