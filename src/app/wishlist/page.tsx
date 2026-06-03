'use client'

import Link from 'next/link'
import { Heart, ArrowLeft } from 'lucide-react'
import { useWishlistStore } from '@/lib/store/wishlistStore'
import ProductCard from '@/components/shop/ProductCard'
import { useT } from '@/lib/store/langStore'

export default function WishlistPage() {
  const { items, clear } = useWishlistStore()
  const t = useT()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          <h1 className="text-2xl font-black text-gray-900">
            {t.wishlist.title}{' '}
            <span className="text-gray-400 font-normal text-lg">({items.length})</span>
          </h1>
        </div>
        {items.length > 0 && (
          <button
            onClick={clear}
            className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            {t.wishlist.clearAll}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
          <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-700 mb-2">{t.wishlist.empty}</p>
          <p className="text-gray-500 text-sm mb-6">{t.wishlist.emptyHint}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> {t.wishlist.browseProducts}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
