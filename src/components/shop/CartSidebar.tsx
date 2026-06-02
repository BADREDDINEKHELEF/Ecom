'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { useT } from '@/lib/store/langStore'
import { formatPrice } from '@/lib/utils'

export default function CartSidebar() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, total, itemCount } = useCartStore()
  const t = useT()
  const count = itemCount()
  const cartTotal = total()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Don't render until client-side hydration is complete to avoid SSR mismatch
  if (!mounted) return null

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={closeCart}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900">{t.cart.title}</h2>
            {count > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </div>
          <button onClick={closeCart} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-200" />
            <p className="text-gray-500 font-medium">{t.cart.empty}</p>
            <button
              onClick={closeCart}
              className="text-indigo-600 font-semibold text-sm hover:underline"
            >
              {t.cart.continueShopping}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex gap-3">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/${product.nicheId}/${product.id}`}
                      onClick={closeCart}
                      className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-indigo-600 transition-colors"
                    >
                      {product.name}
                    </Link>
                    <p className="text-indigo-600 font-bold text-sm mt-0.5">
                      {formatPrice(product.price)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="p-1 border rounded-md hover:bg-gray-100 transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-semibold w-5 text-center">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, Math.min(product.stock, quantity + 1))}
                        disabled={quantity >= product.stock}
                        className="p-1 border rounded-md hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(product.id)}
                        className="ml-auto p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t px-5 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">{t.cart.subtotal}</span>
                <span className="text-gray-900 font-bold text-lg">{formatPrice(cartTotal)}</span>
              </div>
              <p className="text-xs text-gray-400">{t.cart.shippingHint}</p>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="block w-full bg-indigo-600 text-white text-center font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                {t.cart.checkout}
              </Link>
              <Link
                href="/cart"
                onClick={closeCart}
                className="block w-full text-center text-indigo-600 font-semibold text-sm hover:underline"
              >
                {t.cart.viewFullCart}
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  )
}
