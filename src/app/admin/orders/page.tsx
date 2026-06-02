'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Eye, ChevronDown, Loader2, RefreshCw } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { getAllOrders, updateOrderStatus, OrderRow } from '@/lib/supabase/queries'

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'

const STATUS_CONFIG: Record<OrderStatus, { label: string; style: string; next?: OrderStatus }> = {
  pending:   { label: 'Pending',   style: 'bg-amber-100 text-amber-700',   next: 'confirmed' },
  confirmed: { label: 'Confirmed', style: 'bg-blue-100 text-blue-700',     next: 'shipped' },
  shipped:   { label: 'Shipped',   style: 'bg-indigo-100 text-indigo-700', next: 'delivered' },
  delivered: { label: 'Delivered', style: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', style: 'bg-red-100 text-red-700' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<OrderStatus | ''>('')
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null)
  const [advancing, setAdvancing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setOrders(await getAllOrders())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = orders.filter((o) => {
    const matchSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.full_name.toLowerCase().includes(search.toLowerCase()) ||
      o.phone.includes(search) ||
      o.wilaya.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || o.status === filterStatus
    return matchSearch && matchStatus
  })

  const advanceStatus = async (orderId: string, currentStatus: string) => {
    const next = STATUS_CONFIG[currentStatus as OrderStatus]?.next
    if (!next) return
    setAdvancing(orderId)
    try {
      await updateOrderStatus(orderId, next)
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: next } : o))
      if (selectedOrder?.id === orderId) setSelectedOrder((o) => o ? { ...o, status: next } : o)
    } finally {
      setAdvancing(null)
    }
  }

  const totalRevenue = filtered.reduce((sum, o) => sum + o.total, 0)

  const statusCounts = (Object.keys(STATUS_CONFIG) as OrderStatus[]).reduce((acc, s) => ({
    ...acc,
    [s]: orders.filter((o) => o.status === s).length,
  }), {} as Record<string, number>)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtered.length} orders · {formatPrice(totalRevenue)} revenue
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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
            placeholder="Search by ID, customer name, phone, or wilaya…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading orders…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Order ID', 'Customer', 'Wilaya', 'Items', 'Total', 'Payment', 'Status', 'Date', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((order) => {
                  const status = (order.status as OrderStatus) in STATUS_CONFIG ? order.status as OrderStatus : 'pending'
                  const statusCfg = STATUS_CONFIG[status]
                  const itemCount = order.order_items?.length ?? 0
                  const isAdvancing = advancing === order.id
                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-indigo-600 text-xs">
                        {order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-900">{order.full_name}</p>
                        <p className="text-xs text-gray-400">{order.phone}</p>
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">{order.wilaya}</td>
                      <td className="px-5 py-3.5 text-gray-700 font-medium">{itemCount}</td>
                      <td className="px-5 py-3.5 font-bold text-gray-900">{formatPrice(order.total)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold capitalize ${order.payment_method === 'cash' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'}`}>
                          {order.payment_method === 'cash' ? '💵 Cash' : `💳 ${order.payment_method}`}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${statusCfg.style}`}>
                            {statusCfg.label}
                          </span>
                          {statusCfg.next && (
                            <button
                              onClick={() => advanceStatus(order.id, status)}
                              disabled={isAdvancing}
                              title={`Mark as ${STATUS_CONFIG[statusCfg.next!].label}`}
                              className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                            >
                              {isAdvancing
                                ? <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                                : <ChevronDown className="w-3.5 h-3.5 text-gray-400 -rotate-90" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{formatDate(order.created_at)}</td>
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
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-gray-500">No orders found</div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-gray-900 font-mono">{selectedOrder.id.slice(0, 8).toUpperCase()}</h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_CONFIG[selectedOrder.status as OrderStatus]?.style ?? 'bg-gray-100 text-gray-600'}`}>
                {STATUS_CONFIG[selectedOrder.status as OrderStatus]?.label ?? selectedOrder.status}
              </span>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Customer', value: selectedOrder.full_name },
                { label: 'Phone',    value: selectedOrder.phone },
                { label: 'Address',  value: `${selectedOrder.address}, ${selectedOrder.city}, ${selectedOrder.wilaya}` },
                { label: 'Payment',  value: selectedOrder.payment_method === 'cash' ? '💵 Cash on Delivery' : `💳 ${selectedOrder.payment_method}` },
                { label: 'Subtotal', value: formatPrice(selectedOrder.subtotal) },
                { label: 'Shipping', value: formatPrice(selectedOrder.shipping_cost) },
                { label: 'Total',    value: formatPrice(selectedOrder.total) },
                { label: 'Date',     value: formatDate(selectedOrder.created_at) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-900 text-right max-w-[200px]">{String(value)}</span>
                </div>
              ))}
            </div>
            {selectedOrder.order_items && selectedOrder.order_items.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Items</p>
                <div className="space-y-1.5">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.product_name} ×{item.quantity}</span>
                      <span className="font-semibold">{formatPrice(item.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-6">
              {STATUS_CONFIG[selectedOrder.status as OrderStatus]?.next && (
                <button
                  onClick={() => advanceStatus(selectedOrder.id, selectedOrder.status)}
                  disabled={advancing === selectedOrder.id}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Mark as {STATUS_CONFIG[STATUS_CONFIG[selectedOrder.status as OrderStatus]!.next!].label}
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
