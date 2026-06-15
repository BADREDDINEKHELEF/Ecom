'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Store,
  ExternalLink, Truck, BarChart2, MessageSquare, CreditCard,
  Tag, BookOpen, ChevronDown, Zap, Crown, Layers, X,
} from 'lucide-react'
import { useT, useRTL, useLangStore } from '@/lib/store/langStore'
import { useState } from 'react'
import NotificationBell from './NotificationBell'

interface Props {
  storeName: string
  slug: string
  onLogout: () => void
  logoUrl?: string | null
  pendingOrders?: number
  unreadMessages?: number
  subscriptionStatus?: string | null
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export default function SellerSidebar({
  storeName, slug, onLogout, logoUrl,
  pendingOrders = 0, unreadMessages = 0, subscriptionStatus,
  isMobileOpen = false, onMobileClose,
}: Props) {
  const pathname = usePathname()
  const t = useT()
  const isRTL = useRTL()
  const { lang, setLang } = useLangStore()
  const sd = t.sellerDash
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
      <Link
        href={href}
        onClick={onMobileClose}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          active ? 'bg-emerald-600/20 text-emerald-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
        }`}
      >
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
    <>
      {/* Backdrop — mobile only */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        dir={isRTL ? 'rtl' : 'ltr'}
        className={[
          'w-64 bg-gray-950 text-gray-300 flex flex-col flex-shrink-0 fixed h-full z-40 overflow-y-auto transition-transform duration-300 ease-in-out',
          isRTL ? 'right-0' : 'left-0',
          // Mobile: slide in/out. Desktop: always visible.
          isMobileOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full'),
          'lg:translate-x-0',
        ].join(' ')}
      >
        {/* Store header */}
        <div className="p-5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-emerald-600 flex items-center justify-center">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={storeName} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-4 h-4 text-white" />
              )}
            </div>
            <span className="font-bold text-white text-sm truncate flex-1">{storeName}</span>
            <NotificationBell />
            {/* Close button — mobile only */}
            <button
              onClick={onMobileClose}
              className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors flex-shrink-0"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 ms-10">
            <span className="text-xs text-gray-500">{t.sellerDash.sellerDashboard}</span>
            {subscriptionStatus && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                subscriptionStatus === 'active'       ? 'bg-emerald-500/20 text-emerald-400' :
                subscriptionStatus === 'trial'        ? 'bg-blue-500/20 text-blue-400' :
                subscriptionStatus === 'grace_period' ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {subscriptionStatus === 'active' ? 'PRO' : subscriptionStatus === 'trial'
                ? (lang === 'ar' ? 'تجريبي' : 'TRIAL')
                : (lang === 'ar' ? 'منتهي' : 'EXPIRED')}
              </span>
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 flex flex-col overflow-y-auto">
          <div className="flex-1 space-y-0.5">
            <LinkItem href="/seller/dashboard" label={sd.dashboard} icon={LayoutDashboard} exact />

            <div className="pt-2 pb-1">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1">{sd.catCatalogue}</p>
            </div>
            <LinkItem href="/seller/stores"     label={sd.stores}      icon={Layers} />
            <LinkItem href="/seller/products"   label={sd.myProducts}  icon={Package} />
            <LinkItem href="/seller/promotions" label={sd.promotions}  icon={Tag} />

            <div className="pt-2 pb-1">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1">{sd.catSales}</p>
            </div>
            <LinkItem href="/seller/orders"     label={sd.myOrders}    icon={ShoppingBag} badge={pendingOrders} />
            <LinkItem href="/seller/deliveries" label={sd.deliveries}  icon={Truck} />
            <LinkItem href="/seller/messages"   label={sd.messages}    icon={MessageSquare} badge={unreadMessages} />
            <LinkItem href="/seller/payouts"    label={sd.payouts}     icon={CreditCard} />

            <div className="pt-2 pb-1">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1">{sd.catGrowth}</p>
            </div>
            <LinkItem href="/seller/sponsored"    label={sd.sponsored}        icon={Zap} />
            <LinkItem href="/seller/subscription" label={sd.mySubscription}   icon={Crown} />

            <div className="pt-2 pb-1">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1">{sd.catAnalytics}</p>
            </div>
            <LinkItem href="/seller/analytics" label={sd.analytics}  icon={BarChart2} />
            <LinkItem href="/seller/academy"   label={sd.academy}    icon={BookOpen} />

            {/* Settings collapsible */}
            <div className="pt-2 pb-1">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-3 mb-1">{sd.catSettings}</p>
            </div>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/seller/settings') ? 'bg-emerald-600/20 text-emerald-400' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Settings className={`w-4 h-4 flex-shrink-0 ${isActive('/seller/settings') ? 'text-emerald-400' : 'text-gray-500'}`} />
              <span className="flex-1 text-start">{sd.storeSettings}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
            </button>
            {settingsOpen && (
              <div className="ms-7 space-y-0.5">
                <Link
                  href="/seller/settings"
                  onClick={onMobileClose}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/seller/settings' ? 'text-emerald-400 bg-emerald-600/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {sd.settingsStore}
                </Link>
                <Link
                  href="/seller/settings/delivery"
                  onClick={onMobileClose}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    pathname === '/seller/settings/delivery' ? 'text-emerald-400 bg-emerald-600/10' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <Truck className="w-3 h-3" /> {sd.settingsDelivery}
                </Link>
              </div>
            )}
          </div>

          {/* Bottom actions */}
          <div className="space-y-0.5 pt-2 border-t border-gray-800 flex-shrink-0">
            {/* Language switcher */}
            <div className="flex items-center gap-0.5 bg-gray-800 rounded-lg p-0.5 mx-1 mb-1">
              {(['ar', 'fr', 'en'] as const).map((code) => {
                const LANG_LABELS: Record<string, string> = { ar: '🇩🇿 عربي', fr: '🇫🇷 FR', en: '🇬🇧 EN' }
                return (
                  <button
                    key={code}
                    onClick={() => setLang(code)}
                    className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                      lang === code ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {LANG_LABELS[code]}
                  </button>
                )
              })}
            </div>
            <a
              href={`/store/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-gray-500" />
              {t.sellerDash.viewMyStore}
            </a>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4 text-gray-500" />
              {t.sellerDash.logout}
            </button>
          </div>
        </nav>
      </aside>
    </>
  )
}
