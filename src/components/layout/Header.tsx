'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ShoppingCart, Menu, X, Store, User } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { useT } from '@/lib/store/langStore'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import Logo from '@/components/ui/Logo'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { useEffect } from 'react'

export default function Header() {
  const { toggleCart, itemCount } = useCartStore()
  const cartCount = itemCount()
  const t = useT()
  const [mounted, setMounted]   = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-3">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Logo size="sm" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5 ml-3">
            <Link
              href="/pricing"
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              Tarifs
            </Link>
            <Link
              href="/become-seller"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Store className="w-3.5 h-3.5" /> Créer ma boutique
            </Link>
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {/* Seller dashboard shortcut */}
            <Link
              href="/seller/dashboard"
              className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Store className="w-4 h-4" />
              Mon tableau de bord
            </Link>

            {/* Cart — for COD orders from individual stores */}
            <button
              onClick={() => toggleCart()}
              data-pixel-cart-target="true"
              className="relative p-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label={t.nav.cart}
            >
              <ShoppingCart className="w-5 h-5" />
              {mounted && cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {/* Profile */}
            <Link href="/profile" className="hidden sm:flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-600" />
              </div>
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="md:hidden p-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div id="mobile-menu" className="md:hidden border-t border-gray-100 py-3 space-y-1 animate-fade-in">
            <Link
              href="/pricing"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl">💎</span>
              <p className="font-semibold text-gray-900">Tarifs</p>
            </Link>
            <Link
              href="/become-seller"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <span className="text-2xl">🏪</span>
              <p className="font-semibold text-indigo-600">Créer ma boutique</p>
            </Link>
            <Link
              href="/seller/dashboard"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl">📊</span>
              <p className="font-semibold text-gray-700">Mon tableau de bord</p>
            </Link>
            <Link
              href="/track"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-2xl">📦</span>
              <p className="font-semibold text-gray-700">Suivre ma commande</p>
            </Link>
            <div className="px-4 py-2">
              <LanguageSwitcher />
            </div>
            <div className="pt-2 border-t border-gray-100 flex gap-3 px-4">
              <Link
                href="/seller/login"
                onClick={() => setMenuOpen(false)}
                className="flex-1 text-center py-2.5 font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm transition-colors"
              >
                Se connecter
              </Link>
              <Link
                href="/become-seller"
                onClick={() => setMenuOpen(false)}
                className="flex-1 text-center py-2.5 font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 text-sm transition-colors"
              >
                Créer boutique
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
