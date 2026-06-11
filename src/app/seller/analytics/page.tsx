'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, DollarSign, ShoppingBag, RotateCcw,
  Truck, Download, RefreshCw, AlertTriangle, BarChart2,
  Lightbulb, ArrowRight, CheckCircle, XCircle, Package,
  ChevronRight, Star, MapPin, Clock, Menu,
} from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { formatPrice } from '@/lib/utils'
import { useRTL } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'
import type { SellerAnalytics } from '@/lib/supabase/analytics'

// ─── Colour palette ────────────────────────────────────────────────────────────
const PROVIDER_COLORS: Record<string, string> = {
  yalidine: '#FF6B35', zr: '#2563EB', maystro: '#059669',
  colivraison: '#7C3AED', rex: '#DC2626', procolis: '#D97706',
  direct: '#6B7280', yassir: '#0EA5E9',
}
const STATUS_COLORS = ['#F59E0B', '#3B82F6', '#6366F1', '#10B981', '#EF4444']

const DAYS_OPTIONS = [
  { label: 'Auj.', days: 1 },
  { label: '7j', days: 7 },
  { label: '30j', days: 30 },
  { label: '90j', days: 90 },
  { label: '1an', days: 365 },
]

type AnalyticsTab = 'overview' | 'funnel' | 'insights'

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'indigo' }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string
}) {
  const bg: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
    blue:   'bg-blue-50 text-blue-600',
  }
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm flex items-start gap-3 sm:gap-4 min-w-0">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg[color]}`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide truncate">{label}</p>
        <p className="text-lg sm:text-2xl font-black text-gray-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function RevTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
      <p className="font-bold mb-1">{label}</p>
      <p>{formatPrice(payload[0]?.value ?? 0)}</p>
    </div>
  )
}

// ─── Funnel bar ───────────────────────────────────────────────────────────────
function FunnelStep({
  icon: Icon, label, count, total, color, rate, isLast = false,
}: {
  icon: React.ElementType
  label: string
  count: number
  total: number
  color: string
  rate?: number
  isLast?: boolean
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="relative">
      <div className="flex items-center gap-4 mb-1">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-gray-900 text-sm">{label}</p>
            <div className="flex items-center gap-3">
              {rate !== undefined && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  rate >= 70 ? 'bg-green-100 text-green-700'
                  : rate >= 40 ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
                }`}>
                  {rate}% conv.
                </span>
              )}
              <span className="font-black text-gray-900 text-sm tabular-nums">{count}</span>
              <span className="text-xs text-gray-400">({pct}%)</span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: color.includes('blue') ? '#3B82F6' : color.includes('emerald') ? '#10B981' : color.includes('amber') ? '#F59E0B' : color.includes('violet') ? '#8B5CF6' : color.includes('red') ? '#EF4444' : '#6366F1' }}
            />
          </div>
        </div>
      </div>
      {!isLast && (
        <div className="flex items-center ml-5 my-1">
          <ChevronRight className="w-3 h-3 text-gray-300 rotate-90" />
        </div>
      )}
    </div>
  )
}

// ─── Insight card ─────────────────────────────────────────────────────────────
function InsightCard({ type, title, body, action }: {
  type: 'good' | 'warn' | 'info' | 'tip'
  title: string
  body: string
  action?: string
}) {
  const styles: Record<string, { bg: string; border: string; icon: React.ElementType; iconColor: string }> = {
    good: { bg: 'bg-green-50',  border: 'border-green-200', icon: CheckCircle,    iconColor: 'text-green-600' },
    warn: { bg: 'bg-amber-50',  border: 'border-amber-200', icon: AlertTriangle,  iconColor: 'text-amber-600' },
    info: { bg: 'bg-blue-50',   border: 'border-blue-200',  icon: Lightbulb,      iconColor: 'text-blue-600' },
    tip:  { bg: 'bg-violet-50', border: 'border-violet-200',icon: Star,           iconColor: 'text-violet-600' },
  }
  const s = styles[type]
  const IconComp = s.icon
  return (
    <div className={`rounded-2xl p-5 border ${s.bg} ${s.border}`}>
      <div className="flex items-start gap-3">
        <IconComp className={`w-5 h-5 flex-shrink-0 mt-0.5 ${s.iconColor}`} />
        <div>
          <p className="font-bold text-gray-900 text-sm mb-1">{title}</p>
          <p className="text-sm text-gray-600 leading-relaxed">{body}</p>
          {action && <p className="text-xs font-bold text-gray-500 mt-2 flex items-center gap-1"><ArrowRight className="w-3 h-3" />{action}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Generate insights ────────────────────────────────────────────────────────
function generateInsights(data: SellerAnalytics): { type: 'good'|'warn'|'info'|'tip'; title: string; body: string; action?: string }[] {
  const insights = []

  // Return rate
  if (data.returnRate > 25) {
    insights.push({
      type: 'warn' as const,
      title: `Taux de retour élevé : ${data.returnRate}%`,
      body: `La moyenne en Algérie est de 15-20%. Un taux de ${data.returnRate}% peut indiquer des problèmes de description produit, de qualité ou de confirmation avant expédition.`,
      action: 'Appelez les clients avant d\'expédier pour confirmer la commande',
    })
  } else if (data.returnRate <= 10 && data.totalOrders > 5) {
    insights.push({
      type: 'good' as const,
      title: `Excellent taux de retour : ${data.returnRate}%`,
      body: 'Votre taux de retour est bien en dessous de la moyenne nationale. Vos descriptions produits et votre service client sont efficaces.',
    })
  }

  // Delivery rate
  if (data.deliveryRate > 0) {
    if (data.deliveryRate >= 70) {
      insights.push({
        type: 'good' as const,
        title: `Taux de livraison fort : ${data.deliveryRate}%`,
        body: `${data.deliveredOrders} commandes sur ${data.totalOrders} ont été livrées avec succès. Maintenez ce niveau en confirmant chaque commande avant expédition.`,
      })
    } else if (data.deliveryRate < 50 && data.totalOrders > 5) {
      insights.push({
        type: 'warn' as const,
        title: `Taux de livraison à améliorer : ${data.deliveryRate}%`,
        body: 'Moins de la moitié de vos commandes sont livrées. Vérifiez vos processus de confirmation et la qualité des adresses de livraison.',
        action: 'Appelez systématiquement pour vérifier l\'adresse avant expédition',
      })
    }
  }

  // Average order value
  if (data.avgOrderValue < 1500 && data.totalOrders > 3) {
    insights.push({
      type: 'tip' as const,
      title: `Panier moyen de ${formatPrice(data.avgOrderValue)}`,
      body: 'Un panier moyen sous 1 500 DA limite votre rentabilité après frais de livraison. Proposez des bundles, des quantités minimum ou des produits complémentaires.',
      action: 'Créez des offres "3 pour le prix de 2" ou des bundles',
    })
  } else if (data.avgOrderValue >= 3000) {
    insights.push({
      type: 'good' as const,
      title: `Panier moyen solide : ${formatPrice(data.avgOrderValue)}`,
      body: 'Vos clients commandent en grande quantité. Envisagez un programme de fidélité pour les retenir.',
    })
  }

  // Best day of week
  if (data.byDayOfWeek.length > 0) {
    const sorted = [...data.byDayOfWeek].sort((a, b) => b.orders - a.orders)
    const bestDay = sorted[0]
    const worstDay = sorted[sorted.length - 1]
    if (bestDay.orders > 0) {
      insights.push({
        type: 'info' as const,
        title: `Meilleur jour de commande : ${bestDay.day}`,
        body: `${bestDay.orders} commandes en moyenne le ${bestDay.day}. Planifiez vos promotions flash et publications pour ce jour pour maximiser les ventes.`,
        action: `Lancez vos promos le ${worstDay.orders > 0 && worstDay.orders < bestDay.orders * 0.5 ? worstDay.day + ' (le plus faible) pour booster les ventes creuses' : bestDay.day}`,
      })
    }
  }

  // Top wilaya
  if (data.byWilaya.length > 0) {
    const topWilaya = data.byWilaya[0]
    insights.push({
      type: 'info' as const,
      title: `Zone principale : ${topWilaya.wilaya}`,
      body: `${topWilaya.orders} commandes de ${topWilaya.wilaya} représentant ${formatPrice(topWilaya.revenue)} de CA. Ciblez cette wilaya en priorité dans vos publicités.`,
      action: `Proposez la livraison gratuite pour ${topWilaya.wilaya} avec un code promo ciblé`,
    })
  }

  // Top product
  if (data.topProducts.length > 0) {
    const top = data.topProducts[0]
    const topShare = data.totalRevenue > 0 ? Math.round((top.revenue / data.totalRevenue) * 100) : 0
    if (topShare > 50) {
      insights.push({
        type: 'warn' as const,
        title: `Dépendance au produit "${top.name}"`,
        body: `Ce produit représente ${topShare}% de votre CA. Diversifiez votre catalogue pour réduire ce risque de concentration.`,
        action: 'Testez 2-3 nouveaux produits complémentaires ce mois',
      })
    } else if (topShare > 0) {
      insights.push({
        type: 'tip' as const,
        title: `Produit star : "${top.name}"`,
        body: `${topShare}% de votre CA vient de ce produit (${top.units} unités vendues). Créez une vente flash ou un code promo pour amplifier ses ventes.`,
        action: 'Lancez une vente flash à -15% pour tester l\'élasticité',
      })
    }
  }

  // Pending orders warning
  if (data.pendingOrders > 5) {
    insights.push({
      type: 'warn' as const,
      title: `${data.pendingOrders} commandes en attente`,
      body: 'Trop de commandes non confirmées augmentent le risque de retour. Traitez-les dans les 24h pour maintenir la confiance client.',
      action: 'Allez dans Commandes → filtrez "En attente" et confirmez',
    })
  }

  if (insights.length === 0 && data.totalOrders === 0) {
    insights.push({
      type: 'info' as const,
      title: 'Pas encore de données',
      body: 'Les insights apparaîtront une fois vos premières commandes reçues. Partagez votre boutique pour démarrer !',
    })
  }

  return insights
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SellerAnalyticsPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const isRTL = useRTL()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [days, setDays]     = useState(30)
  const [tab, setTab]       = useState<AnalyticsTab>('overview')
  const [data, setData]     = useState<SellerAnalytics | null>(null)
  const [fetching, setFetching] = useState(true)

  const load = useCallback(async () => {
    if (!vendor) return
    setFetching(true)
    try {
      const res = await fetch(`/api/seller/analytics?vendorId=${vendor.id}&days=${days}`)
      setData(await res.json())
    } finally {
      setFetching(false)
    }
  }, [vendor, days])

  useEffect(() => { load() }, [load])

  const exportCSV = () => {
    if (!data) return
    const rows = [
      ['Métrique', 'Valeur'],
      ['CA Total', data.totalRevenue],
      ['Commandes', data.totalOrders],
      ['En attente', data.pendingOrders],
      ['Livrées', data.deliveredOrders],
      ['Retours', data.returnedOrders],
      ['Panier moyen', data.avgOrderValue],
      ['Taux retour %', data.returnRate],
      ['', ''],
      ['Top Produits', ''], ['Nom', 'Unités', 'CA'],
      ...data.topProducts.map((p) => [p.name, p.units, p.revenue]),
      ['', ''],
      ['Par Wilaya', ''], ['Wilaya', 'Commandes', 'CA'],
      ...data.byWilaya.map((w) => [w.wilaya, w.orders, w.revenue]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `analytics-${days}j-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading || !vendor) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  const statusData = data ? [
    { name: 'En attente',  value: data.pendingOrders },
    { name: 'Livrées',     value: data.deliveredOrders },
    { name: 'Retours',     value: data.returnedOrders },
    { name: 'Annulées',    value: data.cancelledOrders },
    { name: 'Autres', value: Math.max(0, data.totalOrders - data.pendingOrders - data.deliveredOrders - data.returnedOrders - data.cancelledOrders) },
  ].filter((d) => d.value > 0) : []

  const insights = data ? generateInsights(data) : []

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-indigo-600" /> Analytics
            </h1>
            <p className="text-gray-500 text-sm mt-1">Performance de votre boutique</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {DAYS_OPTIONS.map(({ label, days: d }) => (
                <button key={d} onClick={() => setDays(d)}
                  className={`px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${days === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={load} className="flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Résumé CSV</span>
            </button>
            <a href="/api/seller/analytics/export" className="flex items-center gap-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-100">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Commandes CSV</span>
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
          {([
            ['overview', BarChart2,  'Vue d\'ensemble'],
            ['funnel',   TrendingUp, 'Entonnoir'],
            ['insights', Lightbulb,  'Insights'],
          ] as const).map(([key, Icon, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {label}
              {key === 'insights' && insights.some((i) => i.type === 'warn') && (
                <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>

        {fetching && !data ? (
          <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? null : (

          <>
            {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
            {tab === 'overview' && (
              <>
                {data.totalOrders === 0 ? (
                  <div className="text-center py-32 text-gray-400">
                    <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-semibold">Aucune commande sur cette période</p>
                    <p className="text-sm mt-1">Partagez votre boutique pour commencer à vendre</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <StatCard icon={DollarSign} label="CA Total" color="indigo"
                        value={formatPrice(data.totalRevenue)}
                        sub={`${data.totalOrders} commandes · moy. ${formatPrice(data.avgOrderValue)}`} />
                      <StatCard icon={ShoppingBag} label="Commandes" color="blue"
                        value={String(data.totalOrders)}
                        sub={`${data.pendingOrders} en attente`} />
                      <StatCard icon={Truck} label="Livrées" color="green"
                        value={String(data.deliveredOrders)}
                        sub={`${data.deliveryRate}% taux de livraison`} />
                      <StatCard icon={RotateCcw} label="Taux retour" color={data.returnRate > 20 ? 'red' : 'amber'}
                        value={`${data.returnRate}%`}
                        sub={`${data.returnedOrders} retours`} />
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
                      <h2 className="font-bold text-gray-900 mb-4">Chiffre d'affaires dans le temps</h2>
                      {data.monthly.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-8">Pas de données pour cette période</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={240}>
                          <AreaChart data={data.monthly} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                              tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                            <Tooltip content={<RevTooltip />} />
                            <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2.5} fill="url(#grad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                      <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h2 className="font-bold text-gray-900 mb-4">Statuts des commandes</h2>
                        {statusData.length === 0 ? (
                          <p className="text-gray-400 text-sm text-center py-8">Pas de données</p>
                        ) : (
                          <div className="flex items-center gap-6">
                            <ResponsiveContainer width={180} height={180}>
                              <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={0}>
                                  {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />)}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2 flex-1">
                              {statusData.map((s, i) => (
                                <div key={s.name} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                                    <span className="text-gray-600">{s.name}</span>
                                  </div>
                                  <span className="font-bold text-gray-900">{s.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h2 className="font-bold text-gray-900 mb-4">Par transporteur</h2>
                        {data.byProvider.length === 0 ? (
                          <p className="text-gray-400 text-sm text-center py-8">Pas encore de données de livraison</p>
                        ) : (
                          <div className="flex items-center gap-6">
                            <ResponsiveContainer width={180} height={180}>
                              <PieChart>
                                <Pie data={data.byProvider} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="provider" strokeWidth={0}>
                                  {data.byProvider.map((p) => <Cell key={p.provider} fill={PROVIDER_COLORS[p.provider] ?? '#94a3b8'} />)}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2 flex-1">
                              {data.byProvider.map((p) => (
                                <div key={p.provider} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: PROVIDER_COLORS[p.provider] ?? '#94a3b8' }} />
                                    <span className="text-gray-600 capitalize">{p.provider}</span>
                                  </div>
                                  <span className="font-bold text-gray-900">{p.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {data.byWilaya.length > 0 && (
                      <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
                        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" /> Ventes par Wilaya (Top 10)
                        </h2>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={data.byWilaya} layout="vertical" margin={{ left: 80, right: 20, top: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="wilaya" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} width={80} />
                            <Tooltip
                              formatter={(value, name) => [name === 'orders' ? value : formatPrice(Number(value)), name === 'orders' ? 'Commandes' : 'CA']}
                              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                            />
                            <Bar dataKey="orders" fill="#6366F1" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-5">
                      <div className="px-5 py-4 border-b border-gray-50">
                        <h2 className="font-bold text-gray-900">Meilleurs produits par CA</h2>
                      </div>
                      {data.topProducts.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-8">Pas encore de ventes</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {['#', 'Produit', 'Unités', 'CA', 'Part'].map((h) => (
                                <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {data.topProducts.map((p, i) => {
                              const share = data.totalRevenue > 0 ? Math.round((p.revenue / data.totalRevenue) * 100) : 0
                              return (
                                <tr key={p.name} className="hover:bg-gray-50">
                                  <td className="px-5 py-3.5 text-gray-400 font-bold">{i + 1}</td>
                                  <td className="px-5 py-3.5 font-semibold text-gray-900 max-w-xs truncate">{p.name}</td>
                                  <td className="px-5 py-3.5 text-gray-600">{p.units} unit.</td>
                                  <td className="px-5 py-3.5 font-bold text-gray-900">{formatPrice(p.revenue)}</td>
                                  <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 max-w-24 bg-gray-100 rounded-full h-1.5">
                                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${share}%` }} />
                                      </div>
                                      <span className="text-xs text-gray-500">{share}%</span>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {data.returnRate > 20 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-800">Taux de retour élevé ({data.returnRate}%)</p>
                          <p className="text-sm text-amber-700 mt-1">
                            La moyenne en Algérie est de 15-20%. Envoyez une confirmation WhatsApp avant l'expédition,
                            améliorez vos descriptions produits et ajoutez des guides de taille ou vidéos de démonstration.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ── FUNNEL ─────────────────────────────────────────────────────── */}
            {tab === 'funnel' && (
              <div className="max-w-2xl">
                <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
                  <h2 className="font-bold text-gray-900 mb-1">Entonnoir de conversion</h2>
                  <p className="text-sm text-gray-500 mb-6">Parcours de chaque commande de la réception à la livraison</p>

                  {data.totalOrders === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">Pas encore de commandes</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <FunnelStep
                        icon={ShoppingBag}
                        label="Commandé"
                        count={data.totalOrders}
                        total={data.totalOrders}
                        color="bg-blue-50 text-blue-600"
                      />
                      <FunnelStep
                        icon={CheckCircle}
                        label="Confirmé"
                        count={data.confirmedOrders}
                        total={data.totalOrders}
                        color="bg-indigo-50 text-indigo-600"
                        rate={data.totalOrders > 0 ? Math.round((data.confirmedOrders / data.totalOrders) * 100) : 0}
                      />
                      <FunnelStep
                        icon={Truck}
                        label="Expédié"
                        count={data.shippedOrders}
                        total={data.totalOrders}
                        color="bg-violet-50 text-violet-600"
                        rate={data.confirmedOrders > 0 ? Math.round((data.shippedOrders / data.confirmedOrders) * 100) : 0}
                      />
                      <FunnelStep
                        icon={CheckCircle}
                        label="Livré"
                        count={data.deliveredOrders}
                        total={data.totalOrders}
                        color="bg-emerald-50 text-emerald-600"
                        rate={data.shippedOrders > 0 ? Math.round((data.deliveredOrders / data.shippedOrders) * 100) : 0}
                        isLast
                      />
                    </div>
                  )}
                </div>

                {/* Drop-off breakdown */}
                {data.totalOrders > 0 && (
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <p className="font-bold text-gray-900 text-sm">Commandes annulées</p>
                      </div>
                      <p className="text-3xl font-black text-red-600">{data.cancelledOrders}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {data.totalOrders > 0 ? Math.round((data.cancelledOrders / data.totalOrders) * 100) : 0}% du total
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <RotateCcw className="w-4 h-4 text-amber-500" />
                        <p className="font-bold text-gray-900 text-sm">Retours</p>
                      </div>
                      <p className="text-3xl font-black text-amber-600">{data.returnedOrders}</p>
                      <p className="text-xs text-gray-500 mt-1">{data.returnRate}% taux de retour</p>
                    </div>
                  </div>
                )}

                {/* Day of week chart */}
                {data.byDayOfWeek.some((d) => d.orders > 0) && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" /> Commandes par jour de la semaine
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">Optimisez vos promotions sur les jours les plus actifs</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={data.byDayOfWeek} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(v) => [v, 'Commandes']}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                        />
                        <Bar dataKey="orders" fill="#6366F1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* ── INSIGHTS ──────────────────────────────────────────────────── */}
            {tab === 'insights' && (
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h2 className="font-bold text-gray-900">Recommandations personnalisées</h2>
                  <span className="text-xs text-gray-400 ml-auto">Basé sur {days} derniers jours</span>
                </div>
                <div className="space-y-3">
                  {insights.map((insight, i) => (
                    <InsightCard key={i} {...insight} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
