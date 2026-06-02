'use client'

import Link from 'next/link'
import { Package, ArrowRight, ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

const MOCK_USER_ORDERS = [
  {
    id: '#ORD-1041',
    date: '28 Dec 2024',
    status: 'delivered' as const,
    items: [
      { name: 'HD Dash Cam 4K WiFi', qty: 1, price: 8900 },
      { name: 'Magnetic Car Phone Holder', qty: 2, price: 1500 },
    ],
    total: 11900,
  },
  {
    id: '#ORD-1035',
    date: '15 Dec 2024',
    status: 'shipped' as const,
    items: [
      { name: 'Premium Dry Dog Food 15kg', qty: 1, price: 5500 },
    ],
    total: 5500,
  },
]

const STATUS_STYLES = {
  pending:   { label: 'Pending',   style: 'bg-amber-100 text-amber-700' },
  confirmed: { label: 'Confirmed', style: 'bg-blue-100 text-blue-700' },
  shipped:   { label: 'Shipped',   style: 'bg-indigo-100 text-indigo-700' },
  delivered: { label: 'Delivered', style: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', style: 'bg-red-100 text-red-700' },
}

export default function OrdersPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-black text-gray-900">My Orders</h1>
        <Link href="/" className="text-sm text-indigo-600 font-semibold hover:underline">
          Continue shopping
        </Link>
      </div>

      {MOCK_USER_ORDERS.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
          <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="font-semibold text-gray-700 mb-2">No orders yet</p>
          <Link href="/" className="text-indigo-600 text-sm font-semibold hover:underline">
            Start shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {MOCK_USER_ORDERS.map((order) => {
            const statusCfg = STATUS_STYLES[order.status]
            return (
              <div key={order.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-indigo-600">{order.id}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusCfg.style}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Placed on {order.date}</p>
                  </div>
                  <span className="font-black text-gray-900 text-lg">{formatPrice(order.total)}</span>
                </div>

                <div className="space-y-2 border-t border-gray-100 pt-4">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">{item.name}</span>
                        {item.qty > 1 && <span className="text-gray-400">×{item.qty}</span>}
                      </div>
                      <span className="font-semibold text-gray-900">{formatPrice(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>

                {order.status === 'shipped' && (
                  <div className="mt-4 bg-indigo-50 rounded-xl px-4 py-3 text-sm text-indigo-700 font-medium flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Your order is on its way! Expected delivery in 1–2 days.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 bg-white rounded-2xl p-6 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-3">Need help with an order?</h2>
        <p className="text-sm text-gray-500 mb-4">Contact our customer support team and we&apos;ll assist you right away.</p>
        <div className="flex gap-3">
          <a
            href="tel:+213555000000"
            className="flex-1 flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            📞 Call Support
          </a>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Shop More <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
