'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  TrendingUp, TrendingDown, Clock,
  Package, Plus, ArrowRight, CheckCircle2, Truck, AlertCircle,
  Users, Award, AlertTriangle, Zap, Bell, Menu, Copy, Check, ExternalLink,
  Settings, MapPin, Phone, Image, Tag, Shield,
} from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { getVendorProducts } from '@/lib/supabase/products'
import { type VendorOrderSummary } from '@/lib/supabase/orders'
import { DELIVERY_PROVIDERS } from '@/lib/delivery/providers'
import { formatPrice } from '@/lib/utils'
import { useT, useRTL } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'
import type { Product } from '@/types'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { icon: React.ElementType; color: string }> = {
  pending:   { icon: Clock,        color: 'text-amber-600 bg-amber-50' },
  confirmed: { icon: CheckCircle2, color: 'text-blue-600 bg-blue-50' },
  shipped:   { icon: Truck,        color: 'text-indigo-600 bg-indigo-50' },
  delivered: { icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  cancelled: { icon: AlertCircle,  color: 'text-red-600 bg-red-50' },
}

// ─── Analytics ────────────────────────────────────────────────────────────────

const LOW_STOCK_THRESHOLD = 5

function urgentPendingOrders(orders: VendorOrderSummary[]) {
  return orders.filter((o) => {
    if (o.order.status !== 'pending') return false
    const ageH = (Date.now() - new Date(o.order.created_at).getTime()) / 3_600_000
    return ageH >= 2
  })
}

function processOrders(orders: VendorOrderSummary[], allProducts: Product[]) {
  const monthlyMap: Record<string, number> = {}
  const productMap: Record<string, { id: string; sales: number; revenue: number }> = {}
  const customerMap: Record<string, { name: string; wilaya: string; orders: number; spend: number }> = {}
  const deliveryMap: Record<string, { total: number; delivered: number; returned: number; cancelled: number }> = {}
  const wilayaMap: Record<string, number> = {}
  const dowMap: Record<number, number> = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 }
  let pending = 0

  // Today / this-month / last-month boundaries (local time)
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const thisMonthKey = now.toLocaleString('en', { month: 'short' })
  const lastMonthDate = new Date(now); lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
  const lastMonthKey = lastMonthDate.toLocaleString('en', { month: 'short' })

  let todayOrders = 0, todayRevenue = 0
  let thisMonthRevenue = 0, lastMonthRevenue = 0
  let deliveredCount = 0, returnedCount = 0, finishedCount = 0
  let totalRevenue = 0

  for (const { order, items, vendorTotal } of orders) {
    const createdAt = new Date(order.created_at)
    const monthKey = createdAt.toLocaleString('en', { month: 'short' })
    const dateStr = order.created_at.slice(0, 10)

    // Monthly chart
    monthlyMap[monthKey] = (monthlyMap[monthKey] ?? 0) + vendorTotal

    // This month vs last month
    if (monthKey === thisMonthKey) thisMonthRevenue += vendorTotal
    if (monthKey === lastMonthKey) lastMonthRevenue += vendorTotal

    // Today
    if (dateStr === todayStr) { todayOrders++; todayRevenue += vendorTotal }

    // Pending
    if (order.status === 'pending' || order.status === 'confirmed') pending++

    // Delivery rate (only delivered + returned count; cancelled are admin-side)
    if (order.status === 'delivered') { deliveredCount++; finishedCount++ }
    if (order.status === 'returned')  { returnedCount++;  finishedCount++ }

    // Revenue total (delivered only)
    if (order.status === 'delivered') totalRevenue += vendorTotal

    // Products
    for (const item of items) {
      const pid = item.product_id ?? item.product_name
      if (!productMap[pid]) productMap[pid] = { id: item.product_id ?? '', sales: 0, revenue: 0 }
      productMap[pid].sales += item.quantity
      productMap[pid].revenue += item.subtotal
    }

    // Customers
    const phone = order.phone
    if (!customerMap[phone]) customerMap[phone] = { name: order.full_name, wilaya: order.wilaya, orders: 0, spend: 0 }
    customerMap[phone].orders++
    customerMap[phone].spend += vendorTotal

    // Delivery provider — track per-status
    if (order.delivery_provider) {
      if (!deliveryMap[order.delivery_provider]) deliveryMap[order.delivery_provider] = { total: 0, delivered: 0, returned: 0, cancelled: 0 }
      deliveryMap[order.delivery_provider].total++
      if (order.status === 'delivered') deliveryMap[order.delivery_provider].delivered++
      if (order.status === 'returned')  deliveryMap[order.delivery_provider].returned++
      if (order.status === 'cancelled') deliveryMap[order.delivery_provider].cancelled++
    }

    // Wilaya
    if (order.wilaya) wilayaMap[order.wilaya] = (wilayaMap[order.wilaya] ?? 0) + 1

    // Day of week
    dowMap[createdAt.getDay()]++
  }

  // Monthly chart — last 6 months
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const key = d.toLocaleString('en', { month: 'short' })
    return { month: key, revenue: monthlyMap[key] ?? 0 }
  })

  // Best sellers
  const soldIds = new Set(Object.keys(productMap))
  const bestSellers = Object.entries(productMap)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([key, s]) => {
      const prod = allProducts.find((p) => p.id === s.id || p.id === key)
      return { name: prod?.name ?? key, sales: s.sales, revenue: s.revenue, image: prod?.images[0] }
    })

  // Worst sellers — products with ZERO sales
  const worstSellers = allProducts.filter((p) => !soldIds.has(p.id)).slice(0, 4)

  // Top customers
  const topCustomers = Object.values(customerMap)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5)

  // Repeat buyers
  const repeatBuyers = Object.values(customerMap).filter(c => c.orders > 1).length
  const repeatRate = topCustomers.length > 0
    ? Math.round((repeatBuyers / Object.keys(customerMap).length) * 100)
    : 0

  // Delivery breakdown — per-company with delivered/returned/rate
  const totalShipped = Object.values(deliveryMap).reduce((s, n) => s + n.total, 0)
  const deliveryBreakdown = Object.entries(deliveryMap)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([id, d]) => {
      const provider = DELIVERY_PROVIDERS.find((p) => p.id === id)
      const fin = d.delivered + d.returned
      return {
        id, name: provider?.name ?? id, color: provider?.color ?? '#6b7280',
        count: d.total, delivered: d.delivered, returned: d.returned, cancelled: d.cancelled,
        pct: totalShipped > 0 ? Math.round((d.total / totalShipped) * 100) : 0,
        rate: fin > 0 ? Math.round((d.delivered / fin) * 100) : null,
      }
    })

  // Recent 5 orders
  const recent = [...orders]
    .sort((a, b) => new Date(b.order.created_at).getTime() - new Date(a.order.created_at).getTime())
    .slice(0, 5)

  // Best day of week
  const DOW_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const bestDowIdx = Object.entries(dowMap).sort((a, b) => b[1] - a[1])[0]
  const bestDay = bestDowIdx && Number(bestDowIdx[1]) > 0 ? DOW_FR[Number(bestDowIdx[0])] : null

  // Top wilaya
  const topWilaya = Object.entries(wilayaMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // Delivery rate
  const deliveryRate = finishedCount > 0 ? Math.round((deliveredCount / finishedCount) * 100) : null
  const returnRate   = finishedCount > 0 ? Math.round((returnedCount  / finishedCount) * 100) : null

  // Average order value (delivered orders only)
  const avgOrderValue = deliveredCount > 0 ? Math.round(totalRevenue / deliveredCount) : 0

  // Month-over-month growth
  const momGrowth = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : null

  return {
    monthly, bestSellers, worstSellers, topCustomers, deliveryBreakdown, recent, pending,
    todayOrders, todayRevenue,
    thisMonthRevenue, lastMonthRevenue, momGrowth,
    deliveryRate, returnRate, avgOrderValue,
    bestDay, topWilaya, repeatRate,
    deliveredCount, returnedCount, finishedCount,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SellerDashboardPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const t = useT()
  const isRTL = useRTL()
  const sd = t.sellerDash
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<VendorOrderSummary[]>([])
  const [fetching, setFetching] = useState(true)
  const [linkCopied, setLinkCopied] = useState(false)
  const [abandonedCount, setAbandonedCount] = useState<number | null>(null)
  const [cancelledCount, setCancelledCount] = useState<number | null>(null)

  useEffect(() => {
    if (!vendor) return
    Promise.all([
      getVendorProducts(vendor.id),
      fetch('/api/seller/orders')
        .then((r) => { if (!r.ok) throw new Error('orders fetch failed'); return r.json() })
        .then((d) => (Array.isArray(d.orders) ? d.orders : []) as VendorOrderSummary[]),
    ])
      .then(([prods, ords]) => { setAllProducts(prods); setOrders(ords) })
      .catch(() => { /* keep empty state, show dashboard with zeros */ })
      .finally(() => setFetching(false))

    fetch('/api/seller/cancelled-and-abandoned')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setAbandonedCount(d.abandoned?.length ?? 0)
          setCancelledCount(d.cancelled?.length ?? 0)
        }
      })
      .catch(() => {})
  }, [vendor])

  const analytics    = useMemo(() => processOrders(orders, allProducts), [orders, allProducts])
  const grossRevenue = orders.reduce((s, o) => s + o.vendorTotal, 0)
  const maxMonthly   = Math.max(...analytics.monthly.map((m) => m.revenue), 1)
  const hour         = new Date().getHours()
  const greeting     = hour < 12 ? sd.goodMorning : hour < 18 ? sd.goodAfternoon : sd.goodEvening
  const urgentOrders = useMemo(() => urgentPendingOrders(orders), [orders])
  const lowStockProds = useMemo(
    () => allProducts.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD),
    [allProducts]
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!vendor) return null

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Mobile top bar */}
      <div className={`lg:hidden sticky top-0 z-20 bg-gray-950 flex items-center h-14 px-4 gap-3 shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors" aria-label="Menu">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-semibold text-white text-sm truncate flex-1">{vendor.store_name}</span>
      </div>
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut} logoUrl={vendor.logo_url}
        subscriptionStatus={vendor.subscription_status}
        isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <main className={`flex-1 ${isRTL ? 'lg:mr-64' : 'lg:ml-64'} p-4 sm:p-8 min-w-0`}>

        {/* Store approval banners */}
        {!vendor.is_approved && vendor.is_active && (
          <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-2xl px-5 py-4">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-amber-800 text-sm">Boutique en attente d&apos;approbation</p>
              <p className="text-amber-700 text-xs mt-0.5">
                Votre boutique est en cours de vérification par notre équipe. Vous serez notifié sous 24h.
                Pour accélérer l&apos;approbation, assurez-vous d&apos;avoir soumis votre paiement d&apos;abonnement.
              </p>
              <Link href="/seller/subscription" className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-amber-700 underline hover:text-amber-900">
                Voir mon abonnement →
              </Link>
            </div>
          </div>
        )}
        {!vendor.is_approved && !vendor.is_active && (
          <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-300 rounded-2xl px-5 py-4">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-red-800 text-sm">Boutique refusée</p>
              {vendor.admin_note && (
                <p className="text-red-700 text-xs mt-0.5 bg-red-100 rounded-lg px-3 py-2 mt-1">
                  <span className="font-bold">Motif :</span> {vendor.admin_note}
                </p>
              )}
              <p className="text-red-600 text-xs mt-2">
                Réglez le problème indiqué, puis contactez le support pour une nouvelle révision.
              </p>
              <Link href="/seller/subscription" className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-red-700 underline hover:text-red-900">
                Gérer mon abonnement →
              </Link>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-5 gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 truncate">{greeting}, {vendor.store_name.split(' ')[0]} 👋</h1>
          </div>
          <Link href="/seller/products?new=1"
            className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors text-sm flex-shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{sd.addProduct}</span>
          </Link>
        </div>

        {/* Shop link card */}
        <div className="mb-6 bg-emerald-950 rounded-2xl px-4 py-3.5 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Lien de votre boutique</p>
            <p className="text-white text-sm font-medium truncate">
              {typeof window !== 'undefined' ? window.location.origin : 'https://shopdz.dz'}/store/{vendor.store_slug}
            </p>
          </div>
          <a
            href={`/store/${vendor.store_slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Ouvrir"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/store/${vendor.store_slug}`
              navigator.clipboard.writeText(url).then(() => {
                setLinkCopied(true)
                setTimeout(() => setLinkCopied(false), 2000)
              })
            }}
            className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            title="Copier le lien"
          >
            {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* ── ONBOARDING GUIDE (shown until seller adds their first product) ── */}
        {!fetching && allProducts.length === 0 && (
          <div className="mb-6 bg-gradient-to-br from-indigo-950 to-indigo-900 rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">Guide de démarrage</p>
                <h2 className="text-lg font-black">Votre boutique est prête — lancez-la en 4 étapes</h2>
                <p className="text-indigo-300 text-sm mt-1">Suivez ces étapes pour recevoir votre première commande</p>
              </div>
              <div className="text-4xl flex-shrink-0">🚀</div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  step: '1',
                  done: !!(vendor.logo_url && vendor.description && vendor.phone),
                  title: 'Complétez votre profil',
                  desc: 'Logo, description, téléphone WhatsApp — les clients font confiance aux boutiques complètes.',
                  href: '/seller/settings',
                  cta: vendor.logo_url ? 'Voir les paramètres →' : 'Compléter maintenant →',
                },
                {
                  step: '2',
                  done: false,
                  title: 'Ajoutez votre premier produit',
                  desc: 'Photos claires + description précise = plus de commandes. Commencez par 3 à 5 produits.',
                  href: '/seller/products?new=1',
                  cta: 'Ajouter un produit →',
                },
                {
                  step: '3',
                  done: false,
                  title: 'Partagez votre lien',
                  desc: 'Envoyez votre lien de boutique sur votre WhatsApp, Instagram Bio, et stories TikTok.',
                  href: '#store-link',
                  cta: 'Copier le lien ↑',
                },
                {
                  step: '4',
                  done: false,
                  title: 'Confirmez votre première commande',
                  desc: 'Quand une commande arrive, confirmez-la ici et contactez le client pour la livraison.',
                  href: '/seller/orders',
                  cta: 'Voir les commandes →',
                },
              ].map(({ step, done, title, desc, href, cta }) => (
                <Link
                  key={step}
                  href={href}
                  className={`flex gap-3 p-4 rounded-xl border transition-colors ${
                    done
                      ? 'bg-emerald-900/40 border-emerald-800/50 hover:bg-emerald-900/60'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black mt-0.5 ${
                    done ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white'
                  }`}>
                    {done ? '✓' : step}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold mb-0.5 ${done ? 'text-emerald-300' : 'text-white'}`}>{title}</p>
                    <p className="text-xs text-indigo-300 leading-relaxed mb-2">{desc}</p>
                    <p className={`text-xs font-bold ${done ? 'text-emerald-400' : 'text-indigo-200'}`}>{cta}</p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-indigo-400">
              <Shield className="w-3.5 h-3.5" />
              Besoin d&apos;aide ? Contactez notre support WhatsApp — réponse en moins d&apos;1h.
            </div>
          </div>
        )}

        {/* Urgency strip — orders waiting > 2h */}
        {urgentOrders.length > 0 && (
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-9 h-9 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-red-800">
                  {urgentOrders.length} commande{urgentOrders.length > 1 ? 's' : ''} non confirmée{urgentOrders.length > 1 ? 's' : ''} depuis +2h
                </p>
                <p className="text-xs text-red-600 mt-0.5">Les acheteurs attendent une réponse — confirmez ou annulez maintenant.</p>
              </div>
            </div>
            <Link href="/seller/orders?status=pending"
              className="flex-shrink-0 bg-red-500 hover:bg-red-600 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors self-start sm:self-auto">
              Confirmer maintenant →
            </Link>
          </div>
        )}

        {/* Low stock alerts */}
        {!fetching && lowStockProds.length > 0 && (
          <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <p className="text-sm font-black text-amber-800">Stocks critiques ({lowStockProds.length} produit{lowStockProds.length > 1 ? 's' : ''})</p>
              </div>
              <Link href="/seller/products" className="text-xs font-bold text-amber-700 hover:underline">Gérer le stock →</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {lowStockProds.slice(0, 4).map((p) => (
                <div key={p.id} className="bg-white rounded-xl p-3 border border-amber-100">
                  <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                  <p className={`text-sm font-black mt-1 ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {p.stock === 0 ? 'Rupture' : `${p.stock} restant${p.stock > 1 ? 's' : ''}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* KPIs — 4 analytical cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6">

          {/* Today */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Aujourd&apos;hui</p>
            <p className="text-2xl sm:text-3xl font-black text-gray-900">{analytics.todayOrders}</p>
            <p className="text-xs sm:text-sm font-semibold text-gray-600 mt-0.5">
              commande{analytics.todayOrders !== 1 ? 's' : ''}
            </p>
            <p className="text-sm font-bold text-emerald-600 mt-1.5">
              {analytics.todayRevenue > 0 ? formatPrice(analytics.todayRevenue) : <span className="text-gray-300">—</span>}
            </p>
          </div>

          {/* Ce mois */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Ce mois</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 truncate">
              {analytics.thisMonthRevenue > 0 ? formatPrice(analytics.thisMonthRevenue) : <span className="text-gray-300">—</span>}
            </p>
            {analytics.momGrowth !== null ? (
              <div className={`flex items-center gap-1 mt-1.5 ${analytics.momGrowth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {analytics.momGrowth >= 0
                  ? <TrendingUp className="w-3 h-3 flex-shrink-0" />
                  : <TrendingDown className="w-3 h-3 flex-shrink-0" />}
                <span className="text-xs font-bold truncate">
                  {analytics.momGrowth > 0 ? '+' : ''}{analytics.momGrowth}% vs mois dernier
                </span>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1.5">Premier mois</p>
            )}
          </div>

          {/* Taux de livraison */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Taux de livraison</p>
            <p className={`text-2xl sm:text-3xl font-black ${
              analytics.deliveryRate === null        ? 'text-gray-300'
              : analytics.deliveryRate >= 70         ? 'text-emerald-600'
              : analytics.deliveryRate >= 50         ? 'text-amber-600'
              :                                        'text-red-500'
            }`}>
              {analytics.deliveryRate !== null ? `${analytics.deliveryRate}%` : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1.5">
              {analytics.deliveredCount} livré{analytics.deliveredCount !== 1 ? 's' : ''} · {analytics.returnedCount} retour{analytics.returnedCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Panier moyen */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Panier moyen</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 truncate">
              {analytics.avgOrderValue > 0 ? formatPrice(analytics.avgOrderValue) : <span className="text-gray-300">—</span>}
            </p>
            <p className="text-xs text-gray-400 mt-1.5">sur {analytics.deliveredCount} livrée{analytics.deliveredCount !== 1 ? 's' : ''}</p>
          </div>

        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-gray-900">{sd.revenueChart}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{sd.grossSalesFrom}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-gray-900">{formatPrice(grossRevenue)}</p>
              <p className="text-xs text-gray-400">{sd.grossTotal}</p>
            </div>
          </div>
          {fetching || analytics.monthly.every((m) => m.revenue === 0) ? (
            <div className="h-36 flex items-center justify-center text-gray-300 text-sm">
              {fetching ? sd.loadingChart : sd.noRevenueYet}
            </div>
          ) : (
            <div className="flex items-end gap-2 h-36">
              {analytics.monthly.map((m, i) => {
                const prev = analytics.monthly[i - 1]?.revenue ?? 0
                const up = m.revenue >= prev
                const h = Math.max(Math.round((m.revenue / maxMonthly) * 100), m.revenue > 0 ? 4 : 0)
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                    {m.revenue > 0 && (
                      <div className="flex items-center gap-0.5">
                        {prev > 0 && (up
                          ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                          : <TrendingDown className="w-3 h-3 text-red-400" />)}
                        <span className="text-[10px] text-gray-500 font-medium">
                          {m.revenue >= 1000 ? `${Math.round(m.revenue / 1000)}k` : m.revenue}
                        </span>
                      </div>
                    )}
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-lg transition-colors cursor-default"
                        style={{ height: `${h}%` }}
                        title={formatPrice(m.revenue)}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-500">{m.month}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Insight pills — auto-generated from computed metrics */}
          {!fetching && orders.length > 0 && (analytics.bestDay || analytics.topWilaya || analytics.repeatRate > 0 || (analytics.returnRate !== null && analytics.returnRate >= 20) || analytics.worstSellers.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-50">
              {analytics.bestDay && (
                <span className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full">
                  📅 Meilleur jour : {analytics.bestDay}
                </span>
              )}
              {analytics.topWilaya && (
                <span className="flex items-center gap-1.5 text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full">
                  📍 Top wilaya : {analytics.topWilaya}
                </span>
              )}
              {analytics.repeatRate > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-semibold bg-violet-50 text-violet-700 px-3 py-1.5 rounded-full">
                  🔁 {analytics.repeatRate}% clients fidèles
                </span>
              )}
              {analytics.returnRate !== null && analytics.returnRate >= 20 && (
                <span className="flex items-center gap-1.5 text-xs font-semibold bg-red-50 text-red-700 px-3 py-1.5 rounded-full">
                  ⚠️ Taux de retour élevé : {analytics.returnRate}%
                </span>
              )}
              {analytics.worstSellers.length > 0 && (
                <span className="flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full">
                  💤 {analytics.worstSellers.length} produit{analytics.worstSellers.length !== 1 ? 's' : ''} sans ventes
                </span>
              )}
            </div>
          )}
        </div>

        {/* Best Sellers + Recent Orders */}
        <div className="grid lg:grid-cols-5 gap-4 lg:gap-6 mb-6">

          {/* Best Sellers */}
          <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Award className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-gray-900">{sd.bestSellers}</h2>
            </div>
            {fetching ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : analytics.bestSellers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{sd.noSalesYet}</p>
            ) : (
              <div className="space-y-4">
                {analytics.bestSellers.map((p, i) => {
                  const pct = Math.round((p.revenue / (analytics.bestSellers[0]?.revenue || 1)) * 100)
                  return (
                    <div key={p.name}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-800 truncate max-w-[150px]">
                          <span className="text-emerald-500 font-bold mr-1.5">#{i + 1}</span>{p.name}
                        </p>
                        <p className="text-xs font-bold text-gray-700 flex-shrink-0">{formatPrice(p.revenue)}</p>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(p.sales === 1 ? sd.unitsSold : sd.unitsSoldPlural).replace('{n}', String(p.sales))}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="xl:col-span-3 bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">{sd.recentOrders}</h2>
              <Link href="/seller/orders" className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1">
                {sd.viewAll} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {fetching ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : analytics.recent.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{sd.noOrdersYet}</p>
            ) : (
              <div className="space-y-2">
                {analytics.recent.map(({ order, vendorTotal }) => {
                  const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending
                  const Icon = cfg.icon
                  return (
                    <div key={order.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{order.full_name}</p>
                        <p className="text-xs text-gray-400">{order.wilaya} · {new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 flex-shrink-0">{formatPrice(vendorTotal)}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Worst Sellers + Top Customers */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mb-6">

          {/* Worst Sellers */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-gray-900">{sd.worstSellers}</h2>
            </div>
            {fetching ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : analytics.worstSellers.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">{sd.allProductsSold}</p>
            ) : (
              <>
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-4">{sd.noSalesProducts}</p>
                <div className="space-y-3">
                  {analytics.worstSellers.map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.category} · {formatPrice(p.price)}</p>
                      </div>
                      <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0">0 sales</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Top Customers */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Users className="w-5 h-5 text-blue-500" />
              <h2 className="font-bold text-gray-900">{sd.topCustomers}</h2>
            </div>
            {fetching ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : analytics.topCustomers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">{sd.noOrdersYet}</p>
            ) : (
              <div className="space-y-3">
                {analytics.topCustomers.map((c, i) => (
                  <div key={c.name + i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-sm font-bold text-blue-600">
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.wilaya} · {sd.customerOrders.replace('{n}', String(c.orders))}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 flex-shrink-0">{formatPrice(c.spend)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delivery Performance — full width, per company */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Truck className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900">Performance par livreur</h2>
          </div>
          {fetching ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          ) : analytics.deliveryBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{sd.noDeliveryData}</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {analytics.deliveryBreakdown.map((d) => (
                <div key={d.id} className="rounded-xl bg-gray-50 p-4">
                  {/* Company header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-sm font-bold text-gray-800">{d.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-400">{d.count} cmd · {d.pct}%</span>
                  </div>
                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="bg-emerald-50 rounded-lg px-1 py-2">
                      <p className="text-sm font-black text-emerald-700">{d.delivered}</p>
                      <p className="text-[10px] text-emerald-600 font-medium">Livré</p>
                    </div>
                    <div className="bg-red-50 rounded-lg px-1 py-2">
                      <p className="text-sm font-black text-red-600">{d.returned}</p>
                      <p className="text-[10px] text-red-500 font-medium">Retour</p>
                    </div>
                    <div className={`rounded-lg px-1 py-2 ${
                      d.rate === null       ? 'bg-gray-100'
                      : d.rate >= 70        ? 'bg-emerald-100'
                      : d.rate >= 50        ? 'bg-amber-100'
                      :                       'bg-red-100'
                    }`}>
                      <p className={`text-sm font-black ${
                        d.rate === null ? 'text-gray-400' : d.rate >= 70 ? 'text-emerald-700' : d.rate >= 50 ? 'text-amber-700' : 'text-red-600'
                      }`}>{d.rate !== null ? `${d.rate}%` : '—'}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Taux</p>
                    </div>
                  </div>
                  {/* Usage bar */}
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Abandoned & Cancelled — 30 days */}
        {(abandonedCount !== null || cancelledCount !== null) && (
          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Paniers abandonnés (30j)</p>
                <p className="text-2xl font-black text-gray-900">{abandonedCount ?? '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">Personnes qui ont commencé à commander sans finaliser</p>
              </div>
              <Link href="/seller/orders?tab=abandoned" className="text-xs font-bold text-amber-600 hover:underline flex-shrink-0">
                Voir →
              </Link>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Commandes annulées (30j)</p>
                <p className="text-2xl font-black text-gray-900">{cancelledCount ?? '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">Commandes annulées avant livraison</p>
              </div>
              <Link href="/seller/orders?status=cancelled" className="text-xs font-bold text-red-400 hover:underline flex-shrink-0">
                Voir →
              </Link>
            </div>
          </div>
        )}

        {/* Store Settings Summary */}
        <div className="mt-6 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-500" />
              <h2 className="font-bold text-gray-900">Paramètres de la boutique</h2>
            </div>
            <Link href="/seller/settings"
              className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
              Modifier <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-gray-50">

            {/* Profile row */}
            <div className="px-6 py-4 flex items-center gap-4">
              {vendor.logo_url ? (
                <img src={vendor.logo_url} alt={vendor.store_name}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-gray-100" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-600 font-black text-lg">{vendor.store_name?.[0] ?? '?'}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{vendor.store_name}</p>
                <p className="text-sm text-gray-400 truncate">/store/{vendor.store_slug}</p>
              </div>
              <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                vendor.is_approved
                  ? 'bg-emerald-100 text-emerald-700'
                  : vendor.is_active
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-600'
              }`}>
                {vendor.is_approved ? 'Approuvée' : vendor.is_active ? 'En attente' : 'Refusée'}
              </span>
            </div>

            {/* Quick info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-x divide-gray-50">
              {[
                {
                  icon: MapPin,
                  label: 'Wilaya',
                  value: vendor.wilaya || <span className="text-gray-300 italic text-xs">Non définie</span>,
                  color: 'text-indigo-600',
                },
                {
                  icon: Phone,
                  label: 'Téléphone',
                  value: vendor.phone || <span className="text-gray-300 italic text-xs">Non défini</span>,
                  color: 'text-emerald-600',
                },
                {
                  icon: Tag,
                  label: 'Abonnement',
                  value: vendor.subscription_status === 'active' ? 'Actif'
                    : vendor.subscription_status === 'trial' ? 'Essai'
                    : vendor.subscription_status === 'grace_period' ? 'Grâce'
                    : 'Inactif',
                  color: vendor.subscription_status === 'active' ? 'text-emerald-600' : 'text-amber-600',
                },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="px-4 sm:px-6 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                    <span className="text-xs text-gray-400 font-medium">{label}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-800 truncate">{value}</p>
                </div>
              ))}
            </div>

            {/* Profile completion checklist */}
            {(() => {
              const missing = [
                !vendor.logo_url       && { href: '/seller/settings', label: 'Ajouter un logo',       icon: Image },
                !vendor.description    && { href: '/seller/settings', label: 'Écrire une description', icon: Settings },
                !vendor.wilaya         && { href: '/seller/settings', label: 'Choisir une wilaya',     icon: MapPin },
                !vendor.phone          && { href: '/seller/settings', label: 'Ajouter un téléphone',   icon: Phone },
                !vendor.banner_url     && { href: '/seller/settings', label: 'Ajouter une bannière',   icon: Image },
              ].filter(Boolean) as { href: string; label: string; icon: React.ElementType }[]

              if (missing.length === 0) return null
              return (
                <div className="px-6 py-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    Complétez votre profil ({missing.length} restant{missing.length > 1 ? 's' : ''})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {missing.map(({ href, label, icon: Icon }) => (
                      <Link key={label} href={href}
                        className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 px-3 py-1.5 rounded-lg transition-colors">
                        <Icon className="w-3 h-3" />{label}
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Quick links */}
            <div className="px-6 py-4 flex flex-wrap gap-2">
              {[
                { href: '/seller/settings',          label: 'Profil & Boutique' },
                { href: '/seller/settings/delivery', label: 'Livraison & API' },
                { href: '/seller/subscription',      label: 'Abonnement' },
                { href: '/seller/payouts',           label: 'Paiements' },
              ].map(({ href, label }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 px-3 py-1.5 rounded-lg transition-colors">
                  {label} <ArrowRight className="w-3 h-3" />
                </Link>
              ))}
            </div>

          </div>
        </div>

      </main>
    </div>
  )
}
