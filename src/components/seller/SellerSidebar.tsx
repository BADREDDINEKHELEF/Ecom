'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Store,
  ExternalLink, Truck, BarChart2, MessageSquare, CreditCard,
  Tag, BookOpen, ChevronDown,
} from 'lucide-react'
import { useT } from '@/lib/store/langStore'
import { useState } from 'react'

interface Props {
  storeName: string
  slug: string
  onLogout: () => void
  pendingOrders?: number
  unreadMessages?: number
}

export default function SellerSidebar({ storeName, slug, onLogout, pendingOrders = 0, unreadMessages = 0 }: Props) {
  const pathname = usePathname()
  const t = useT()
  const [settingsOpen, setSettingsOpen] = useState(
    pathname.startsWith('/seller/settings')
  )

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href)

  const LinkItem = ({
    href, label, icon: Icon, badge, exact = false,
  }: {
    href: string; label: string; icon: React.ElementType; badge?: number; exact?: boolean
  }) => {
    const active = isActive(href, exact)
    return (
      <Link href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          active ? 'bg-emerald-600/20 text-emerald-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        }`}>
        <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-emerald-400' : 'text-gray-500'}`} />
        <span className="flex-1 truncate">{label}</span>
        {badge != null && badge > 0 && (
          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <aside className="w-60 bg-gray-950 text-gray-300 flex flex-col flex-shrink-0 fixed h-full z-20 overflow-y-auto">
      {/* Store header */}
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
          <LinkItem href="/seller/dashboard" label={t.sellerDash.dashboard} icon={LayoutDashboard} exact />

          <div className="pt-2 pb-1">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1">Catalogue</p>
          </div>
          <LinkItem href="/seller/products"  label={t.sellerDash.myProducts}  icon={Package} />
          <LinkItem href="/seller/promotions" label="Promotions"               icon={Tag} />

          <div className="pt-2 pb-1">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1">Ventes</p>
          </div>
          <LinkItem href="/seller/orders"    label={t.sellerDash.myOrders}    icon={ShoppingBag} badge={pendingOrders} />
          <LinkItem href="/seller/deliveries" label="Livraisons"               icon={Truck} />
          <LinkItem href="/seller/messages"  label="Messages"                  icon={MessageSquare} badge={unreadMessages} />
          <LinkItem href="/seller/payouts"   label="Revenus & Paiements"       icon={CreditCard} />

          <div className="pt-2 pb-1">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1">Analyse</p>
          </div>
          <LinkItem href="/seller/analytics" label="Analytiques"               icon={BarChart2} />
          <LinkItem href="/seller/academy"   label="Académie"                  icon={BookOpen} />

          {/* Settings collapsible */}
          <div className="pt-2 pb-1">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1">Paramètres</p>
          </div>
          <button onClick={() => setSettingsOpen(!settingsOpen)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive('/seller/settings') ? 'bg-emerald-600/20 text-emerald-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}>
            <Settings className={`w-4 h-4 flex-shrink-0 ${isActive('/seller/settings') ? 'text-emerald-400' : 'text-gray-500'}`} />
            <span className="flex-1 text-left">{t.sellerDash.storeSettings}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
          </button>
          {settingsOpen && (
            <div className="ml-7 space-y-0.5">
              <Link href="/seller/settings"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  pathname === '/seller/settings' ? 'text-emerald-400 bg-emerald-600/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}>
                Boutique
              </Link>
              <Link href="/seller/settings/delivery"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  pathname === '/seller/settings/delivery' ? 'text-emerald-400 bg-emerald-600/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}>
                <Truck className="w-3 h-3" /> Livraison & API
              </Link>
            </div>
          )}
        </div>

        {/* Bottom actions */}
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
