'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Package, ShoppingCart, CheckCircle, Search, X } from 'lucide-react'
import { Product } from '@/types'
import { formatPrice } from '@/lib/utils'
import { useCartStore } from '@/lib/store/cartStore'
import { useT } from '@/lib/store/langStore'
import type { StoreNiche } from './page'

interface Props {
  products: Product[]
  accent: string
  storeSlug: string
  storeNiches?: StoreNiche[]
}

export default function StoreProductsGrid({ products, accent, storeSlug, storeNiches = [] }: Props) {
  const [tab, setTab]       = useState('all')
  const [search, setSearch] = useState('')
  const t  = useT()
  const ts = t.store

  const newProducts  = products.filter(p => p.isNew)
  const saleProducts = products.filter(p => p.comparePrice && p.comparePrice > p.price)

  const tabFiltered = useMemo(() => {
    if (tab === 'new')  return newProducts
    if (tab === 'sale') return saleProducts
    const niche = storeNiches.find(n => n.id === tab)
    if (niche) return products.filter(p => p.nicheId === tab)
    return products
  }, [tab, products, newProducts, saleProducts, storeNiches])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tabFiltered
    return tabFiltered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    )
  }, [tabFiltered, search])

  const tabs = [
    { id: 'all', label: ts.tabAll, count: products.length, emoji: '' },
    ...storeNiches.map(n => ({ id: n.id, label: n.name, count: products.filter(p => p.nicheId === n.id).length, emoji: n.emoji })),
    ...(newProducts.length  > 0 ? [{ id: 'new',  label: ts.tabNew,  count: newProducts.length,  emoji: '✨' }] : []),
    ...(saleProducts.length > 0 ? [{ id: 'sale', label: ts.tabSale, count: saleProducts.length, emoji: '🏷️' }] : []),
  ]

  return (
    <div>
      {/* Search bar */}
      {products.length > 4 && (
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aeaeb2]" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={ts.searchPlaceholder}
            className="w-full pl-11 pr-10 py-3 bg-[#f5f5f7] rounded-2xl text-sm text-[#1d1d1f] placeholder-[#aeaeb2] focus:outline-none focus:ring-2 focus:ring-black/10"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[#e8e8ed] transition-colors"
            >
              <X className="w-3.5 h-3.5 text-[#86868b]" />
            </button>
          )}
        </div>
      )}

      {/* Pill tabs — niches + filters */}
      {tabs.length > 1 && (
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                tab === t.id
                  ? 'bg-[#1d1d1f] text-white shadow-sm'
                  : 'bg-[#f5f5f7] text-[#6e6e73] hover:bg-[#e8e8ed]'
              }`}
            >
              {t.emoji && <span>{t.emoji}</span>}
              {t.label}
              {t.id !== 'all' && <span className={`text-xs ${tab === t.id ? 'text-white/60' : 'text-[#aeaeb2]'}`}>{t.count}</span>}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="text-center py-20 text-[#86868b]">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">
            {search ? ts.noResults.replace('{q}', search) : ts.noCategory}
          </p>
          {search && (
            <button onClick={() => setSearch('')} className="mt-3 text-sm text-[#1d1d1f] underline underline-offset-2">
              {ts.clearSearch}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
          {visible.map(product => (
            <ProductCard key={product.id} product={product} accent={accent} storeSlug={storeSlug} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductCard({
  product,
  accent,
  storeSlug,
}: {
  product: Product
  accent: string
  storeSlug: string
}) {
  const addItem = useCartStore(s => s.addItem)
  const t  = useT()
  const ts = t.store
  const tc = t.common
  const [added, setAdded] = useState(false)

  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPct = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0
  const savings = hasDiscount ? product.comparePrice! - product.price : 0

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (product.stock === 0) return
    const ok = addItem(product, 1, undefined, storeSlug)
    if (!ok) return // store conflict — CartSidebar shows the modal
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <Link href={`/store/${storeSlug}/${product.id}`} className="group block">
      {/* Image — portrait, fills card, image IS the card */}
      <div className="relative aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#f5f5f7] mb-3">
        {product.images?.[0] ? (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className={`object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] ${
              product.stock === 0 ? 'opacity-50 grayscale' : ''
            }`}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-[#c7c7cc]" />
          </div>
        )}

        {/* Out of stock */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
            <span className="text-white text-xs font-semibold tracking-wide bg-black/50 px-4 py-2 rounded-full">
              {ts.soldOut}
            </span>
          </div>
        )}

        {/* Badges — small, pill-shaped */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between pointer-events-none">
          {product.isNew && (
            <span
              className="text-[11px] font-bold text-white px-2.5 py-1 rounded-full shadow-sm"
              style={{ background: accent }}
            >
              {tc.new}
            </span>
          )}
          {hasDiscount && (
            <span className="ms-auto text-[11px] font-bold text-white bg-red-500 px-2.5 py-1 rounded-full shadow-sm">
              -{discountPct}%
            </span>
          )}
        </div>

        {/* Low stock — overlay at bottom (only ≤3) */}
        {product.stock > 0 && product.stock <= 3 && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pt-8 pb-3">
            <p className="text-white text-[11px] font-bold tracking-wide">
              {ts.lowStock.replace('{n}', String(product.stock))}
            </p>
          </div>
        )}

        {/* Quick add button — bottom right, appears on hover */}
        {product.stock > 0 && (
          <button
            onClick={handleQuickAdd}
            aria-label={added ? 'Ajouté' : 'Ajouter au panier'}
            className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-95 ${
              added
                ? 'bg-emerald-500 text-white opacity-100 scale-100'
                : 'bg-white text-[#1d1d1f] opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
            }`}
          >
            {added
              ? <CheckCircle className="w-5 h-5" />
              : <ShoppingCart className="w-4 h-4" />
            }
          </button>
        )}
      </div>

      {/* Info — below image, minimal and clean */}
      <div>
        <p className="text-[13px] sm:text-sm text-[#1d1d1f] font-medium line-clamp-2 leading-snug mb-1.5">
          {product.name}
        </p>

        {product.rating > 0 && (
          <div className="flex items-center gap-1 mb-1.5">
            <div className="flex">
              {[1, 2, 3, 4, 5].map(s => (
                <svg key={s} viewBox="0 0 24 24" className={`w-3 h-3 ${s <= Math.round(product.rating) ? 'fill-amber-400' : 'fill-[#d1d1d6]'}`}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
              <span className="text-[10px] text-[#86868b] ml-1">({product.reviewCount})</span>
            </div>
          </div>
        )}

        <div className="flex items-baseline gap-2">
          <span className="text-sm sm:text-[15px] font-bold text-[#1d1d1f]">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-xs text-[#86868b] line-through">{formatPrice(product.comparePrice!)}</span>
          )}
        </div>

        {hasDiscount && savings > 0 && (
          <p className="text-xs text-emerald-600 font-medium mt-0.5">{ts.savings.replace('{n}', formatPrice(savings))}</p>
        )}
      </div>
    </Link>
  )
}
