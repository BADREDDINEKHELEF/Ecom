'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  CreditCard, TrendingUp, Clock, CheckCircle2, ChevronDown,
  Download, Loader2, Calendar, Info, Menu,
} from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { getVendorOrders } from '@/lib/supabase/queries'
import { formatPrice } from '@/lib/utils'
import { useRTL } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'
import type { VendorOrderSummary } from '@/lib/supabase/queries'

// Next payout date = next Sunday
function nextPayoutDate() {
  const d = new Date()
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7))
  return d.toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long' })
}

function weekStart(d: Date) {
  const s = new Date(d)
  s.setDate(d.getDate() - d.getDay())
  s.setHours(0, 0, 0, 0)
  return s
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface WeeklyPeriod {
  label:     string
  from:      Date
  to:        Date
  gross:     number
  commission: number
  net:        number
  orderCount: number
  status:    'paid' | 'pending' | 'processing'
  orders:    VendorOrderSummary[]
}

export default function SellerPayoutsPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const isRTL = useRTL()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [orders, setOrders]           = useState<VendorOrderSummary[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null)

  useEffect(() => {
    if (!vendor) return
    fetch('/api/seller/orders')
      .then((r) => r.json())
      .then((d) => { setOrders(d.orders ?? []); setLoadingOrders(false) })
  }, [vendor])

  const commissionRate = vendor?.commission_rate ?? 10

  // Aggregate delivered orders into weekly periods
  const { periods, pendingBalance, totalEarned } = useMemo(() => {
    const delivered = orders.filter((o) =>
      o.order.status === 'delivered' || o.order.delivery_outcome === 'delivered'
    )

    const periodMap = new Map<string, WeeklyPeriod>()
    const now = new Date()

    for (const o of delivered) {
      const d    = new Date(o.order.created_at)
      const ws   = weekStart(d)
      const we   = new Date(ws)
      we.setDate(ws.getDate() + 6)
      const key  = ws.toISOString().split('T')[0]

      if (!periodMap.has(key)) {
        const isPast = we < now
        periodMap.set(key, {
          label:      `${formatDateShort(ws)} — ${formatDateShort(we)}`,
          from:       ws,
          to:         we,
          gross:      0,
          commission: 0,
          net:        0,
          orderCount: 0,
          status:     isPast ? 'paid' : 'processing',
          orders:     [],
        })
      }
      const p = periodMap.get(key)!
      p.gross      += o.vendorTotal
      p.commission += o.vendorTotal * commissionRate / 100
      p.net        += o.vendorTotal * (1 - commissionRate / 100)
      p.orderCount += 1
      p.orders.push(o)
    }

    const sortedPeriods = [...periodMap.values()].sort((a, b) => b.from.getTime() - a.from.getTime())

    // Pending = current week in-progress
    const currentWeekOrders = orders.filter((o) => {
      const d  = new Date(o.order.created_at)
      const ws = weekStart(new Date())
      return d >= ws && ['confirmed', 'shipped'].includes(o.order.status)
    })
    const pendingBalance = currentWeekOrders.reduce((s, o) => s + o.vendorTotal * (1 - commissionRate / 100), 0)
    const totalEarned    = sortedPeriods.reduce((s, p) => s + p.net, 0)

    return { periods: sortedPeriods, pendingBalance, totalEarned }
  }, [orders, commissionRate])

  const exportCSV = () => {
    const rows = orders.filter((o) => o.order.status === 'delivered')
    const header = ['Commande', 'Client', 'Date livraison', 'Montant brut', `Commission ${commissionRate}%`, 'Net vendeur']
    const csv = [
      header.join(','),
      ...rows.map(({ order, vendorTotal }) => [
        order.id.slice(0, 8),
        `"${order.full_name}"`,
        new Date(order.created_at).toLocaleDateString('fr-DZ'),
        vendorTotal.toFixed(2),
        (vendorTotal * commissionRate / 100).toFixed(2),
        (vendorTotal * (1 - commissionRate / 100)).toFixed(2),
      ].join(',')),
    ].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `revenus-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

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
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut}
        subscriptionStatus={vendor.subscription_status}
        isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <main className={`flex-1 ${isRTL ? 'lg:mr-64' : 'lg:ml-64'} p-4 sm:p-8 min-w-0`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-emerald-600" /> Revenus & Paiements
            </h1>
            <p className="text-gray-500 text-sm mt-1">Détail de chaque vente, commission déduite</p>
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 text-sm">
            <Download className="w-4 h-4" /> Export CSV annuel
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-gray-500">Total gagné (net)</p>
            </div>
            <p className="text-2xl font-black text-gray-900">{loadingOrders ? '…' : formatPrice(Math.round(totalEarned))}</p>
            <p className="text-xs text-gray-400 mt-1">Commandes livrées · commission déduite</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm font-semibold text-gray-500">En cours de traitement</p>
            </div>
            <p className="text-2xl font-black text-gray-900">{loadingOrders ? '…' : formatPrice(Math.round(pendingBalance))}</p>
            <p className="text-xs text-gray-400 mt-1">Commandes confirmées / expédiées cette semaine</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border-2 border-emerald-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-500">Prochain virement</p>
            </div>
            <p className="text-sm font-black text-gray-900 capitalize">{nextPayoutDate()}</p>
            <p className="text-xs text-gray-400 mt-1">Automatique chaque dimanche</p>
          </div>
        </div>

        {/* Commission explainer */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <strong>Comment est calculé votre revenu ?</strong>
            <div className="mt-1 grid grid-cols-3 gap-3 text-center">
              <div className="bg-white rounded-lg px-3 py-2">
                <p className="font-bold text-gray-900">Prix de vente</p>
                <p className="text-xs text-gray-500">ex: 5,000 DA</p>
              </div>
              <div className="bg-white rounded-lg px-3 py-2">
                <p className="font-bold text-red-600">−Commission {commissionRate}%</p>
                <p className="text-xs text-gray-500">ex: −500 DA</p>
              </div>
              <div className="bg-emerald-100 rounded-lg px-3 py-2">
                <p className="font-bold text-emerald-700">= Votre part</p>
                <p className="text-xs text-gray-500">ex: 4,500 DA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly periods */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Historique des virements</h2>
          </div>
          {loadingOrders ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> Chargement…
            </div>
          ) : periods.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucune commande livrée pour le moment</p>
              <p className="text-sm mt-1">Vos revenus apparaîtront ici une fois vos premières livraisons confirmées.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {periods.map((period) => {
                const key = period.from.toISOString()
                const isOpen = expandedPeriod === key
                return (
                  <div key={key}>
                    {/* Period header row */}
                    <button onClick={() => setExpandedPeriod(isOpen ? null : key)}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors text-left">
                      {/* Status icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        period.status === 'paid' ? 'bg-green-50' : 'bg-amber-50'
                      }`}>
                        {period.status === 'paid'
                          ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                          : <Clock className="w-5 h-5 text-amber-600" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{period.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{period.orderCount} commande{period.orderCount > 1 ? 's' : ''} livrée{period.orderCount > 1 ? 's' : ''}</p>
                      </div>

                      {/* Numbers */}
                      <div className="hidden md:flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-0.5">Brut</p>
                          <p className="font-semibold text-gray-900">{formatPrice(Math.round(period.gross))}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-0.5">Commission</p>
                          <p className="font-semibold text-red-500">−{formatPrice(Math.round(period.commission))}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-0.5">Net virement</p>
                          <p className="font-black text-emerald-600 text-base">{formatPrice(Math.round(period.net))}</p>
                        </div>
                      </div>

                      {/* Status badge */}
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                        period.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {period.status === 'paid' ? '✓ Viré' : 'En cours'}
                      </span>

                      <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Expanded: per-order breakdown */}
                    {isOpen && (
                      <div className="bg-gray-50 border-t border-gray-100">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                <th className="px-6 py-3 text-left">Commande</th>
                                <th className="px-4 py-3 text-left">Client</th>
                                <th className="px-4 py-3 text-left">Articles</th>
                                <th className="px-4 py-3 text-right">Vente</th>
                                <th className="px-4 py-3 text-right">Commission</th>
                                <th className="px-4 py-3 text-right font-black text-gray-600">Votre part</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {period.orders.map(({ order, items, vendorTotal }) => {
                                const commission = vendorTotal * commissionRate / 100
                                const net        = vendorTotal - commission
                                return (
                                  <tr key={order.id} className="bg-white">
                                    <td className="px-6 py-3">
                                      <span className="font-mono text-xs text-gray-500">#{order.id.slice(0, 8)}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <p className="font-semibold text-gray-900">{order.full_name}</p>
                                      <p className="text-xs text-gray-400">{order.wilaya}</p>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 text-xs">
                                      {items.map((i) => `${i.product_name} ×${i.quantity}`).join(', ')}
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">{formatPrice(vendorTotal)}</td>
                                    <td className="px-4 py-3 text-right text-red-500">−{formatPrice(Math.round(commission))}</td>
                                    <td className="px-4 py-3 text-right font-black text-emerald-600">{formatPrice(Math.round(net))}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gray-50 font-bold">
                                <td colSpan={3} className="px-6 py-3 text-right text-xs text-gray-500 uppercase tracking-wide">Total période</td>
                                <td className="px-4 py-3 text-right">{formatPrice(Math.round(period.gross))}</td>
                                <td className="px-4 py-3 text-right text-red-500">−{formatPrice(Math.round(period.commission))}</td>
                                <td className="px-4 py-3 text-right text-emerald-600 text-base">{formatPrice(Math.round(period.net))}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
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
