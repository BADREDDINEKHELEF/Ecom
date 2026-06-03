'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Eye, ChevronDown, Loader2, RefreshCw,
  MessageCircle, Truck, ExternalLink, X, Check,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { getAllOrders, updateOrderStatus, OrderRow } from '@/lib/supabase/queries'
import { buildWhatsAppLink } from '@/lib/whatsapp/messages'
import { DELIVERY_PROVIDERS, getProvider } from '@/lib/delivery/providers'

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

function itemsString(order: OrderRow): string {
  if (!order.order_items || order.order_items.length === 0) return 'Colis'
  return order.order_items.map((i) => `${i.product_name} x${i.quantity}`).join(', ')
}

// ─── Ship Modal ────────────────────────────────────────────────────────────────

interface ShipModalProps {
  order: OrderRow
  onClose: () => void
  onShipped: (orderId: string, tracking: string, provider: string) => void
}

function ShipModal({ order, onClose, onShipped }: ShipModalProps) {
  const [provider, setProvider] = useState('yalidine')
  const [tracking, setTracking] = useState('')
  const [autoCreate, setAutoCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sendWA, setSendWA] = useState(true)

  const selectedProvider = getProvider(provider)

  const handleShip = async () => {
    if (!autoCreate && !tracking.trim()) {
      setError('Enter a tracking number or use auto-create')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/delivery/shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          provider,
          tracking: tracking.trim() || undefined,
          autoCreate: autoCreate && provider === 'yalidine',
          orderData: {
            orderId: order.id,
            fullName: order.full_name,
            phone: order.phone,
            address: order.address,
            city: order.city,
            wilaya: order.wilaya,
            total: order.total,
            items: itemsString(order),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      const finalTracking = data.tracking as string
      onShipped(order.id, finalTracking, provider)

      if (sendWA) {
        const waLink = buildWhatsAppLink({
          id: order.id,
          fullName: order.full_name,
          phone: order.phone,
          wilaya: order.wilaya,
          total: order.total,
          status: 'shipped',
          items: itemsString(order),
          yalidineTracking: finalTracking,
        })
        window.open(waLink, '_blank')
      }

      onClose()
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-black text-gray-900">Ship Order</h2>
            <p className="text-sm text-gray-500 font-mono">{order.id.slice(0, 8).toUpperCase()} — {order.full_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Provider Select */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Delivery Provider</label>
          <div className="grid grid-cols-2 gap-2">
            {DELIVERY_PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setProvider(p.id); setAutoCreate(false) }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  provider === p.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Yalidine auto-create */}
        {provider === 'yalidine' && (
          <div className="mb-4">
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-orange-50 border border-orange-200">
              <input
                type="checkbox"
                checked={autoCreate}
                onChange={(e) => { setAutoCreate(e.target.checked); setTracking('') }}
                className="w-4 h-4 accent-orange-500"
              />
              <div>
                <p className="text-sm font-semibold text-orange-800">Auto-create shipment via API</p>
                <p className="text-xs text-orange-600">Requires YALIDINE_API_ID + YALIDINE_API_TOKEN env vars</p>
              </div>
            </label>
          </div>
        )}

        {/* Tracking input */}
        {!autoCreate && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tracking Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="Enter tracking number…"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400"
              />
              {selectedProvider?.dashboardUrl && (
                <a
                  href={selectedProvider.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  title={`Open ${selectedProvider.name} dashboard`}
                >
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </a>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Create the shipment on {selectedProvider?.name} first, then paste the tracking number here.
            </p>
          </div>
        )}

        {/* WhatsApp notification */}
        <label className="flex items-center gap-3 cursor-pointer mb-5">
          <input
            type="checkbox"
            checked={sendWA}
            onChange={(e) => setSendWA(e.target.checked)}
            className="w-4 h-4 accent-green-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Open WhatsApp to notify customer after shipping
          </span>
        </label>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl mb-4">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleShip}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
            {autoCreate ? 'Create & Ship' : 'Mark as Shipped'}
          </button>
          <button
            onClick={onClose}
            className="px-5 border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<OrderStatus | ''>('')
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [shipOrder, setShipOrder] = useState<OrderRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAllOrders(0)
      setOrders(result.orders)
      setHasMore(result.hasMore)
      setPage(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const result = await getAllOrders(nextPage)
      setOrders((prev) => [...prev, ...result.orders])
      setHasMore(result.hasMore)
      setPage(nextPage)
    } finally {
      setLoadingMore(false)
    }
  }

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
    if (next === 'shipped') { setShipOrder(orders.find((o) => o.id === orderId) ?? null); return }
    setAdvancing(orderId)
    try {
      await updateOrderStatus(orderId, next)
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: next } : o))
      if (selectedOrder?.id === orderId) setSelectedOrder((o) => o ? { ...o, status: next } : o)
    } finally {
      setAdvancing(null)
    }
  }

  const handleShipped = (orderId: string, tracking: string, provider: string) => {
    setOrders((prev) => prev.map((o) =>
      o.id === orderId
        ? { ...o, status: 'shipped', yalidine_tracking: tracking, delivery_provider: provider }
        : o
    ))
    if (selectedOrder?.id === orderId) {
      setSelectedOrder((o) => o ? { ...o, status: 'shipped', yalidine_tracking: tracking, delivery_provider: provider } : o)
    }
  }

  const openWA = (order: OrderRow) => {
    const link = buildWhatsAppLink({
      id: order.id,
      fullName: order.full_name,
      phone: order.phone,
      wilaya: order.wilaya,
      total: order.total,
      status: order.status,
      items: itemsString(order),
      yalidineTracking: order.yalidine_tracking,
    })
    window.open(link, '_blank')
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
            placeholder="Search by ID, name, phone, or wilaya…"
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
                  {['Order ID', 'Customer', 'Wilaya', 'Items', 'Total', 'Payment', 'Status', 'Tracking', 'Date', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((order) => {
                  const status = (order.status as OrderStatus) in STATUS_CONFIG ? order.status as OrderStatus : 'pending'
                  const statusCfg = STATUS_CONFIG[status]
                  const itemCount = order.order_items?.length ?? 0
                  const isAdvancing = advancing === order.id
                  const provider = order.delivery_provider ? getProvider(order.delivery_provider) : undefined
                  const trackingUrl = provider?.trackingUrl && order.yalidine_tracking
                    ? `${provider.trackingUrl}${order.yalidine_tracking}`
                    : undefined

                  return (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-indigo-600 text-xs">
                        {order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-900">{order.full_name}</p>
                        <p className="text-xs text-gray-400">{order.phone}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-700">{order.wilaya}</td>
                      <td className="px-4 py-3.5 text-gray-700 font-medium">{itemCount}</td>
                      <td className="px-4 py-3.5 font-bold text-gray-900">{formatPrice(order.total)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${order.payment_method === 'cash' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-600'}`}>
                          {order.payment_method === 'cash' ? '💵 Cash' : `💳 ${order.payment_method}`}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusCfg.style}`}>
                            {statusCfg.label}
                          </span>
                          {statusCfg.next && statusCfg.next !== 'shipped' && (
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
                      <td className="px-4 py-3.5">
                        {order.yalidine_tracking ? (
                          <div className="flex items-center gap-1.5">
                            {provider && (
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: provider.color }} />
                            )}
                            {trackingUrl ? (
                              <a href={trackingUrl} target="_blank" rel="noopener noreferrer"
                                className="font-mono text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                {order.yalidine_tracking}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="font-mono text-xs text-gray-600">{order.yalidine_tracking}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          {/* WhatsApp */}
                          <button
                            onClick={() => openWA(order)}
                            title="Send WhatsApp notification"
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          {/* Ship */}
                          {(status === 'confirmed' || status === 'pending') && (
                            <button
                              onClick={() => setShipOrder(order)}
                              title="Create shipment"
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Truck className="w-4 h-4" />
                            </button>
                          )}
                          {/* Detail */}
                          <button
                            onClick={() => setSelectedOrder(order)}
                            title="View details"
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
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
        {!loading && hasMore && !search && !filterStatus && (
          <div className="px-6 py-4 border-t border-gray-100 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-sm text-indigo-600 font-semibold hover:underline disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more orders'}
            </button>
          </div>
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
              {selectedOrder.yalidine_tracking && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tracking</span>
                  <div className="flex items-center gap-1.5">
                    {selectedOrder.delivery_provider && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: getProvider(selectedOrder.delivery_provider)?.color ?? '#6b7280' }}>
                        {getProvider(selectedOrder.delivery_provider)?.name ?? selectedOrder.delivery_provider}
                      </span>
                    )}
                    <span className="font-mono font-semibold text-gray-900">{selectedOrder.yalidine_tracking}</span>
                  </div>
                </div>
              )}
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
              <button
                onClick={() => openWA(selectedOrder)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold hover:bg-green-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
              {(selectedOrder.status === 'confirmed' || selectedOrder.status === 'pending') && (
                <button
                  onClick={() => { setShipOrder(selectedOrder); setSelectedOrder(null) }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
                >
                  <Truck className="w-4 h-4" />
                  Ship
                </button>
              )}
              {STATUS_CONFIG[selectedOrder.status as OrderStatus]?.next &&
               STATUS_CONFIG[selectedOrder.status as OrderStatus]?.next !== 'shipped' && (
                <button
                  onClick={() => advanceStatus(selectedOrder.id, selectedOrder.status)}
                  disabled={advancing === selectedOrder.id}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {advancing === selectedOrder.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Mark {STATUS_CONFIG[STATUS_CONFIG[selectedOrder.status as OrderStatus]!.next!].label}
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

      {/* Ship Modal */}
      {shipOrder && (
        <ShipModal
          order={shipOrder}
          onClose={() => setShipOrder(null)}
          onShipped={handleShipped}
        />
      )}
    </div>
  )
}
