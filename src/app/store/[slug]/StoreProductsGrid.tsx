'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Package, Flame, Sparkles } from 'lucide-react'
import { Product } from '@/types'
import { formatPrice } from '@/lib/utils'

interface Props {
  products: Product[]
  accent: string
  storeSlug: string
}

type Tab = 'all' | 'new' | 'sale'

export default function StoreProductsGrid({ products, accent, storeSlug }: Props) {
  const [tab, setTab] = useState<Tab>('all')

  const newProducts  = products.filter(p => p.isNew)
  const saleProducts = products.filter(p => p.comparePrice && p.comparePrice > p.price)

  const visible =
    tab === 'new'  ? newProducts  :
    tab === 'sale' ? saleProducts :
    products

  const tabs: { id: Tab; label: string; icon?: React.ReactNode; count: number }[] = [
    { id: 'all',  label: 'Tous les produits', count: products.length },
    ...(newProducts.length  > 0 ? [{ id: 'new'  as Tab, label: 'Nouveautés', icon: <Sparkles className="w-3.5 h-3.5" />, count: newProducts.length  }] : []),
    ...(saleProducts.length > 0 ? [{ id: 'sale' as Tab, label: 'Promotions',  icon: <Flame   className="w-3.5 h-3.5" />, count: saleProducts.length }] : []),
  ]

  return (
    <div>
      {/* Tab bar */}
      {tabs.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={tab === t.id ? { background: accent } : {}}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t.id
                  ? 'text-white shadow-lg'
                  : 'bg-white text-gray-500 hover:text-gray-800 border border-gray-100 hover:border-gray-200'
              }`}
            >
              {t.icon}
              {t.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-black ${tab === t.id ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Aucun produit dans cette catégorie</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
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
  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPct = hasDiscount
    ? Math.round(((product.comparePrice! - product.price) / product.comparePrice!) * 100)
    : 0
  const savings = hasDiscount ? product.comparePrice! - product.price : 0

  return (
    <Link
      href={`/store/${storeSlug}/${product.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 border border-gray-100/80 transition-all duration-300 flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {product.images?.[0] ? (
          <>
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className={`object-cover transition-transform duration-500 group-hover:scale-110 ${product.stock === 0 ? 'opacity-50 grayscale' : ''}`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            {product.stock > 0 && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                <span className="translate-y-3 group-hover:translate-y-0 transition-transform duration-300 bg-white text-gray-900 text-xs font-black px-5 py-2 rounded-xl shadow-xl">
                  Voir le produit →
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
        )}

        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-white text-xs font-bold px-3 py-1.5 bg-black/60 rounded-full">
              Rupture de stock
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none">
          {product.isNew && (
            <span
              className="text-[10px] font-black text-white px-2 py-1 rounded-lg shadow-md"
              style={{ background: accent }}
            >
              NOUVEAU
            </span>
          )}
          {hasDiscount && (
            <span className="ms-auto text-[10px] font-black text-white bg-red-500 px-2 py-1 rounded-lg shadow-md">
              -{discountPct}%
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 gap-1.5">
        <p className="text-xs sm:text-sm font-bold text-gray-900 leading-snug line-clamp-2 flex-1">
          {product.name}
        </p>

        {product.rating > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map(s => (
                <svg key={s} viewBox="0 0 24 24" className={`w-3 h-3 ${s <= Math.round(product.rating) ? 'fill-amber-400' : 'fill-gray-200'}`}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
            <span className="text-[10px] text-gray-400">({product.reviewCount})</span>
          </div>
        )}

        <div className="flex items-baseline gap-2">
          <span className="text-base sm:text-lg font-black text-gray-900">{formatPrice(product.price)}</span>
          {hasDiscount && (
            <span className="text-[10px] sm:text-xs text-gray-400 line-through">{formatPrice(product.comparePrice!)}</span>
          )}
        </div>

        {hasDiscount && savings > 0 && (
          <p className="text-xs text-emerald-600 font-bold">💚 Économie {formatPrice(savings)}</p>
        )}

        {product.stock > 0 && product.stock <= 5 && (
          <div>
            <p className="text-[10px] text-orange-500 font-bold mb-1">⚡ Plus que {product.stock} en stock</p>
            <div className="h-1 bg-orange-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-red-400 rounded-full"
                style={{ width: `${(product.stock / 5) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
