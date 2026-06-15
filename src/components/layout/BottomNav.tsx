'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Tag, ShoppingCart, User } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { useState, useEffect } from 'react'

const tabs = [
  { href: '/',        icon: Home,         label: 'Accueil'   },
  { href: '/search',  icon: Search,       label: 'Recherche' },
  { href: '/deals',   icon: Tag,          label: 'Promos'    },
  { href: '/cart',    icon: ShoppingCart, label: 'Panier',   badge: true },
  { href: '/profile', icon: User,         label: 'Compte'    },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { itemCount, toggleCart } = useCartStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const cartCount = itemCount()

  // Hide on seller/admin/store pages
  if (
    pathname.startsWith('/seller') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/store/') ||
    pathname.startsWith('/shop/')
  ) return null

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-white border-t border-gray-100 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-stretch h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isCart = tab.badge
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
          const count = mounted && isCart ? cartCount : 0

          if (isCart) {
            return (
              <button
                key={tab.href}
                onClick={() => toggleCart()}
                aria-label={`${tab.label}${count > 0 ? ` (${count})` : ''}`}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {tab.label}
                </span>
              </button>
            )
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              className="flex-1 flex flex-col items-center justify-center gap-0.5"
            >
              <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
              <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-indigo-600' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
