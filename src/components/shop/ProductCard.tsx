'use client'

import Image from 'next/image'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ShoppingCart, Heart, ArrowLeftRight } from 'lucide-react'
import { memo, useRef } from 'react'
import { Product } from '@/types'
import { useCartStore } from '@/lib/store/cartStore'
import { useWishlistStore } from '@/lib/store/wishlistStore'
import { useCompareStore } from '@/lib/store/compareStore'
import { useToastStore } from '@/lib/store/toastStore'
import { useT, useRTL } from '@/lib/store/langStore'
import { formatPrice, discount } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import StarRating from '@/components/ui/StarRating'
import PixelBadge from '@/components/ui/PixelBadge'
import { usePixelCartPop } from '@/components/effects/usePixelCartPop'
import { usePixelCartFloat } from '@/components/effects/PixelCartFloat'
import { trackAddToCart } from '@/lib/analytics'

const PixelCartFloat = dynamic(
  () => import('@/components/effects/PixelCartFloat').then(m => ({ default: m.default })),
  { ssr: false },
)

interface ProductCardProps {
  product: Product
}

function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem)
  const { toggle, has } = useWishlistStore()
  const { toggle: compareToggle, has: compareHas } = useCompareStore()
  const addToast = useToastStore((s) => s.add)
  const imgRef  = useRef<HTMLImageElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const { triggerPop } = usePixelCartPop()
  const { floatState, triggerFloat, resetFloat } = usePixelCartFloat()
  const t = useT()
  const isRTL = useRTL()
  const wishlisted = has(product.id)
  const inCompare  = compareHas(product.id)

  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPct = hasDiscount ? discount(product.price, product.comparePrice!) : 0
  const savings     = hasDiscount ? product.comparePrice! - product.price : 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem(product)
    addToast(`${product.name} ${t.product.addedMsg}`)
    trackAddToCart({ id: product.id, name: product.name, price: product.price, quantity: 1 })
    // V2 effects fire simultaneously
    triggerPop(imgRef)
    if (cardRef.current) {
      triggerFloat(cardRef.current.getBoundingClientRect(), product.images[0] ?? '')
    }
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
    <div ref={cardRef} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
      <Link href={`/${product.nicheId}/${product.id}`}>
        <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
          {product.images[0] ? (
            <Image
              ref={imgRef}
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

          {/* Condition / new / discount / cod-safe badges — top-left */}
          <div className={`absolute top-2.5 ${isRTL ? 'right-2.5' : 'left-2.5'} flex flex-col gap-1.5`}>
            {product.condition === 'used'        && <Badge variant="warning">Occasion</Badge>}
            {product.condition === 'refurbished' && <Badge variant="sale">Reconditionné</Badge>}
            {product.isNew && <PixelBadge variant="new" />}
            {hasDiscount && <PixelBadge variant="promo" discount={discountPct} />}
          </div>

          {/* COD-safe badge — always shown for COD products */}
          {(product as Product & { paymentMethod?: string }).paymentMethod === 'cod' && (
            <div className={`absolute bottom-9 ${isRTL ? 'right-2.5' : 'left-2.5'}`}>
              <PixelBadge variant="cod-safe" size="sm" />
            </div>
          )}

          {/* Pixel top-seller badge */}
          {product.isFeatured && (
            <div className="absolute bottom-9 left-2.5">
              <PixelBadge variant="top-seller" />
            </div>
          )}

          {/* Wishlist — top-right */}
          <button
            onClick={handleWishlist}
            aria-label={wishlisted ? t.product.removedWishlist : t.product.savedWishlist}
            className={`absolute top-2.5 ${isRTL ? 'left-2.5' : 'right-2.5'} p-2 rounded-full shadow-sm transition-all ${
              wishlisted
                ? 'bg-red-50 opacity-100'
                : 'bg-white/90 opacity-60 hover:opacity-100 hover:bg-white'
            }`}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${wishlisted ? 'fill-red-500 text-red-500' : 'text-gray-500'}`}
            />
          </button>

          {/* Compare — bottom-right, visible on hover */}
          <button
            onClick={(e) => { e.preventDefault(); compareToggle(product) }}
            aria-label={inCompare ? `Retirer ${product.name} de la comparaison` : `Comparer ${product.name}`}
            aria-pressed={inCompare}
            className={`absolute bottom-2.5 ${isRTL ? 'left-2.5' : 'right-2.5'} flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full backdrop-blur-sm transition-all duration-200 ${
              inCompare
                ? 'bg-indigo-600 text-white opacity-100'
                : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'
            }`}
          >
            <ArrowLeftRight className="w-3 h-3" />
            {inCompare ? t.product.inCompare : t.product.compare}
          </button>

          {/* Multi-image dots */}
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
        <Link href={`/${product.nicheId}/${product.id}`}>
          <h3 className="text-gray-900 font-semibold text-sm leading-snug hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
            {product.name}
          </h3>
        </Link>

        <StarRating rating={product.rating} reviewCount={product.reviewCount} className="mb-3" />

        <div className="mb-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-gray-900 font-bold text-base">{formatPrice(product.price)}</span>
            {hasDiscount && (
              <span className="text-gray-400 line-through text-xs">
                {formatPrice(product.comparePrice!)}
              </span>
            )}
          </div>
          {hasDiscount && savings > 0 && (
            <p className="text-emerald-600 text-xs font-medium mt-0.5">
              Vous économisez {formatPrice(savings)}
            </p>
          )}
        </div>

        {product.stock > 0 && product.stock < 10 && (
          <div className="mb-3">
            <p className="text-xs text-orange-500 font-medium mb-1">
              {t.common.lowStock.replace('{n}', String(product.stock))}
            </p>
            <div className="h-1 bg-orange-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full"
                style={{ width: `${Math.min(100, (product.stock / 10) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {product.stock === 0 ? (
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl bg-gray-100 text-gray-400 cursor-not-allowed font-medium"
          >
            {t.product.outOfStock}
          </button>
        ) : (
          <button
            onClick={handleAddToCart}
            aria-label={`${t.cart.add} ${product.name}`}
            className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all font-semibold"
          >
            <ShoppingCart className="w-4 h-4" />
            Ajouter
          </button>
        )}
      </div>

      {/* Lazy-loaded fly-to-cart animation */}
      <PixelCartFloat
        trigger={floatState.trigger}
        fromRect={floatState.fromRect}
        toRect={floatState.toRect}
        productImageSrc={floatState.productImageSrc}
        onComplete={resetFloat}
      />
    </div>
  )
}

export default memo(ProductCard)
