'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import {
  ShoppingBag, Search, Loader2, CheckCircle2, XCircle, Truck,
  Clock, AlertCircle, ChevronDown, Download, Phone, Package,
  RefreshCw, Menu,
} from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { formatPrice } from '@/lib/utils'
import { useT, useRTL, useLang } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'
import OrderInvoicePrint from '@/components/ui/OrderInvoicePrint'
import type { VendorOrderSummary } from '@/lib/supabase/queries'

// -- Status icon/badge config (label computed from t inside component) ---------
const STATUS_STYLE: Record<string, { icon: React.ElementType; badge: string }> = {
  pending:   { icon: Clock,        badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  confirmed: { icon: CheckCircle2, badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  shipped:   { icon: Truck,        badge: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  delivered: { icon: CheckCircle2, badge: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { icon: XCircle,      badge: 'bg-red-100 text-red-600 border-red-200' },
  returned:  { icon: AlertCircle,  badge: 'bg-orange-100 text-orange-700 border-orange-200' },
}

function urgencyLevel(createdAt: string, status: string): 'none' | 'warn' | 'urgent' {
  if (status !== 'pending') return 'none'
  const ageH = (Date.now() - new Date(createdAt).getTime()) / 3_600_000
  if (ageH >= 4) return 'urgent'
  if (ageH >= 2) return 'warn'
  return 'none'
}

// -- Page ----------------------------------------------------------------------

export default function SellerOrdersPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const t = useT()
  const isRTL = useRTL()
  const lang = useLang()
  const sd = t.sellerDash
  const locale = lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-GB' : 'fr-DZ'

  const os = t.orders.status as Record<string, string>
  const statusLabel = (status: string) => os[status] ?? status

  const STATUS_CFG: Record<string, { icon: React.ElementType; badge: string; label: string }> = {
    ...Object.fromEntries(
      Object.entries(STATUS_STYLE).map(([k, v]) => [k, { ...v, label: k === 'returned' ? sd.statusReturned : statusLabel(k) }])
    ),
  }

  const STATUS_TABS = [
    { key: '',          label: sd.statusAll },
    { key: 'pending',   label: statusLabel('pending') },
    { key: 'confirmed', label: statusLabel('confirmed') },
    { key: 'shipped',   label: statusLabel('shipped') },
    { key: 'delivered', label: statusLabel('delivered') },
    { key: 'cancelled', label: statusLabel('cancelled') },
  ]

  const NEXT_ACTIONS: Record<string, { label: string; status: string; cls: string; icon: React.ElementType }[]> = {
    pending: [
      { label: sd.actionConfirm, status: 'confirmed', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white', icon: CheckCircle2 },
      { label: sd.actionCancel,  status: 'cancelled', cls: 'border border-red-200 text-red-600 hover:bg-red-50', icon: XCircle },
    ],
    confirmed: [
      { label: sd.actionShip,   status: 'shipped',   cls: 'bg-indigo-600 hover:bg-indigo-700 text-white', icon: Truck },
      { label: sd.actionCancel, status: 'cancelled', cls: 'border border-red-200 text-red-600 hover:bg-red-50', icon: XCircle },
    ],
    shipped: [
      { label: sd.actionDeliver, status: 'delivered', cls: 'bg-green-600 hover:bg-green-700 text-white', icon: CheckCircle2 },
    ],
  }

  function timeAgo(iso: string) {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
    if (mins < 60)  return sd.agoMin.replace('{n}', String(mins))
    const hrs = Math.floor(mins / 60)
    if (hrs < 24)   return sd.agoHour.replace('{n}', String(hrs))
    return sd.agoDay.replace('{n}', String(Math.floor(hrs / 24)))
  }
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [orders, setOrders]             = useState<VendorOrderSummary[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [search, setSearch]             = useState('')
  const [statusTab, setStatusTab]       = useState('')
  const [expanded, setExpanded]         = useState<string | null>(null)
  const [revealedPhone, setRevealedPhone] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading]   = useState(false)

  const load = useCallback(async () => {
    if (!vendor) return
    setLoadingOrders(true)
    try {
      const res = await fetch('/api/seller/orders')
      if (!res.ok) throw new Error('Failed to load orders')
      const json = await res.json()
      setOrders(json.orders ?? [])
    } catch {
      setOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }, [vendor])

  useEffect(() => { load() }, [load])

  // -- Filter -------------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return orders.filter((o) => {
      if (statusTab && o.order.status !== statusTab) return false
      if (!q) return true
      return (
        o.order.full_name.toLowerCase().includes(q) ||
        o.order.phone.includes(q) ||
        o.order.wilaya.toLowerCase().includes(q) ||
        o.order.id.includes(q)
      )
    })
  }, [orders, search, statusTab])

  const pendingCount = useMemo(() => orders.filter((o) => o.order.status === 'pending').length, [orders])

  // -- Status action -------------------------------------------------------------
  const handleAction = async (orderId: string, status: string) => {
    setActionLoading(orderId + status)
    try {
      const res = await fetch('/api/seller/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setOrders((prev) =>
        prev.map((o) =>
          o.order.id === orderId ? { ...o, order: { ...o.order, status } } : o
        )
      )
    } finally {
      setActionLoading(null)
    }
  }

  // -- Bulk confirm --------------------------------------------------------------
  const bulkConfirm = async () => {
    const targets = [...selected].filter((id) => {
      const o = orders.find((x) => x.order.id === id)
      return o?.order.status === 'pending'
    })
    if (!targets.length) return
    setBulkLoading(true)
    await Promise.all(targets.map((id) => handleAction(id, 'confirmed')))
    setSelected(new Set())
    setBulkLoading(false)
  }

  // -- CSV export ----------------------------------------------------------------
  const exportCSV = () => {
    const rows = filtered.filter((o) => selected.size === 0 || selected.has(o.order.id))
    const header = ['ID', sd.colClient, t.checkout.phone, sd.colWilaya, sd.colStatus, sd.orderYourTotal, sd.orderDate]
    const csv = [
      header.join(','),
      ...rows.map(({ order, vendorTotal }) => [
        order.id.slice(0, 8),
        `"${order.full_name}"`,
        order.phone,
        order.wilaya,
        order.status,
        vendorTotal,
        new Date(order.created_at).toLocaleDateString(locale),
      ].join(',')),
    ].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `commandes-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const toggleSelect = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }

  const allSelected = filtered.length > 0 && filtered.every((o) => selected.has(o.order.id))

  if (loading || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`lg:hidden sticky top-0 z-20 bg-gray-950 flex items-center h-14 px-4 gap-3 shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors" aria-label="Menu"><Menu className="w-5 h-5" /></button>
        <span className="font-semibold text-white text-sm truncate flex-1">{vendor.store_name}</span>
      </div>
      <SellerSidebar storeName={vendor.store_name!} slug={vendor.store_slug!} onLogout={signOut} logoUrl={vendor.logo_url}
        subscriptionStatus={vendor.subscription_status}
        isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <main className={`flex-1 ${isRTL ? 'lg:mr-64' : 'lg:ml-64'} p-4 sm:p-8 min-w-0`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-emerald-600 flex-shrink-0" /> {sd.ordersTitle}
            </h1>
            <p className="text-gray-500 text-sm mt-1">{sd.ordersTotal.replace('{n}', String(orders.length))}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={exportCSV}
              className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 font-semibold px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{sd.exportCsv}</span>
            </button>
            <button onClick={load}
              className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 font-semibold px-3 py-2.5 rounded-xl hover:bg-gray-50 text-sm">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">{sd.refreshOrders}</span>
            </button>
          </div>
        </div>

        {/* Urgency strip */}
        {pendingCount > 0 && (
          <div className="mb-5 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <p className="text-sm font-semibold text-amber-800">
                {sd.pendingAlert.replace('{n}', String(pendingCount))}
              </p>
            </div>
            <button onClick={() => setStatusTab('pending')}
              className="text-sm font-bold text-amber-700 hover:text-amber-900 underline">
              {sd.viewNow}
            </button>
          </div>
        )}

        {/* Status tab filters Ã¢â‚¬â€ scrollable on mobile */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 mb-4 scrollbar-hide">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-max sm:w-fit">
            {STATUS_TABS.map(({ key, label }) => {
              const count = key ? orders.filter((o) => o.order.status === key).length : orders.length
              return (
                <button key={key} onClick={() => setStatusTab(key)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                    statusTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {label}
                  {count > 0 && (
                    <span className={`ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      key === 'pending' && count > 0
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Search + bulk actions bar */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={sd.searchOrders}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 bg-white" />
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-600">{sd.selectedCount.replace('{n}', String(selected.size))}</span>
              <button onClick={bulkConfirm} disabled={bulkLoading}
                className="flex items-center gap-1.5 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-700 text-sm disabled:opacity-60">
                {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {sd.confirmSelection}
              </button>
              <button onClick={exportCSV}
                className="flex items-center gap-1.5 border border-gray-200 bg-white text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 text-sm">
                <Download className="w-4 h-4" /> CSV
              </button>
              <button onClick={() => setSelected(new Set())}
                className="text-sm text-gray-400 hover:text-gray-600">{sd.deselect}</button>
            </div>
          )}
        </div>

        {/* Orders list */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loadingOrders ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> {t.common.loading}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{orders.length === 0 ? sd.noOrdersYet : sd.noResults}</p>
            </div>
          ) : (
            <>
              {/* -- Mobile cards (sm:hidden) --------------------------------- */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filtered.map(({ order, items, vendorTotal }) => {
                  const urgency = urgencyLevel(order.created_at, order.status)
                  const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending
                  const StatusIcon = cfg.icon
                  const actions = NEXT_ACTIONS[order.status] ?? []
                  const isExpanded = expanded === order.id
                  const isRevealed = revealedPhone.has(order.id)
                  const maskedPhone = order.phone.length >= 7 ? order.phone.slice(0, 4) + 'Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢' + order.phone.slice(-3) : order.phone

                  return (
                    <div key={order.id + '-m'}
                      className={`p-4 transition-colors ${
                        urgency === 'urgent' ? 'border-l-4 border-l-red-500 bg-red-50/30'
                        : urgency === 'warn'  ? 'border-l-4 border-l-amber-400 bg-amber-50/20'
                        : ''
                      }`}>
                      {/* Top row */}
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={selected.has(order.id)} onChange={() => toggleSelect(order.id)}
                          className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-gray-900 text-sm truncate">{order.full_name}</span>
                            <span className="font-black text-gray-900 text-sm flex-shrink-0">{formatPrice(vendorTotal)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.badge}`}>
                              <StatusIcon className="w-3 h-3" />{cfg.label}
                            </span>
                            <span className="text-xs text-gray-400">#{order.id.slice(0, 8)} Ã‚Â· {order.wilaya}</span>
                            {urgency !== 'none' && (
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                urgency === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>{timeAgo(order.created_at)}</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {isRevealed || order.status !== 'pending' ? (
                              <a href={`tel:${order.phone}`}
                                className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:underline">
                                <Phone className="w-3 h-3" />{order.phone}
                              </a>
                            ) : (
                              <>
                                {maskedPhone}
                                <button onClick={() => setRevealedPhone((prev) => new Set([...prev, order.id]))}
                                  className="ml-1.5 text-emerald-600 hover:underline text-[11px] font-semibold">
                                  <Phone className="w-3 h-3 inline" /> {sd.reveal}
                                </button>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-3 ml-7 flex-wrap">
                        {actions.map((act) => {
                          const ActIcon = act.icon
                          const isLoading = actionLoading === order.id + act.status
                          return (
                            <button key={act.status}
                              onClick={() => handleAction(order.id, act.status)}
                              disabled={!!actionLoading}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 ${act.cls}`}>
                              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ActIcon className="w-3.5 h-3.5" />}
                              {act.label}
                            </button>
                          )
                        })}
                        <button onClick={() => setExpanded(isExpanded ? null : order.id)}
                          className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 py-1.5 px-2 rounded-lg hover:bg-gray-100">
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          {isExpanded ? sd.lessDetails : sd.moreDetails}
                        </button>
                      </div>

                      {/* Expanded detail Ã¢â‚¬â€ mobile */}
                      {isExpanded && (
                        <div className="mt-3 ml-7 pt-3 border-t border-gray-100 space-y-3">
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{sd.orderItems}</p>
                            <div className="space-y-2">
                              {items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {item.product_image
                                      ? <Image src={item.product_image} alt="" width={32} height={32} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                      : <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center flex-shrink-0"><Package className="w-3.5 h-3.5 text-gray-400" /></div>
                                    }
                                    <div className="min-w-0">
                                      <span className="text-gray-700 truncate block">{item.product_name} Ãƒâ€” {item.quantity}</span>
                                      {item.selected_color && (
                                        <span className="text-xs text-gray-400">Couleur : {item.selected_color}</span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="font-semibold text-gray-900 flex-shrink-0 ml-2">{formatPrice(item.subtotal)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-1.5 text-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{sd.orderSummary}</p>
                            <div className="flex justify-between">
                              <span className="text-gray-500">{sd.orderAddress}</span>
                              <span className="text-gray-900 font-medium text-right max-w-[180px]">{order.address}, {order.city}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">{sd.orderPayment}</span>
                              <span className="text-gray-900 font-medium capitalize">{order.payment_method}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">{sd.orderYourTotal}</span>
                              <span className="font-black text-emerald-600">{formatPrice(vendorTotal)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-400">{sd.orderDate}</span>
                              <span className="text-gray-600">{new Date(order.created_at).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <div className="pt-2">
                            <OrderInvoicePrint order={{ ...order, order_items: items }} storeName={vendor.store_name ?? ''} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* -- Desktop table (hidden sm:block) ------------------------- */}
              <div className="hidden sm:block">
                {/* Table header */}
                <div className="flex items-center gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
                  <input type="checkbox" checked={allSelected}
                    onChange={(e) => setSelected(e.target.checked ? new Set(filtered.map((o) => o.order.id)) : new Set())}
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide flex-1">{sd.colClient}</span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide w-28 hidden md:block">{sd.colWilaya}</span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide w-32 hidden lg:block">{sd.colStatus}</span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide w-28 text-right">{sd.colAmount}</span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide w-36">{sd.colActions}</span>
                </div>

                <div className="divide-y divide-gray-50">
                  {filtered.map(({ order, items, vendorTotal }) => {
                    const urgency = urgencyLevel(order.created_at, order.status)
                    const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending
                    const StatusIcon = cfg.icon
                    const actions = NEXT_ACTIONS[order.status] ?? []
                    const isExpanded = expanded === order.id
                    const isRevealed = revealedPhone.has(order.id)
                    const maskedPhone = order.phone.length >= 7 ? order.phone.slice(0, 4) + 'Ã¢â‚¬Â¢Ã¢â‚¬Â¢Ã¢â‚¬Â¢' + order.phone.slice(-3) : order.phone

                    return (
                      <div key={order.id}
                        className={`transition-colors ${
                          urgency === 'urgent' ? 'border-l-4 border-l-red-500 bg-red-50/30'
                          : urgency === 'warn'   ? 'border-l-4 border-l-amber-400 bg-amber-50/20'
                          : ''
                        }`}>
                        {/* Row */}
                        <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50">
                          <input type="checkbox" checked={selected.has(order.id)} onChange={() => toggleSelect(order.id)}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 flex-shrink-0" />

                          <button onClick={() => setExpanded(isExpanded ? null : order.id)}
                            className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 text-sm">{order.full_name}</span>
                              {urgency !== 'none' && (
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                  urgency === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                }`}>{timeAgo(order.created_at)}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              #{order.id.slice(0, 8)} Ã‚Â·{' '}
                              {isRevealed || order.status !== 'pending' ? (
                                <a href={`tel:${order.phone}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:underline">
                                  <Phone className="w-3 h-3" />{order.phone}
                                </a>
                              ) : (
                                <>
                                  {maskedPhone}
                                  <button onClick={(e) => { e.stopPropagation(); setRevealedPhone((prev) => new Set([...prev, order.id])) }}
                                    className="ml-1.5 text-emerald-600 hover:underline text-[11px] font-semibold inline-flex items-center gap-0.5">
                                    <Phone className="w-3 h-3" /> {sd.reveal}
                                  </button>
                                </>
                              )}
                            </p>
                          </button>

                          <span className="text-sm text-gray-600 w-28 hidden md:block truncate">{order.wilaya}</span>

                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border w-32 hidden lg:flex ${cfg.badge}`}>
                            <StatusIcon className="w-3.5 h-3.5" />{cfg.label}
                          </span>

                          <span className="font-black text-gray-900 w-28 text-right text-sm flex-shrink-0">
                            {formatPrice(vendorTotal)}
                          </span>

                          <div className="flex items-center gap-1.5 w-36 flex-shrink-0">
                            {actions.map((act) => {
                              const ActIcon = act.icon
                              const isLoading = actionLoading === order.id + act.status
                              return (
                                <button key={act.status}
                                  onClick={() => handleAction(order.id, act.status)}
                                  disabled={!!actionLoading}
                                  title={act.label}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-60 ${act.cls}`}>
                                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ActIcon className="w-3.5 h-3.5" />}
                                  <span className="hidden xl:inline">{act.label}</span>
                                </button>
                              )
                            })}
                            <button onClick={() => setExpanded(isExpanded ? null : order.id)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-4 sm:px-16 pb-4 bg-gray-50/80 border-t border-gray-100">
                            <div className="grid md:grid-cols-2 gap-4 pt-3">
                              <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{sd.orderItems}</p>
                                <div className="space-y-2">
                                  {items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-2">
                                        {item.product_image
                                          ? <img src={item.product_image} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                                          : <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center flex-shrink-0"><Package className="w-3.5 h-3.5 text-gray-400" /></div>
                                        }
                                        <div>
                                          <span className="text-gray-700">{item.product_name} Ãƒâ€” {item.quantity}</span>
                                          {item.selected_color && (
                                            <p className="text-xs text-gray-400">Couleur : {item.selected_color}</p>
                                          )}
                                        </div>
                                      </div>
                                      <span className="font-semibold text-gray-900">{formatPrice(item.subtotal)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{sd.orderSummary}</p>
                                <div className="space-y-1.5 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">{sd.orderAddress}</span>
                                    <span className="text-gray-900 font-medium text-right max-w-[180px]">{order.address}, {order.city}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">{sd.orderPayment}</span>
                                    <span className="text-gray-900 font-medium capitalize">{order.payment_method}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">{sd.orderYourTotal}</span>
                                    <span className="font-black text-emerald-600">{formatPrice(vendorTotal)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-400">{sd.orderDate}</span>
                                    <span className="text-gray-600">{new Date(order.created_at).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <div className="pt-2">
                            <OrderInvoicePrint order={{ ...order, order_items: items }} storeName={vendor.store_name ?? ''} />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
