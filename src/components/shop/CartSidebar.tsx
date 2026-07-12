'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { X, Minus, Plus, ShoppingBag, Trash2, Shield, Tag, AlertTriangle } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { useT, useRTL } from '@/lib/store/langStore'
import { formatPrice, COLOR_HEX } from '@/lib/utils'

export default function CartSidebar() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, total, savings, itemCount, cartStoreSlug, storeConflict, confirmStoreSwitch, cancelStoreSwitch } = useCartStore()
  const t = useT()
  const isRTL = useRTL()
  const count = itemCount()
  const cartTotal = total()
  const cartSavings = savings()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Close cart on Escape and lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, closeCart])

  // Don't render until client-side hydration is complete to avoid SSR mismatch
  if (!mounted) return null

  return (
    <>
      {/* Store-switch conflict modal */}
      {mounted && storeConflict && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={cancelStoreSwitch}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-conflict-title"
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" aria-hidden="true" />
              </div>
              <div>
                <h2 id="cart-conflict-title" className="font-bold text-gray-900 mb-1">Panier d&apos;une autre boutique</h2>
                <p className="text-sm text-gray-500">
                  Votre panier contient des articles d&apos;une autre boutique. Voulez-vous vider le panier et ajouter ce produit ?
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={cancelStoreSwitch}
                className="flex-1 py-2.5 text-sm font-semibold border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmStoreSwitch}
                className="flex-1 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Vider et ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={closeCart}
        />
      )}

      <div
        role="dialog"
        aria-label={t.cart.title}
        aria-hidden={!isOpen}
        {...(!isOpen ? { inert: true } : {})}
        className={`fixed top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${
          isRTL ? 'left-0' : 'right-0'
        } ${
          isOpen ? 'translate-x-0' : (isRTL ? '-translate-x-full' : 'translate-x-full')
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            <div>
              <h2 className="font-bold text-gray-900 leading-none">{t.cart.title}</h2>
              {cartStoreSlug && (
                <Link
                  href={`/store/${cartStoreSlug}`}
                  onClick={closeCart}
                  className="text-[11px] text-indigo-500 font-medium hover:underline leading-none"
                >
                  boutique/{cartStoreSlug}
                </Link>
              )}
            </div>
            {count > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Fermer le panier"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-200" />
            <p className="text-gray-500 font-medium">{t.cart.empty}</p>
            <button
              type="button"
              onClick={closeCart}
              className="text-indigo-600 font-semibold text-sm hover:underline rounded px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {t.cart.continueShopping}
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {items.map(({ product, quantity, selectedColor, storeSlug }) => {
                const variant = selectedColor ? (product.colorVariants ?? []).find(v => v.name === selectedColor) : null
                const colorIdx = !variant && selectedColor ? (product.imageColors ?? []).indexOf(selectedColor) : -1
                const displayImg = variant?.images?.[0] ?? (colorIdx !== -1 ? product.images[colorIdx] : product.images?.[0])
                return (
                <div key={`${product.id}-${selectedColor ?? ''}`} className="flex gap-3">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                    {displayImg ? (
                      <Image
                        src={displayImg}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={storeSlug ? `/store/${storeSlug}/${product.id}` : `/${product.nicheId}/${product.id}`}
                      onClick={closeCart}
                      className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-indigo-600 transition-colors"
                    >
                      {product.name}
                    </Link>
                    {selectedColor && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
                          style={{ background: COLOR_HEX[selectedColor] ?? '#9CA3AF' }}
                        />
                        <span className="text-xs text-gray-500">{selectedColor}</span>
                      </div>
                    )}
                    <p className="text-indigo-600 font-bold text-sm mt-0.5">
                      {formatPrice(product.price)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, quantity - 1, selectedColor)}
                        className="w-8 h-8 flex items-center justify-center border rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        aria-label="Diminuer la quantité"
                      >
                        <Minus className="w-3 h-3" aria-hidden="true" />
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(product.id, Math.min(product.stock, quantity + 1), selectedColor)}
                        disabled={quantity >= product.stock}
                        className="w-8 h-8 flex items-center justify-center border rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        aria-label="Augmenter la quantité"
                      >
                        <Plus className="w-3 h-3" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(product.id, selectedColor)}
                        className="ms-auto w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        aria-label="Retirer l'article"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>

            <div className="border-t px-5 py-5 space-y-4">
              {cartSavings > 0 && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                  <Tag className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs font-semibold text-emerald-800">
                    Vous économisez {formatPrice(cartSavings)} sur cette commande 🎉
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">{t.cart.subtotal}</span>
                <span className="text-gray-900 font-bold text-lg">{formatPrice(cartTotal)}</span>
              </div>
              <p className="text-xs text-gray-400">{t.cart.shippingHint}</p>
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                <Shield className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-xs font-semibold text-green-800">{t.trust.cod} — {t.trust.codText}</span>
              </div>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="block w-full bg-indigo-600 text-white text-center font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                {t.cart.checkout}
              </Link>
              <Link
                href="/cart"
                onClick={closeCart}
                className="block w-full text-center text-indigo-600 font-semibold text-sm hover:underline rounded py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
