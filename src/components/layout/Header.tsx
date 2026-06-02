'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Search, Menu, X, ChevronDown, Heart, Tag, User } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { useWishlistStore } from '@/lib/store/wishlistStore'
import { useT } from '@/lib/store/langStore'
import { niches } from '@/lib/data/niches'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import Logo from '@/components/ui/Logo'

export default function Header() {
  const { toggleCart, itemCount } = useCartStore()
  const wishlistCount = useWishlistStore((s) => s.items.length)
  const cartCount = itemCount()
  const t = useT()
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  const [nichesOpen, setNichesOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const router = useRouter()
  const searchRef = useRef<HTMLInputElement>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchValue.trim())}`)
      setSearchValue('')
      searchRef.current?.blur()
    }
  }

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
            <div className="relative">
              <button
                onClick={() => setNichesOpen(!nichesOpen)}
                onBlur={() => setTimeout(() => setNichesOpen(false), 150)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {t.nav.shop}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${nichesOpen ? 'rotate-180' : ''}`} />
              </button>
              {nichesOpen && (
                <div className="absolute top-full left-0 mt-1 w-60 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-fade-in">
                  {niches.map((niche) => (
                    <Link
                      key={niche.id}
                      href={`/${niche.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-xl">{niche.emoji}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{niche.name}</p>
                        <p className="text-xs text-gray-500">{niche.categories.length} {t.home.categories}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {niches.map((niche) => (
              <Link
                key={niche.id}
                href={`/${niche.id}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <span>{niche.emoji}</span>
                {niche.name.split(' ')[0]}
              </Link>
            ))}
            <Link
              href="/deals"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
              <Tag className="w-3.5 h-3.5" /> {t.nav.deals}
            </Link>
          </nav>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1.5">
            {/* Language switcher */}
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="hidden sm:flex items-center relative">
              <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={t.nav.search}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-36 focus:w-52 transition-all duration-200 focus:outline-none focus:border-indigo-400 bg-gray-50 focus:bg-white"
              />
            </form>

            {/* Wishlist */}
            <Link href="/wishlist" className="relative p-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors">
              <Heart className="w-5 h-5" />
              {mounted && wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <button
              onClick={() => toggleCart()}
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
            <Link href="/profile" className="hidden sm:flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-indigo-600" />
              </div>
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1 animate-fade-in">
            {niches.map((niche) => (
              <Link
                key={niche.id}
                href={`/${niche.id}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl">{niche.emoji}</span>
                <div>
                  <p className="font-semibold text-gray-900">{niche.name}</p>
                  <p className="text-xs text-gray-500">{niche.description}</p>
                </div>
              </Link>
            ))}
            <Link
              href="/deals"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition-colors"
            >
              <span className="text-2xl">🏷️</span>
              <p className="font-semibold text-red-600">{t.nav.deals}</p>
            </Link>
            {/* Mobile search */}
            <form onSubmit={(e) => { handleSearch(e); setMenuOpen(false) }} className="px-4 pt-2 pb-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={t.nav.search}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
            </form>
            {/* Language switcher mobile */}
            <div className="px-4 py-2">
              <LanguageSwitcher />
            </div>
            <div className="pt-2 border-t border-gray-100 flex gap-3 px-4">
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex-1 text-center py-2.5 font-semibold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm transition-colors"
              >
                {t.nav.profile}
              </Link>
              <Link
                href="/auth"
                onClick={() => setMenuOpen(false)}
                className="flex-1 text-center py-2.5 font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 text-sm transition-colors"
              >
                {t.nav.signIn}
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
