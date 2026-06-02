'use client'

import { useState } from 'react'
import { Search, Eye, ChevronDown } from 'lucide-react'
import { niches } from '@/lib/data/niches'
import { formatPrice } from '@/lib/utils'

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

interface MockOrder {
  id: string
  customer: string
  phone: string
  wilaya: string
  niche: string
  items: number
  total: number
  status: OrderStatus
  payment: 'cash' | 'card'
  date: string
}

const MOCK_ORDERS: MockOrder[] = [
  { id: '#ORD-1041', customer: 'Mohammed Amiri', phone: '0555 001 234', wilaya: 'Alger', niche: 'cars', items: 3, total: 18400, status: 'delivered', payment: 'cash', date: '2024-12-28' },
  { id: '#ORD-1040', customer: 'Samira Kaci', phone: '0661 234 567', wilaya: 'Oran', niche: 'kids', items: 2, total: 34500, status: 'shipped', payment: 'card', date: '2024-12-27' },
  { id: '#ORD-1039', customer: 'Youcef Belkadi', phone: '0770 987 654', wilaya: 'Constantine', niche: 'animals', items: 4, total: 14300, status: 'confirmed', payment: 'cash', date: '2024-12-27' },
  { id: '#ORD-1038', customer: 'Fatima Zahra', phone: '0550 111 222', wilaya: 'Sétif', niche: 'kids', items: 1, total: 9800, status: 'pending', payment: 'cash', date: '2024-12-26' },
  { id: '#ORD-1037', customer: 'Karim Madjid', phone: '0699 333 444', wilaya: 'Annaba', niche: 'cars', items: 2, total: 22100, status: 'delivered', payment: 'card', date: '2024-12-25' },
  { id: '#ORD-1036', customer: 'Amina Boudour', phone: '0555 777 888', wilaya: 'Béjaïa', niche: 'animals', items: 3, total: 27500, status: 'delivered', payment: 'cash', date: '2024-12-24' },
  { id: '#ORD-1035', customer: 'Djamel Haddad', phone: '0770 444 555', wilaya: 'Blida', niche: 'cars', items: 1, total: 8900, status: 'cancelled', payment: 'cash', date: '2024-12-24' },
  { id: '#ORD-1034', customer: 'Nadia Ferhat', phone: '0661 666 777', wilaya: 'Tizi Ouzou', niche: 'kids', items: 5, total: 42000, status: 'shipped', payment: 'card', date: '2024-12-23' },
]

const STATUS_CONFIG: Record<OrderStatus, { label: string; style: string; next?: OrderStatus }> = {
  pending:   { label: 'Pending',   style: 'bg-amber-100 text-amber-700',  next: 'confirmed' },
  confirmed: { label: 'Confirmed', style: 'bg-blue-100 text-blue-700',    next: 'shipped' },
  shipped:   { label: 'Shipped',   style: 'bg-indigo-100 text-indigo-700', next: 'delivered' },
  delivered: { label: 'Delivered', style: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', style: 'bg-red-100 text-red-700' },
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState(MOCK_ORDERS)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<OrderStatus | ''>('')
  const [selectedOrder, setSelectedOrder] = useState<MockOrder | null>(null)

  const filtered = orders.filter((o) => {
    const matchSearch = o.id.includes(search) || o.customer.toLowerCase().includes(search.toLowerCase()) || o.wilaya.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || o.status === filterStatus
    return matchSearch && matchStatus
  })

  const advanceStatus = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o
        const next = STATUS_CONFIG[o.status].next
        return next ? { ...o, status: next } : o
      })
    )
  }

  const totalRevenue = filtered.reduce((sum, o) => sum + o.total, 0)

  const statusCounts = Object.keys(STATUS_CONFIG).reduce((acc, s) => ({
    ...acc,
    [s]: orders.filter((o) => o.status === s).length,
  }), {} as Record<string, number>)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Orders</h1>
        <p className="text-gray-500 text-sm mt-1">
          {filtered.length} orders · {formatPrice(totalRevenue)} revenue
        </p>
      </div>

      {/* Status Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilterStatus('')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${!filterStatus ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50'}`}
        >
          All ({orders.length})
        </button>
        {(Object.entries(STATUS_CONFIG) as [OrderStatus, typeof STATUS_CONFIG[OrderStatus]][]).map(([status, { label }]) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filterStatus === status ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 shadow-sm hover:bg-gray-50'}`}
          >
            {label} ({statusCounts[status] || 0})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order ID, customer, or wilaya…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Order', 'Customer', 'Wilaya', 'Niche', 'Items', 'Total', 'Payment', 'Status', 'Date', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((order) => {
                const niche = niches.find((n) => n.id === order.niche)
                const statusCfg = STATUS_CONFIG[order.status]
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-indigo-600">{order.id}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900">{order.customer}</p>
                      <p className="text-xs text-gray-400">{order.phone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700">{order.wilaya}</td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1.5">{niche?.emoji} {niche?.name.split(' ')[0]}</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 font-medium">{order.items}</td>
                    <td className="px-5 py-3.5 font-bold text-gray-900">{formatPrice(order.total)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-1 rounded-lg text-xs font-semibold capitalize ${order.payment === 'cash' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'}`}>
                        {order.payment === 'cash' ? '💵 Cash' : '💳 Card'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${statusCfg.style}`}>
                          {statusCfg.label}
                        </span>
                        {statusCfg.next && (
                          <button
                            onClick={() => advanceStatus(order.id)}
                            title={`Mark as ${STATUS_CONFIG[statusCfg.next!].label}`}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{order.date}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-500">No orders found</div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-gray-900">{selectedOrder.id}</h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_CONFIG[selectedOrder.status].style}`}>
                {STATUS_CONFIG[selectedOrder.status].label}
              </span>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Customer', value: selectedOrder.customer },
                { label: 'Phone', value: selectedOrder.phone },
                { label: 'Wilaya', value: selectedOrder.wilaya },
                { label: 'Niche', value: `${niches.find((n) => n.id === selectedOrder.niche)?.emoji} ${niches.find((n) => n.id === selectedOrder.niche)?.name}` },
                { label: 'Items', value: selectedOrder.items },
                { label: 'Total', value: formatPrice(selectedOrder.total) },
                { label: 'Payment', value: selectedOrder.payment === 'cash' ? '💵 Cash on Delivery' : '💳 Card' },
                { label: 'Date', value: selectedOrder.date },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-900">{String(value)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-6">
              {STATUS_CONFIG[selectedOrder.status].next && (
                <button
                  onClick={() => { advanceStatus(selectedOrder.id); setSelectedOrder(null) }}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
                >
                  Mark as {STATUS_CONFIG[STATUS_CONFIG[selectedOrder.status].next!].label}
                </button>
              )}
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
