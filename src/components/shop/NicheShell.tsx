'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, SlidersHorizontal, X } from 'lucide-react'
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

  const activeCatLabel = category
    ? (catLabels[niche.categories.indexOf(category)] ?? category)
    : null

  return (
    <>
      {/* Banner */}
      <section className={`relative bg-gradient-to-br ${niche.gradient} text-white overflow-hidden`}>
        <div className="absolute inset-0">
          <Image src={niche.banner} alt={name} fill className="object-cover opacity-20" sizes="100vw" priority />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <nav className="text-sm text-white/60 mb-5 flex items-center gap-2">
            <Link href="/" className="hover:text-white transition-colors">{t.common.back}</Link>
            <ArrowRight className="w-3 h-3 rtl:rotate-180" />
            <span className="text-white font-medium">{name}</span>
          </nav>
          <div className="flex items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl sm:text-6xl drop-shadow-lg">{niche.emoji}</span>
              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{name}</h1>
                <p className="text-white/70 mt-1 text-sm sm:text-base">{description}</p>
              </div>
            </div>
            {/* Product count glass chip */}
            <div className="hidden sm:flex items-center gap-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full px-4 py-2 text-sm font-semibold shrink-0">
              <span className="text-xl leading-none">{niche.emoji}</span>
              <span>{products.length} {t.common.products}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile: horizontal scrollable category chips */}
      <div className="lg:hidden bg-white border-b border-gray-100 sticky top-16 z-20 shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <Link
            href={`/${nicheId}`}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !category
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t.common.allProducts}
          </Link>
          {niche.categories.map((cat, i) => (
            <Link
              key={cat}
              href={`/${nicheId}?category=${encodeURIComponent(cat)}`}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                category === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {catLabels[i] ?? cat}
            </Link>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar — desktop only, sticky */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl p-5 shadow-sm sticky top-24">
              <div className="flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-gray-900">{t.common.categories}</h3>
              </div>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={`/${nicheId}`}
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      !category ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {t.common.allProducts}
                  </Link>
                </li>
                {niche.categories.map((cat, i) => (
                  <li key={cat}>
                    <Link
                      href={`/${nicheId}?category=${encodeURIComponent(cat)}`}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        category === cat ? 'bg-indigo-600 text-white font-semibold' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {catLabels[i] ?? cat}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-500">
                <span className="font-bold text-gray-900">{products.length}</span> {t.common.products}
                {activeCatLabel && (
                  <Link
                    href={`/${nicheId}`}
                    className="inline-flex items-center gap-1 ms-2 bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full text-xs hover:bg-indigo-100 transition-colors"
                  >
                    {activeCatLabel}
                    <X className="w-3 h-3" />
                  </Link>
                )}
              </p>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-500 hidden sm:block">{t.common.sort}:</label>
                <Suspense fallback={<div className="w-40 h-9 bg-gray-100 rounded-lg animate-pulse" />}>
                  <SortSelect />
                </Suspense>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center">
                <p className="text-gray-400 text-4xl mb-3">{niche.emoji}</p>
                <p className="font-semibold text-gray-700 mb-2">{t.common.noProducts}</p>
                <Link href={`/${nicheId}`} className="text-indigo-600 text-sm hover:underline">
                  {t.common.clearFilters}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                {products.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
