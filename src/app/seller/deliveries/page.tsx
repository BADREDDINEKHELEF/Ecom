'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  Truck, Plus, Search, Filter, Download, RefreshCw, ExternalLink,
  X, Check, Loader2, Package, AlertTriangle, ChevronDown, Clock,
  CheckCircle2, XCircle, RotateCcw, Eye, Menu,
} from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { useT, useRTL } from '@/lib/store/langStore'
import { formatPrice } from '@/lib/utils'
import { DELIVERY_PROVIDERS } from '@/lib/delivery/providers'
import { getTrackingUrl } from '@/lib/delivery/dispatch'
import SellerSidebar from '@/components/seller/SellerSidebar'
import type { ShipmentRow, OrderRow, VendorOrderSummary } from '@/lib/supabase/queries'

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  pending:          { label: 'Pending',           icon: Clock,        cls: 'bg-gray-100 text-gray-700' },
  in_transit:       { label: 'In Transit',         icon: Truck,        cls: 'bg-blue-100 text-blue-700' },
  picked_up:        { label: 'Picked Up',          icon: Package,      cls: 'bg-indigo-100 text-indigo-700' },
  out_for_delivery: { label: 'Out for Delivery',   icon: Truck,        cls: 'bg-amber-100 text-amber-700' },
  delivered:        { label: 'Delivered',          icon: CheckCircle2, cls: 'bg-green-100 text-green-700' },
  returned:         { label: 'Returned',           icon: RotateCcw,    cls: 'bg-orange-100 text-orange-700' },
  failed:           { label: 'Failed',             icon: XCircle,      cls: 'bg-red-100 text-red-700' },
  cancelled:        { label: 'Cancelled',          icon: X,            cls: 'bg-gray-100 text-gray-500' },
}

type Tab = 'shipments' | 'pending_orders'

export default function SellerDeliveriesPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const t = useT()
  const isRTL = useRTL()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('shipments')

  // Shipments list
  const [shipments, setShipments] = useState<(ShipmentRow & { orders: OrderRow })[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const [loadingShips, setLoadingShips] = useState(true)

  // Pending orders (no shipment yet)
  const [pendingOrders, setPendingOrders] = useState<VendorOrderSummary[]>([])
  const [loadingPending, setLoadingPending] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [providerFilter, setProviderFilter] = useState('')

  // Create shipment modal
  const [showModal, setShowModal] = useState(false)
  const [modalOrder, setModalOrder] = useState<VendorOrderSummary | null>(null)
  const [modalProvider, setModalProvider] = useState('yalidine')
  const [modalTracking, setModalTracking] = useState('')
  const [modalAutoCreate, setModalAutoCreate] = useState(false)
  const [modalNotes, setModalNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Edit tracking modal
  const [editShip, setEditShip] = useState<ShipmentRow | null>(null)
  const [editTracking, setEditTracking] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const loadShipments = useCallback(async () => {
    if (!vendor) return
    setLoadingShips(true)
    try {
      const params = new URLSearchParams({
        vendorId: vendor.id,
        page: String(page),
        ...(statusFilter && { status: statusFilter }),
        ...(providerFilter && { provider: providerFilter }),
      })
      const res = await fetch(`/api/seller/shipments?${params}`)
      const data = await res.json()
      setShipments(data.shipments || [])
      setHasMore(data.hasMore || false)
    } catch {
      // silent
    } finally {
      setLoadingShips(false)
    }
  }, [vendor, page, statusFilter, providerFilter])

  const loadPendingOrders = useCallback(async () => {
    if (!vendor) return
    setLoadingPending(true)
    try {
      const res = await fetch(`/api/seller/pending-orders?vendorId=${vendor.id}`)
      const data = await res.json()
      setPendingOrders(data.orders || [])
    } catch {
      // silent
    } finally {
      setLoadingPending(false)
    }
  }, [vendor])

  useEffect(() => { loadShipments() }, [loadShipments])
  useEffect(() => { if (tab === 'pending_orders') loadPendingOrders() }, [tab, loadPendingOrders])

  const openCreateModal = (order: VendorOrderSummary) => {
    setModalOrder(order)
    setModalProvider('yalidine')
    setModalTracking('')
    setModalAutoCreate(false)
    setModalNotes('')
    setCreateError('')
    setShowModal(true)
  }

  const handleCreate = async () => {
    if (!vendor || !modalOrder) return
    if (!modalTracking && !modalAutoCreate) { setCreateError('Enter a tracking number or enable auto-create'); return }
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/seller/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: modalOrder.order.id,
          vendorId: vendor.id,
          provider: modalProvider,
          trackingNumber: modalTracking || undefined,
          autoCreate: modalAutoCreate,
          notes: modalNotes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowModal(false)
      setTab('shipments')
      await loadShipments()
      await loadPendingOrders()
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create shipment')
    } finally {
      setCreating(false)
    }
  }

  const handleEditTracking = async () => {
    if (!editShip || !editTracking) return
    setEditSaving(true)
    try {
      await fetch('/api/seller/shipments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: editShip.id, trackingNumber: editTracking }),
      })
      setEditShip(null)
      setEditTracking('')
      await loadShipments()
    } finally {
      setEditSaving(false)
    }
  }

  const exportCSV = () => {
    const rows = shipments.filter((s) => selected.size === 0 || selected.has(s.id))
    const header = ['ID', 'Order', 'Customer', 'Wilaya', 'Provider', 'Tracking', 'Status', 'Date']
    const csv = [
      header.join(','),
      ...rows.map((s) =>
        [s.id.slice(0, 8), s.order_id.slice(0, 8), s.recipient_name, s.wilaya, s.provider,
         s.tracking_number || '', s.status, new Date(s.created_at).toLocaleDateString('fr-DZ')].join(',')
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `shipments-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const filteredShipments = shipments.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.recipient_name?.toLowerCase().includes(q) ||
      s.tracking_number?.toLowerCase().includes(q) ||
      s.wilaya?.toLowerCase().includes(q) ||
      s.order_id.includes(q)
    )
  })

  if (loading || !vendor) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`lg:hidden sticky top-0 z-20 bg-gray-950 flex items-center h-14 px-4 gap-3 shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors" aria-label="Menu"><Menu className="w-5 h-5" /></button>
        <span className="font-semibold text-white text-sm truncate flex-1">{vendor.store_name}</span>
      </div>
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut} logoUrl={vendor.logo_url}
        subscriptionStatus={vendor.subscription_status}
        isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <main className={`flex-1 ${isRTL ? 'lg:mr-64' : 'lg:ml-64'} p-4 sm:p-8 min-w-0`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Truck className="w-6 h-6 text-emerald-600" /> Deliveries
            </h1>
            <p className="text-gray-500 text-sm mt-1">{shipments.length} shipments tracked</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 font-semibold px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button onClick={loadShipments} className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 font-semibold px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
          {([['shipments', 'Shipments'], ['pending_orders', 'Pending Orders']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
              {key === 'pending_orders' && pendingOrders.length > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingOrders.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── SHIPMENTS TAB ──────────────────────────────────────────────────── */}
        {tab === 'shipments' && (
          <>
            {/* Filters */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer, tracking, wilaya…"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 bg-white" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-400">
                <option value="">All statuses</option>
                {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-400">
                <option value="">All couriers</option>
                {DELIVERY_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {loadingShips ? (
                <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading…
                </div>
              ) : filteredShipments.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No shipments yet</p>
                  <button onClick={() => setTab('pending_orders')} className="mt-2 text-emerald-600 font-bold text-sm hover:underline">
                    Create your first shipment →
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-10 px-4 py-3.5">
                          <input type="checkbox"
                            checked={selected.size === filteredShipments.length && filteredShipments.length > 0}
                            onChange={(e) => setSelected(e.target.checked ? new Set(filteredShipments.map((s) => s.id)) : new Set())}
                            className="rounded border-gray-300" />
                        </th>
                        {['Customer', 'Wilaya', 'Courier', 'Tracking #', 'Status', 'Date', ''].map((h) => (
                          <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-3.5">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredShipments.map((s) => {
                        const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.pending
                        const Icon = cfg.icon
                        const provider = DELIVERY_PROVIDERS.find((p) => p.id === s.provider)
                        return (
                          <tr key={s.id} className={`hover:bg-gray-50 ${selected.has(s.id) ? 'bg-emerald-50' : ''}`}>
                            <td className="px-4 py-3.5">
                              <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)}
                                className="rounded border-gray-300" />
                            </td>
                            <td className="px-4 py-3.5">
                              <p className="font-semibold text-gray-900">{s.recipient_name}</p>
                              <p className="text-xs text-gray-400">{s.recipient_phone}</p>
                            </td>
                            <td className="px-4 py-3.5 text-gray-600">{s.wilaya}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: provider?.color ?? '#94a3b8' }} />
                                <span className="font-medium">{provider?.name ?? s.provider}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              {s.tracking_number ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs">{s.tracking_number}</span>
                                  <a href={getTrackingUrl(s.provider, s.tracking_number)} target="_blank" rel="noopener noreferrer"
                                    className="text-indigo-500 hover:text-indigo-700">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              ) : (
                                <button onClick={() => { setEditShip(s); setEditTracking('') }}
                                  className="text-amber-600 hover:text-amber-800 text-xs font-semibold flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Add tracking
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.cls}`}>
                                <Icon className="w-3.5 h-3.5" /> {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-gray-400 text-xs">
                              {new Date(s.created_at).toLocaleDateString('fr-DZ')}
                            </td>
                            <td className="px-4 py-3.5">
                              {s.label_url && (
                                <a href={s.label_url} target="_blank" rel="noopener noreferrer"
                                  className="text-indigo-500 hover:text-indigo-700 text-xs font-semibold">Label</a>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {hasMore && (
              <button onClick={() => setPage((p) => p + 1)} className="mt-4 w-full border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Load more
              </button>
            )}
          </>
        )}

        {/* ── PENDING ORDERS TAB ─────────────────────────────────────────────── */}
        {tab === 'pending_orders' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {loadingPending ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading…
              </div>
            ) : pendingOrders.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">All orders have shipments assigned</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Order', 'Customer', 'Wilaya', 'Items', 'Total', 'Date', ''].map((h) => (
                        <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pendingOrders.map(({ order, items, vendorTotal }) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{order.id.slice(0, 8)}</td>
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-gray-900">{order.full_name}</p>
                          <p className="text-xs text-gray-400">{order.phone}</p>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">{order.wilaya}</td>
                        <td className="px-5 py-3.5 text-gray-600">{items.length}</td>
                        <td className="px-5 py-3.5 font-bold text-gray-900">{formatPrice(vendorTotal)}</td>
                        <td className="px-5 py-3.5 text-gray-400 text-xs">{new Date(order.created_at).toLocaleDateString('fr-DZ')}</td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => openCreateModal({ order, items, vendorTotal })}
                            className="flex items-center gap-1.5 bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors text-xs">
                            <Plus className="w-3.5 h-3.5" /> Ship
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Create Shipment Modal ─────────────────────────────────────────────── */}
      {showModal && modalOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-gray-900 flex items-center gap-2"><Truck className="w-5 h-5 text-emerald-600" /> Create Shipment</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Order summary */}
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="font-semibold text-gray-900">{modalOrder.order.full_name}</p>
                <p className="text-gray-500">{modalOrder.order.phone} · {modalOrder.order.wilaya}, {modalOrder.order.city}</p>
                <p className="text-gray-500 mt-1">{modalOrder.items.length} item(s) · {formatPrice(modalOrder.vendorTotal)}</p>
              </div>

              {/* Provider */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Delivery Company</label>
                <div className="grid grid-cols-3 gap-2">
                  {DELIVERY_PROVIDERS.slice(0, 6).map((p) => (
                    <button key={p.id} onClick={() => setModalProvider(p.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-sm font-semibold transition-colors ${modalProvider === p.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      {p.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-create toggle (Yalidine only) */}
              {modalProvider === 'yalidine' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={modalAutoCreate} onChange={(e) => setModalAutoCreate(e.target.checked)}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Auto-create via Yalidine API</p>
                    <p className="text-xs text-gray-500">Requires Yalidine API credentials in delivery settings</p>
                  </div>
                </label>
              )}

              {/* Manual tracking */}
              {!modalAutoCreate && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Tracking Number</label>
                  <input type="text" value={modalTracking} onChange={(e) => setModalTracking(e.target.value)}
                    placeholder="e.g. YLD-2024-001234"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
                  <p className="text-xs text-gray-400 mt-1">Leave empty to create shipment and add later</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Notes (optional)</label>
                <textarea value={modalNotes} onChange={(e) => setModalNotes(e.target.value)}
                  rows={2} placeholder="Fragile, handle with care…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400 resize-none" />
              </div>

              {createError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-xl">{createError}</p>}
            </div>
            <div className="p-5 border-t flex gap-3">
              <button onClick={handleCreate} disabled={creating}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {creating ? 'Creating…' : 'Create Shipment'}
              </button>
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Tracking Modal ───────────────────────────────────────────────── */}
      {editShip && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Add Tracking Number</h2>
              <button onClick={() => setEditShip(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-3">Provider: <strong>{DELIVERY_PROVIDERS.find((p) => p.id === editShip.provider)?.name ?? editShip.provider}</strong></p>
            <input type="text" value={editTracking} onChange={(e) => setEditTracking(e.target.value)}
              placeholder="Enter tracking number"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400 mb-3" />
            <div className="flex gap-2">
              <button onClick={handleEditTracking} disabled={editSaving || !editTracking}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-60 text-sm">
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save
              </button>
              <button onClick={() => setEditShip(null)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
