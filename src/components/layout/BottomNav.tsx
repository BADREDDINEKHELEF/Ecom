'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Package, ShoppingCart, User, Store } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { useT } from '@/lib/store/langStore'
import { useState, useEffect } from 'react'

export default function BottomNav() {
  const pathname = usePathname()
  const { itemCount, toggleCart } = useCartStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const cartCount = itemCount()
  const t = useT()

  // Hide on seller/admin/store pages only after hydration to avoid SSR/CSR mismatch
  if (
    mounted &&
    (
      pathname.startsWith('/seller') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/store/') ||
      pathname.startsWith('/shop/')
    )
  ) return null

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch h-14">

        {/* Home */}
        <Link href="/" className="flex-1 flex flex-col items-center justify-center gap-0.5">
          <Home className={`w-5 h-5 transition-colors ${isActive('/') ? 'text-indigo-600' : 'text-gray-400'}`} />
          <span className={`text-[10px] font-medium leading-none ${isActive('/') ? 'text-indigo-600' : 'text-gray-400'}`}>
            {t.nav.home}
          </span>
        </Link>

        {/* Track order */}
        <Link href="/track" className="flex-1 flex flex-col items-center justify-center gap-0.5">
          <Package className={`w-5 h-5 transition-colors ${isActive('/track') ? 'text-indigo-600' : 'text-gray-400'}`} />
          <span className={`text-[10px] font-medium leading-none ${isActive('/track') ? 'text-indigo-600' : 'text-gray-400'}`}>
            {t.orders.title}
          </span>
        </Link>

        {/* Cart */}
        <button
          onClick={() => toggleCart()}
          aria-label={`Panier${mounted && cartCount > 0 ? ` (${cartCount})` : ''}`}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
        >
          <div className="relative">
            <ShoppingCart className={`w-5 h-5 transition-colors ${isActive('/cart') ? 'text-indigo-600' : 'text-gray-400'}`} />
            {mounted && cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium leading-none text-gray-400">{t.nav.cart}</span>
        </button>

        {/* Seller dashboard */}
        <Link href="/seller/dashboard" className="flex-1 flex flex-col items-center justify-center gap-0.5">
          <Store className={`w-5 h-5 transition-colors ${isActive('/seller') ? 'text-indigo-600' : 'text-gray-400'}`} />
          <span className={`text-[10px] font-medium leading-none ${isActive('/seller') ? 'text-indigo-600' : 'text-gray-400'}`}>
            {t.sellerDash.sellerDashboard}
          </span>
        </Link>

        {/* Profile */}
        <Link href="/profile" className="flex-1 flex flex-col items-center justify-center gap-0.5">
          <User className={`w-5 h-5 transition-colors ${isActive('/profile') ? 'text-indigo-600' : 'text-gray-400'}`} />
          <span className={`text-[10px] font-medium leading-none ${isActive('/profile') ? 'text-indigo-600' : 'text-gray-400'}`}>
            {t.nav.profile}
          </span>
        </Link>

      </div>
    </nav>
  )
}
