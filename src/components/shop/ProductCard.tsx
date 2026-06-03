'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Heart } from 'lucide-react'
import { Product } from '@/types'
import { useCartStore } from '@/lib/store/cartStore'
import { useWishlistStore } from '@/lib/store/wishlistStore'
import { useToastStore } from '@/lib/store/toastStore'
import { useT } from '@/lib/store/langStore'
import { formatPrice, discount } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import StarRating from '@/components/ui/StarRating'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const { toggle, has } = useWishlistStore()
  const addToast = useToastStore((s) => s.add)
  const t = useT()
  const wishlisted = has(product.id)

  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPct = hasDiscount ? discount(product.price, product.comparePrice!) : 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem(product)
    addToast(`${product.name} ${t.product.addedMsg}`)
  }

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    toggle(product)
    addToast(
      wishlisted ? t.product.removedWishlist : t.product.savedWishlist,
      wishlisted ? 'info' : 'success',
    )
  }

  return (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      <Link href={`/${product.nicheId}/${product.id}`}>
        <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className={`object-cover transition-transform duration-500 group-hover:scale-105 ${product.stock === 0 ? 'opacity-60' : ''}`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <ShoppingCart className="w-10 h-10" />
            </div>
          )}

          {/* Out-of-stock overlay */}
          {product.stock === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">
                {t.product.outOfStock}
              </span>
            </div>
          )}

          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
            {product.isNew && <Badge variant="new">{t.common.new}</Badge>}
            {hasDiscount && <Badge variant="sale">-{discountPct}%</Badge>}
          </div>

          <button
            onClick={handleWishlist}
            className={`absolute top-2.5 right-2.5 p-2 rounded-full transition-all ${
              wishlisted
                ? 'bg-red-50 opacity-100'
                : 'bg-white/90 opacity-0 group-hover:opacity-100 hover:bg-white'
            }`}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-500'}`}
            />
          </button>

          {/* Multi-image indicator */}
          {product.images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {product.images.slice(0, 4).map((_, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/50'}`} />
              ))}
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
          {product.category}
        </p>
        <Link href={`/${product.nicheId}/${product.id}`}>
          <h3 className="text-gray-900 font-semibold text-sm leading-snug hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
            {product.name}
          </h3>
        </Link>

        <StarRating rating={product.rating} reviewCount={product.reviewCount} className="mb-3" />

        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-900 font-bold text-base">{formatPrice(product.price)}</span>
            {hasDiscount && (
              <span className="text-gray-400 line-through text-xs ml-1.5">
                {formatPrice(product.comparePrice!)}
              </span>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:bg-gray-200 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>

        {product.stock > 0 && product.stock < 10 && (
          <p className="text-xs text-orange-500 font-medium mt-2">
            {t.common.lowStock.replace('{n}', String(product.stock))}
          </p>
        )}
      </div>
    </div>
  )
}
