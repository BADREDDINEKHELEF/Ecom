'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { useT } from '@/lib/store/langStore'
import { formatPrice } from '@/lib/utils'

export default function MobileCartBar() {
  const { itemCount, total, toggleCart } = useCartStore()
  const t = useT()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const count = mounted ? itemCount() : 0
  const cartTotal = mounted ? total() : 0

  if (!mounted || count === 0) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden pb-safe">
      <button
        onClick={toggleCart}
        className="w-full flex items-center justify-between bg-indigo-600 text-white px-5 py-4 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-indigo-600 text-[10px] font-black rounded-full flex items-center justify-center">
              {count}
            </span>
          </div>
          <span className="font-bold text-sm">{t.cart.checkout}</span>
        </div>
        <span className="font-black">{formatPrice(cartTotal)}</span>
      </button>
    </div>
  )
}
