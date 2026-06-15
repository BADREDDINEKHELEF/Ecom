'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2, TrendingUp, Store, Users, Truck, DollarSign, Search, MapPin,
} from 'lucide-react'

const NAV = [
  { href: '/admin/analytics',          label: 'Vue d\'ensemble',       icon: BarChart2   },
  { href: '/admin/analytics/overview', label: 'Temps réel',            icon: TrendingUp  },
  { href: '/admin/analytics/revenue',  label: 'Revenus & Commissions', icon: DollarSign  },
  { href: '/admin/analytics/sellers',  label: 'Vendeurs',              icon: Store       },
  { href: '/admin/analytics/customers',label: 'Clients & Rétention',   icon: Users       },
  { href: '/admin/analytics/delivery', label: 'Livraison SLA',         icon: Truck       },
  { href: '/admin/analytics/cod',      label: 'COD par wilaya',        icon: MapPin      },
  { href: '/admin/analytics/search',   label: 'Recherches',            icon: Search      },
]

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sub-nav bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="px-4 sm:px-8 overflow-x-auto">
          <div className="flex items-center gap-0.5 h-12 min-w-max">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/admin/analytics' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
