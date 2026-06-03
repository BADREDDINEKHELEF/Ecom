'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Store, ExternalLink } from 'lucide-react'
import { useT } from '@/lib/store/langStore'

interface Props {
  storeName: string
  slug: string
  onLogout: () => void
}

export default function SellerSidebar({ storeName, slug, onLogout }: Props) {
  const pathname = usePathname()
  const t = useT()

  const NAV = [
    { href: '/seller/dashboard', label: t.sellerDash.dashboard,      icon: LayoutDashboard },
    { href: '/seller/products',  label: t.sellerDash.myProducts,     icon: Package },
    { href: '/seller/orders',    label: t.sellerDash.myOrders,       icon: ShoppingBag },
    { href: '/seller/settings',  label: t.sellerDash.storeSettings,  icon: Settings },
  ]

  return (
    <aside className="w-60 bg-gray-950 text-gray-300 flex flex-col flex-shrink-0 fixed h-full z-20">
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Store className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm truncate">{storeName}</span>
        </div>
        <span className="text-xs text-gray-500 ml-10">{t.sellerDash.sellerDashboard}</span>
      </div>
      <nav className="flex-1 p-3 flex flex-col">
        <div className="flex-1 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}>
                <Icon className={`w-4 h-4 ${active ? 'text-emerald-400' : 'text-gray-500'}`} />
                {label}
              </Link>
            )
          })}
        </div>
        <div className="space-y-0.5 pt-2 border-t border-gray-800">
          <a href={`/shop/${slug}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            <ExternalLink className="w-4 h-4 text-gray-500" />
            {t.sellerDash.viewMyStore}
          </a>
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            <LogOut className="w-4 h-4 text-gray-500" />
            {t.sellerDash.logout}
          </button>
        </div>
      </nav>
    </aside>
  )
}
