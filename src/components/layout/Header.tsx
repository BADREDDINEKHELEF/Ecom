'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { ShoppingCart, Menu, X, Store, User, LayoutDashboard, Package, BadgePercent } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { useT } from '@/lib/store/langStore'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import Logo from '@/components/ui/Logo'
import ThemeToggle from '@/components/ui/ThemeToggle'

export default function Header() {
  const { toggleCart, itemCount } = useCartStore()
  const cartCount = itemCount()
  const t = useT()
  const pathname = usePathname()
  const [mounted, setMounted]   = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Close mobile menu on Escape for keyboard users.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-3">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Logo size="sm" />
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Navigation principale" className="hidden md:flex items-center gap-0.5 ml-3">
            <Link
              href="/pricing"
              aria-current={isActive('/pricing') ? 'page' : undefined}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/pricing')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Tarifs
            </Link>
            <Link
              href="/become-seller"
              aria-current={isActive('/become-seller') ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                isActive('/become-seller')
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-indigo-600 hover:bg-indigo-50'
              }`}
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
              aria-current={isActive('/seller/dashboard') ? 'page' : undefined}
              className={`hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive('/seller/dashboard')
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
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
            <Link
              href="/profile"
              aria-label={t.nav.profile}
              aria-current={isActive('/profile') ? 'page' : undefined}
              className={`hidden sm:flex items-center gap-2 p-2 rounded-lg transition-colors ${
                isActive('/profile') ? 'bg-gray-100' : 'hover:bg-gray-100'
              }`}
            >
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
          <nav
            id="mobile-menu"
            aria-label="Menu mobile"
            className="md:hidden border-t border-gray-100 py-3 space-y-1 animate-fade-in max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <Link
              href="/pricing"
              onClick={() => setMenuOpen(false)}
              aria-current={isActive('/pricing') ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/pricing') ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-50'
              }`}
            >
              <BadgePercent className="w-5 h-5 text-indigo-600" />
              <p className="font-semibold">Tarifs</p>
            </Link>
            <Link
              href="/seller/dashboard"
              onClick={() => setMenuOpen(false)}
              aria-current={isActive('/seller/dashboard') ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/seller/dashboard') ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 text-gray-500" />
              <p className="font-semibold">Mon tableau de bord</p>
            </Link>
            <Link
              href="/track"
              onClick={() => setMenuOpen(false)}
              aria-current={isActive('/track') ? 'page' : undefined}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive('/track') ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-50'
              }`}
            >
              <Package className="w-5 h-5 text-gray-500" />
              <p className="font-semibold">Suivre ma commande</p>
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
          </nav>
        )}
      </div>
    </header>
  )
}
