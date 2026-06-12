'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Heart, ArrowLeftRight } from 'lucide-react'
import { memo } from 'react'
import { Product } from '@/types'
import { useCartStore } from '@/lib/store/cartStore'
import { useWishlistStore } from '@/lib/store/wishlistStore'
import { useCompareStore } from '@/lib/store/compareStore'
import { useToastStore } from '@/lib/store/toastStore'
import { useT, useRTL } from '@/lib/store/langStore'
import { formatPrice, discount } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import StarRating from '@/components/ui/StarRating'

interface ProductCardProps {
  product: Product
}

function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const { toggle, has } = useWishlistStore()
  const { toggle: compareToggle, has: compareHas } = useCompareStore()
  const addToast = useToastStore((s) => s.add)
  const t = useT()
  const isRTL = useRTL()
  const wishlisted = has(product.id)
  const inCompare = compareHas(product.id)

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
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PC9zdmc+"
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

          <div className={`absolute top-2.5 ${isRTL ? 'right-2.5' : 'left-2.5'} flex flex-col gap-1.5`}>
            {product.condition === 'used'        && <Badge variant="warning">Occasion</Badge>}
            {product.condition === 'refurbished' && <Badge variant="sale">Reconditionné</Badge>}
            {product.isNew && <Badge variant="new">{t.common.new}</Badge>}
            {hasDiscount && <Badge variant="sale">-{discountPct}%</Badge>}
          </div>

          <button
            onClick={handleWishlist}
            aria-label={wishlisted ? t.product.removedWishlist : t.product.savedWishlist}
            className={`absolute top-2.5 ${isRTL ? 'left-2.5' : 'right-2.5'} p-2 rounded-full transition-all ${
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
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
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
              <span className="text-gray-500 line-through text-xs ms-1.5">
                {formatPrice(product.comparePrice!)}
              </span>
            )}
          </div>
          {product.stock === 0 ? (
            <span className="text-xs text-gray-400 font-medium">{t.product.outOfStock}</span>
          ) : (
            <button
              onClick={handleAddToCart}
              aria-label={`${t.cart.add} ${product.name}`}
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}
        </div>

        {product.stock > 0 && product.stock < 10 && (
          <p className="text-xs text-orange-500 font-medium mt-2">
            {t.common.lowStock.replace('{n}', String(product.stock))}
          </p>
        )}
        <button
          onClick={(e) => { e.preventDefault(); compareToggle(product) }}
          aria-label={inCompare ? `Retirer ${product.name} de la comparaison` : `Comparer ${product.name}`}
          aria-pressed={inCompare}
          className={`mt-2 w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg border transition-colors ${
            inCompare
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700 font-semibold'
              : 'border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600'
          }`}
        >
          <ArrowLeftRight className="w-3 h-3" />
          {inCompare ? t.product.inCompare : t.product.compare}
        </button>
      </div>
    </div>
  )
}

export default memo(ProductCard)
