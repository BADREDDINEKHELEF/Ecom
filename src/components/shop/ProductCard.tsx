'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart, Heart } from 'lucide-react'
import { Product } from '@/types'
import { useCartStore } from '@/lib/store/cartStore'
import { useWishlistStore } from '@/lib/store/wishlistStore'
import { useToastStore } from '@/lib/store/toastStore'
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
  const wishlisted = has(product.id)

  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPct = hasDiscount ? discount(product.price, product.comparePrice!) : 0

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    addItem(product)
    addToast(`${product.name} added to cart`)
  }

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault()
    toggle(product)
    addToast(wishlisted ? 'Removed from wishlist' : 'Saved to wishlist', wishlisted ? 'info' : 'success')
  }

  return (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
      <Link href={`/${product.nicheId}/${product.id}`}>
        <div className="relative overflow-hidden bg-gray-50 aspect-square">
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
            {product.isNew && <Badge variant="new">New</Badge>}
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
          <p className="text-xs text-orange-500 font-medium mt-2">Only {product.stock} left</p>
        )}
        {product.stock === 0 && (
          <p className="text-xs text-red-500 font-medium mt-2">Out of stock</p>
        )}
      </div>
    </div>
  )
}
