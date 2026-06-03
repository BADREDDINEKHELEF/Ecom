'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, ArrowRight, ShoppingBag, Search, Loader2, Phone } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { getOrdersByPhone, OrderRow } from '@/lib/supabase/queries'
import { useT } from '@/lib/store/langStore'

function formatDate(iso: string, lang: string) {
  const locale = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-DZ' : 'en-GB'
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function OrdersPage() {
  const t = useT()
  const [phone, setPhone] = useState('')
  const [orders, setOrders] = useState<OrderRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const STATUS_STYLES: Record<string, { label: string; style: string }> = {
    pending:   { label: t.orders.status.pending,   style: 'bg-amber-100 text-amber-700' },
    confirmed: { label: t.orders.status.confirmed, style: 'bg-blue-100 text-blue-700' },
    shipped:   { label: t.orders.status.shipped,   style: 'bg-indigo-100 text-indigo-700' },
    delivered: { label: t.orders.status.delivered, style: 'bg-green-100 text-green-700' },
    cancelled: { label: t.orders.status.cancelled, style: 'bg-red-100 text-red-700' },
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await getOrdersByPhone(phone)
      setOrders(result)
    } catch {
      setError(t.orders.loadError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-gray-900">{t.orders.title}</h1>
        <Link href="/" className="text-sm text-indigo-600 font-semibold hover:underline">
          {t.orders.continueShopping}
        </Link>
      </div>

      {/* Phone lookup */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <p className="text-sm text-gray-500 mb-4">{t.orders.phoneHint}</p>
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0555 00 00 00"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !phone.trim()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {t.orders.searchBtn}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {/* Results */}
      {orders !== null && (
        orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
            <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="font-semibold text-gray-700 mb-2">{t.orders.noOrders}</p>
            <Link href="/" className="text-indigo-600 text-sm font-semibold hover:underline">
              {t.orders.startShopping}
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusCfg = STATUS_STYLES[order.status] ?? { label: order.status, style: 'bg-gray-100 text-gray-700' }
              const items = order.order_items || []
              return (
                <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-indigo-600 text-sm">
                          {order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusCfg.style}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{t.orders.placedOn} {formatDate(order.created_at, 'fr')}</p>
                    </div>
                    <span className="font-black text-gray-900 text-lg">{formatPrice(order.total)}</span>
                  </div>

                  <div className="space-y-2 border-t border-gray-100 pt-4">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="text-gray-700">{item.product_name}</span>
                          {item.quantity > 1 && <span className="text-gray-400">×{item.quantity}</span>}
                        </div>
                        <span className="font-semibold text-gray-900">{formatPrice(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                    <span>{order.city}, {order.wilaya}</span>
                    <span className="capitalize">
                      {order.payment_method === 'cash' ? t.orders.cashOnDelivery : '💳 ' + order.payment_method}
                    </span>
                  </div>

                  {order.status === 'shipped' && (
                    <div className="mt-4 bg-indigo-50 rounded-xl px-4 py-3 text-sm text-indigo-700 font-medium flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      {t.orders.onItsWay}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-3">{t.orders.needHelp}</h2>
        <p className="text-sm text-gray-500 mb-4">{t.orders.supportText}</p>
        <div className="flex gap-3">
          <a
            href="tel:+213555000000"
            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t.orders.callSupport}
          </a>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            {t.orders.shopMore} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
