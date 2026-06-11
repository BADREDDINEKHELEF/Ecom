'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Package, ShoppingBag, Users, Settings, TrendingUp, LogOut, Tag, Store, Layers, ShoppingCart, CreditCard, Zap, RotateCcw } from 'lucide-react'

const NAV = [
  { href: '/admin',                label: 'Dashboard',     icon: LayoutDashboard, exact: true },
  { href: '/admin/niches',         label: 'Niches',        icon: Layers },
  { href: '/admin/products',       label: 'Products',      icon: Package },
  { href: '/admin/orders',         label: 'Orders',        icon: ShoppingBag,  badge: true },
  { href: '/admin/returns',        label: 'Retours',       icon: RotateCcw },
  { href: '/admin/abandoned',      label: 'Abandoned',     icon: ShoppingCart },
  { href: '/admin/customers',      label: 'Customers',     icon: Users },
  { href: '/admin/vendors',        label: 'Vendors',       icon: Store },
  { href: '/admin/subscriptions',  label: 'Subscriptions', icon: CreditCard },
  { href: '/admin/promotions',     label: 'Promotions',    icon: Zap },
  { href: '/admin/promo',          label: 'Promo Codes',   icon: Tag },
  { href: '/admin/analytics',      label: 'Analytics',     icon: TrendingUp },
  { href: '/admin/settings',       label: 'Settings',      icon: Settings },
]

export default function AdminNav({ onNavClick }: { onNavClick?: () => void } = {}) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [pending, setPending] = useState(0)

  useEffect(() => {
    let cancelled = false

    const fetchPending = () => {
      fetch('/api/admin/orders?countOnly=1')
        .then((r) => r.json())
        .then((d) => { if (!cancelled) setPending(d.pending ?? 0) })
        .catch(() => {})
    }

    fetchPending()
    const interval = setInterval(fetchPending, 60_000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <nav className="flex-1 p-3 space-y-0.5 flex flex-col">
      <div className="flex-1 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact, badge }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href} onClick={onNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 transition-colors flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
              <span className="flex-1">{label}</span>
              {badge && pending > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                  {pending > 99 ? '99+' : pending}
                </span>
              )}
            </Link>
          )
        })}
      </div>
      <button onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors mt-2">
        <LogOut className="w-4 h-4 text-gray-500 flex-shrink-0" />
        Logout
      </button>
    </nav>
  )
}
