'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, Users, Settings, ArrowLeft, TrendingUp } from 'lucide-react'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 p-3 space-y-0.5">
      {NAV.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-gray-500'}`} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
