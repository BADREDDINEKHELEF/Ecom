'use client'

import { useState, useEffect } from 'react'
import { ShoppingBag, Search, Loader2 } from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { getVendorOrders } from '@/lib/supabase/queries'
import { formatPrice } from '@/lib/utils'
import { useT } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'
import type { VendorOrderSummary } from '@/lib/supabase/queries'

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped:   'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function SellerOrdersPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const t = useT()
  const sd = t.sellerDash
  const [orders, setOrders] = useState<VendorOrderSummary[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!vendor) return
    getVendorOrders(vendor.id).then((data) => { setOrders(data); setLoadingOrders(false) })
  }, [vendor])

  const filtered = orders.filter((o) =>
    o.order.full_name.toLowerCase().includes(search.toLowerCase()) ||
    o.order.phone.includes(search) ||
    o.order.wilaya.toLowerCase().includes(search.toLowerCase())
  )

  if (loading || !vendor) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="flex min-h-screen bg-gray-50" dir="ltr">
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut} />
      <main className="flex-1 ml-60 p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900">{sd.myOrders}</h1>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={sd.searchOrders}
            className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 bg-white" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loadingOrders ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> {sd.loadingChart}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{orders.length === 0 ? sd.noOrdersYet : sd.noResults}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(({ order, items, vendorTotal }) => {
                const itemCount = items.length
                return (
                  <div key={order.id}>
                    <button
                      onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 text-left transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 text-sm">{order.full_name}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {t.orders.status[order.status as keyof typeof t.orders.status] ?? order.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{order.phone} · {order.wilaya} · {new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-gray-900">{formatPrice(vendorTotal)}</p>
                        <p className="text-xs text-gray-400">
                          {(itemCount === 1 ? sd.items : sd.itemsPlural).replace('{n}', String(itemCount))}
                        </p>
                      </div>
                    </button>

                    {expanded === order.id && (
                      <div className="px-5 pb-4 bg-gray-50">
                        <div className="divide-y divide-gray-100">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between py-2.5 text-sm">
                              <span className="text-gray-700">{item.product_name} × {item.quantity}</span>
                              <span className="font-semibold text-gray-900">{formatPrice(item.subtotal)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between text-sm font-bold">
                          <span>{sd.yourTotal}</span>
                          <span className="text-emerald-600">{formatPrice(vendorTotal)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {sd.afterCommissionShort.replace('{n}', String(vendor.commission_rate))}: {formatPrice(Math.round(vendorTotal * (1 - vendor.commission_rate / 100)))}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
