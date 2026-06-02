'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, Truck } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { useT } from '@/lib/store/langStore'
import { formatPrice } from '@/lib/utils'

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, total, itemCount } = useCartStore()
  const t = useT()
  const cartTotal = total()
  const count = itemCount()

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-20 h-20 text-gray-200 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-gray-900 mb-2">{t.cart.empty}</h1>
        <p className="text-gray-500 mb-8">{t.cart.emptyHint}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t.cart.continueShopping}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          {t.cart.title} <span className="text-gray-400 font-normal text-lg">({count})</span>
        </h1>
        <button
          onClick={clearCart}
          className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
        >
          {t.cart.clear}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm flex gap-4">
              <Link href={`/${product.nicheId}/${product.id}`}>
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                </div>
              </Link>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/${product.nicheId}/${product.id}`}>
                    <h3 className="font-bold text-gray-900 hover:text-indigo-600 transition-colors leading-snug">
                      {product.name}
                    </h3>
                  </Link>
                  <button
                    onClick={() => removeItem(product.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{product.category}</p>
                <p className="text-indigo-600 font-bold mt-2">{formatPrice(product.price)}</p>

                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(product.id, quantity - 1)}
                      className="px-3 py-1.5 hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-3 py-1.5 font-bold text-sm min-w-[2.5rem] text-center">{quantity}</span>
                    <button
                      onClick={() => updateQuantity(product.id, Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                      className="px-3 py-1.5 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    = {formatPrice(product.price * quantity)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24 space-y-5">
            <h2 className="font-black text-gray-900 text-lg">{t.checkout.orderSummary}</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t.cart.subtotal}</span>
                <span className="font-semibold text-gray-900">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{t.cart.shipping}</span>
                <span className="text-gray-400 italic text-xs">{t.cart.shippingHint}</span>
              </div>
              <div className="border-t pt-3 flex justify-between">
                <span className="font-bold text-gray-900">{t.cart.total}</span>
                <span className="font-black text-xl text-gray-900">{formatPrice(cartTotal)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="block w-full bg-indigo-600 text-white text-center font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              {t.cart.checkout}
            </Link>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> {t.cart.continueShopping}
            </Link>

            <div className="flex items-center gap-2 text-xs text-gray-400 border-t pt-4">
              <Truck className="w-4 h-4" />
              {t.product.deliveryTime}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
