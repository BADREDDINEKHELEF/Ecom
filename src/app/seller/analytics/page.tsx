'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, RotateCcw,
  Truck, Download, RefreshCw, AlertTriangle, BarChart2,
  Lightbulb, ArrowRight, CheckCircle, XCircle, Package,
  ChevronRight, Star, MapPin, Clock, Menu, Zap, Award, Target,
} from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { formatPrice } from '@/lib/utils'
import { useRTL } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'
import type { SellerAnalytics } from '@/lib/supabase/analytics'

// ── Colours ───────────────────────────────────────────────────
const PROVIDER_COLORS: Record<string, string> = {
  yalidine: '#FF6B35', zr: '#2563EB', maystro: '#059669',
  colivraison: '#7C3AED', rex: '#DC2626', procolis: '#D97706',
  direct: '#6B7280', yassir: '#0EA5E9',
}
const STATUS_COLORS   = ['#F59E0B', '#3B82F6', '#6366F1', '#10B981', '#EF4444']
const PRODUCT_PALETTE = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9', '#EC4899', '#14B8A6', '#F97316', '#6B7280']

const DAYS_OPTIONS = [
  { label: 'Auj.', days: 1 },
  { label: '7j',   days: 7 },
  { label: '30j',  days: 30 },
  { label: '90j',  days: 90 },
  { label: '1an',  days: 365 },
]

type AnalyticsTab = 'overview' | 'products' | 'geo' | 'funnel' | 'insights'

// ── Shared sub-components ─────────────────────────────────────

function GrowthBadge({ pct }: { pct: number }) {
  if (pct === 0) return null
  const up = pct > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${up ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {up ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {up ? '+' : ''}{pct}%
    </span>
  )
}

function StatCard({ icon: Icon, label, value, sub, color = 'indigo', growth }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string; growth?: number
}) {
  const bg: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600', green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',    red:   'bg-red-50 text-red-600',
    blue:  'bg-blue-50 text-blue-600',      violet:'bg-violet-50 text-violet-600',
  }
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm flex items-start gap-3 sm:gap-4 min-w-0">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg[color] ?? bg.indigo}`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide truncate">{label}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <p className="text-lg sm:text-2xl font-black text-gray-900 truncate">{value}</p>
          {growth !== undefined && <GrowthBadge pct={growth} />}
        </div>
        {sub && <p className="text-xs text-gray-500 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  )
}

function RevTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg space-y-1">
      <p className="font-bold border-b border-gray-700 pb-1 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i}>{p.name === 'orders' ? `${p.value} cmd` : formatPrice(p.value ?? 0)}</p>
      ))}
    </div>
  )
}

function FunnelStep({ icon: Icon, label, count, total, color, rate, isLast = false }: {
  icon: React.ElementType; label: string; count: number; total: number
  color: string; rate?: number; isLast?: boolean
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const barColor = color.includes('blue') ? '#3B82F6' : color.includes('emerald') ? '#10B981'
    : color.includes('amber') ? '#F59E0B' : color.includes('violet') ? '#8B5CF6'
    : color.includes('red') ? '#EF4444' : '#6366F1'
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
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${rate >= 70 ? 'bg-green-100 text-green-700' : rate >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                  {rate}% conv.
                </span>
              )}
              <span className="font-black text-gray-900 text-sm tabular-nums">{count}</span>
              <span className="text-xs text-gray-400">({pct}%)</span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
          </div>
        </div>
      </div>
      {!isLast && <div className="flex items-center ml-5 my-1"><ChevronRight className="w-3 h-3 text-gray-300 rotate-90" /></div>}
    </div>
  )
}

function InsightCard({ type, title, body, action }: {
  type: 'good' | 'warn' | 'info' | 'tip'; title: string; body: string; action?: string
}) {
  const styles = {
    good: { bg: 'bg-green-50',  border: 'border-green-200', icon: CheckCircle,   iconColor: 'text-green-600' },
    warn: { bg: 'bg-amber-50',  border: 'border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-600' },
    info: { bg: 'bg-blue-50',   border: 'border-blue-200',  icon: Lightbulb,     iconColor: 'text-blue-600' },
    tip:  { bg: 'bg-violet-50', border: 'border-violet-200',icon: Star,          iconColor: 'text-violet-600' },
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

// ── Insight generation ────────────────────────────────────────
function generateInsights(data: SellerAnalytics, days: number) {
  const out: { type: 'good'|'warn'|'info'|'tip'; title: string; body: string; action?: string }[] = []

  if (data.returnRate > 25) {
    out.push({ type: 'warn', title: `Taux de retour élevé : ${data.returnRate}%`,
      body: `La moyenne en Algérie est 15-20%. Un taux de ${data.returnRate}% signale souvent une description produit inexacte ou un manque de confirmation avant expédition.`,
      action: 'Appelez chaque client avant d\'expédier pour confirmer l\'adresse et la commande.' })
  } else if (data.returnRate <= 10 && data.totalOrders > 5) {
    out.push({ type: 'good', title: `Excellent taux de retour : ${data.returnRate}%`,
      body: 'En dessous de la moyenne nationale. Vos descriptions produits et votre suivi client sont efficaces — continuez ainsi.' })
  }

  if (data.deliveryRate >= 70 && data.totalOrders > 3) {
    out.push({ type: 'good', title: `Taux de livraison fort : ${data.deliveryRate}%`,
      body: `${data.deliveredOrders} commandes livrées sur ${data.totalOrders}. Vous êtes au-dessus de la moyenne nationale (55-65%).` })
  } else if (data.deliveryRate < 50 && data.totalOrders > 5) {
    out.push({ type: 'warn', title: `Taux de livraison à améliorer : ${data.deliveryRate}%`,
      body: 'Moins de la moitié de vos commandes sont livrées. Vérifiez la qualité des adresses et confirmez chaque commande.',
      action: 'Filtrez "En attente" dans Commandes et confirmez avant expédition.' })
  }

  if (data.avgOrderValue < 1500 && data.totalOrders > 3) {
    out.push({ type: 'tip', title: `Panier moyen faible : ${formatPrice(data.avgOrderValue)}`,
      body: 'Sous 1 500 DA, la marge après frais de livraison est serrée. Proposez des bundles ou une quantité minimum.',
      action: 'Créez une offre "2+1 gratuit" sur votre produit le plus vendu.' })
  } else if (data.avgOrderValue >= 3500) {
    out.push({ type: 'good', title: `Panier moyen solide : ${formatPrice(data.avgOrderValue)}`,
      body: 'Vos clients commandent en grande quantité. Envisagez un programme de fidélité pour les retenir.' })
  }

  if (data.revenueGrowth > 20) {
    out.push({ type: 'good', title: `Croissance de +${data.revenueGrowth}% vs période précédente`,
      body: `Votre CA a augmenté de ${data.revenueGrowth}% par rapport aux ${days} jours précédents. Capitalisez en augmentant votre stock sur les produits phares.` })
  } else if (data.revenueGrowth < -15 && data.priorRevenue > 0) {
    out.push({ type: 'warn', title: `Baisse de CA de ${Math.abs(data.revenueGrowth)}%`,
      body: `Votre CA a baissé de ${Math.abs(data.revenueGrowth)}% vs la période précédente. Vérifiez vos stocks, prix, et si vos produits sont toujours visibles en boutique.` })
  }

  if (data.byDayOfWeek.length > 0) {
    const sorted   = [...data.byDayOfWeek].sort((a, b) => b.orders - a.orders)
    const bestDay  = sorted[0]
    const worstDay = sorted[sorted.length - 1]
    if (bestDay.orders > 0) {
      out.push({ type: 'info', title: `Meilleur jour : ${bestDay.day}`,
        body: `${bestDay.orders} commandes le ${bestDay.day}. Lancez vos promotions flash ce jour pour maximiser l'impact.`,
        action: worstDay.orders < bestDay.orders * 0.4 ? `Le ${worstDay.day} est le plus creux — bon moment pour une promo ciblée.` : undefined })
    }
  }

  if (data.byWilaya.length > 0) {
    const top = data.byWilaya[0]
    out.push({ type: 'info', title: `Zone n°1 : ${top.wilaya}`,
      body: `${top.orders} commandes (${formatPrice(top.revenue)}) — taux de livraison ${top.deliveryRate}%. Ciblez cette wilaya en priorité dans vos publicités.`,
      action: `Proposez la livraison gratuite pour ${top.wilaya} avec un code promo dédié.` })
    const highReturn = data.byWilaya.find((w) => w.returnRate > 35 && w.orders >= 3)
    if (highReturn) {
      out.push({ type: 'warn', title: `Taux de retour élevé à ${highReturn.wilaya} (${highReturn.returnRate}%)`,
        body: `${highReturn.returned} retours sur ${highReturn.orders} commandes. Cette wilaya génère plus de pertes que de gains. Envisagez la confirmation systématique avant expédition.` })
    }
  }

  if (data.topProducts.length > 0) {
    const top  = data.topProducts[0]
    const share = data.totalRevenue > 0 ? Math.round((top.revenue / data.totalRevenue) * 100) : 0
    if (share > 60) {
      out.push({ type: 'warn', title: `Dépendance au produit "${top.name}" (${share}% du CA)`,
        body: 'Un seul produit représente plus de 60% de votre chiffre d\'affaires. Diversifiez pour réduire ce risque.',
        action: 'Testez 2-3 produits complémentaires ou des variantes de couleur/taille.' })
    } else if (share > 0) {
      out.push({ type: 'tip', title: `Produit star : "${top.name}"`,
        body: `${share}% de votre CA — ${top.units} unités vendues, panier moy. ${formatPrice(top.avgPrice)}. Une vente flash à -15% peut décupler les ventes.`,
        action: 'Créez un code promo exclusif pour ce produit et partagez-le sur WhatsApp.' })
    }
  }

  if (data.pendingOrders > 5) {
    out.push({ type: 'warn', title: `${data.pendingOrders} commandes non traitées`,
      body: 'Un volume élevé de commandes en attente augmente le risque de retour et nuit à la satisfaction client.',
      action: 'Allez dans Commandes → filtrez "En attente" et traitez-les.' })
  }

  if (out.length === 0 && data.totalOrders === 0) {
    out.push({ type: 'info', title: 'Pas encore de données',
      body: 'Les recommandations apparaîtront dès votre première commande. Partagez votre boutique pour démarrer !' })
  }

  return out
}

// ── Page ─────────────────────────────────────────────────────
export default function SellerAnalyticsPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const isRTL = useRTL()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [days, setDays]         = useState(30)
  const [tab, setTab]           = useState<AnalyticsTab>('overview')
  const [data, setData]         = useState<SellerAnalytics | null>(null)
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
      ['CA Total', data.totalRevenue], ['Croissance CA %', data.revenueGrowth],
      ['Commandes', data.totalOrders], ['Croissance cmd %', data.ordersGrowth],
      ['En attente', data.pendingOrders], ['Livrées', data.deliveredOrders],
      ['Retours', data.returnedOrders], ['Panier moyen', data.avgOrderValue],
      ['Taux retour %', data.returnRate], ['Projection 30j', data.projectedRevenue],
      [''],
      ['Top Produits'], ['Nom', 'Commandes', 'Unités', 'CA', 'Prix moy'],
      ...data.topProducts.map((p) => [p.name, p.orders, p.units, p.revenue, p.avgPrice]),
      [''],
      ['Par Wilaya'], ['Wilaya', 'Commandes', 'CA', 'Panier moy', 'Livraison %', 'Retour %'],
      ...data.byWilaya.map((w) => [w.wilaya, w.orders, w.revenue, w.avgOrder, w.deliveryRate, w.returnRate]),
    ]
    const csv  = rows.map((r) => (Array.isArray(r) ? r : [r]).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `analytics-${days}j-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  if (loading || !vendor) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  const statusData = data ? [
    { name: 'En attente', value: data.pendingOrders },
    { name: 'Livrées',    value: data.deliveredOrders },
    { name: 'Retours',    value: data.returnedOrders },
    { name: 'Annulées',   value: data.cancelledOrders },
    { name: 'Autres',     value: Math.max(0, data.totalOrders - data.pendingOrders - data.deliveredOrders - data.returnedOrders - data.cancelledOrders) },
  ].filter((d) => d.value > 0) : []

  const insights = data ? generateInsights(data, days) : []

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Mobile header */}
      <div className={`lg:hidden sticky top-0 z-20 bg-gray-950 flex items-center h-14 px-4 gap-3 shadow-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-gray-300 hover:bg-gray-800" aria-label="Menu">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-semibold text-white text-sm truncate flex-1">{vendor.store_name}</span>
      </div>

      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut}
        logoUrl={vendor.logo_url} subscriptionStatus={vendor.subscription_status}
        isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />

      <main className={`flex-1 ${isRTL ? 'lg:mr-64' : 'lg:ml-64'} p-4 sm:p-8 min-w-0`}>

        {/* ── Header ──────────────────────────────────────────── */}
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
            <button onClick={load} className="border border-gray-200 bg-white p-2 rounded-xl text-gray-500 hover:bg-gray-50">
              <RefreshCw className={`w-4 h-4 ${fetching ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 border border-gray-200 bg-white px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <Download className="w-4 h-4" /><span className="hidden sm:inline">Résumé CSV</span>
            </button>
            <a href="/api/seller/analytics/export" className="flex items-center gap-1.5 border border-indigo-200 bg-indigo-50 text-indigo-700 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-100">
              <Download className="w-4 h-4" /><span className="hidden sm:inline">Commandes CSV</span>
            </a>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
          {([
            ['overview',  BarChart2,  'Vue d\'ensemble'],
            ['products',  Package,    'Produits'],
            ['geo',       MapPin,     'Wilayas'],
            ['funnel',    TrendingUp, 'Entonnoir'],
            ['insights',  Lightbulb,  'Insights'],
          ] as const).map(([key, Icon, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {label}
              {key === 'insights' && insights.some((i) => i.type === 'warn') && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
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
            {/* ══ OVERVIEW ═════════════════════════════════════ */}
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
                    {/* KPI cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <StatCard icon={DollarSign} label="CA Total"    color="indigo"
                        value={formatPrice(data.totalRevenue)} growth={data.revenueGrowth}
                        sub={`moy. ${formatPrice(data.avgOrderValue)} / cmd`} />
                      <StatCard icon={ShoppingBag} label="Commandes"  color="blue"
                        value={String(data.totalOrders)} growth={data.ordersGrowth}
                        sub={`${data.pendingOrders} en attente`} />
                      <StatCard icon={Truck}       label="Livrées"    color="green"
                        value={String(data.deliveredOrders)}
                        sub={`${data.deliveryRate}% taux livraison`} />
                      <StatCard icon={RotateCcw}   label="Taux retour" color={data.returnRate > 20 ? 'red' : 'amber'}
                        value={`${data.returnRate}%`}
                        sub={`${data.returnedOrders} retours`} />
                    </div>

                    {/* Projection + prior period */}
                    {data.projectedRevenue > 0 && (
                      <div className="flex flex-col sm:flex-row gap-3 mb-5">
                        <div className="flex items-center gap-2.5 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3 flex-1">
                          <Zap className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-indigo-500 font-semibold">Projection 30 jours (au rythme actuel)</p>
                            <p className="font-black text-indigo-700 text-lg">{formatPrice(data.projectedRevenue)}</p>
                          </div>
                        </div>
                        {data.priorRevenue > 0 && (
                          <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 flex-1">
                            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-400 font-semibold">Période précédente ({days}j avant)</p>
                              <p className="font-black text-gray-700 text-lg">{formatPrice(data.priorRevenue)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Revenue chart — per-day or monthly */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="font-bold text-gray-900">{days <= 30 ? 'CA par jour' : 'CA dans le temps'}</h2>
                        {days <= 30 && data.byDay.some((d) => d.revenue > 0) && (
                          <span className="text-xs text-gray-400">
                            Meilleur jour : {formatPrice(Math.max(...data.byDay.map((d) => d.revenue)))}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const chartData = days <= 30 ? data.byDay : data.monthly
                        const xKey      = days <= 30 ? 'date' : 'month'
                        const isEmpty   = chartData.every((d) => d.revenue === 0)
                        return isEmpty ? (
                          <p className="text-gray-400 text-sm text-center py-8">Pas de données pour cette période</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={chartData as { [k: string]: number | string }[]} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                              <defs>
                                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.3} />
                                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                              <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                                interval={days <= 7 ? 0 : days <= 30 ? 4 : 0} />
                              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                                tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                              <Tooltip content={<RevTooltip />} />
                              <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2.5} fill="url(#grad)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        )
                      })()}
                    </div>

                    {/* Status pie + Provider pie */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                      <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h2 className="font-bold text-gray-900 mb-4">Statuts des commandes</h2>
                        {statusData.length === 0 ? (
                          <p className="text-gray-400 text-sm text-center py-8">Pas de données</p>
                        ) : (
                          <div className="flex items-center gap-6">
                            <ResponsiveContainer width={160} height={160}>
                              <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" strokeWidth={0}>
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
                            <ResponsiveContainer width={160} height={160}>
                              <PieChart>
                                <Pie data={data.byProvider} cx="50%" cy="50%" outerRadius={72} dataKey="count" nameKey="provider" strokeWidth={0}>
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

                    {data.returnRate > 20 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-800">Taux de retour élevé ({data.returnRate}%)</p>
                          <p className="text-sm text-amber-700 mt-1">
                            Moyenne nationale : 15-20%. Confirmez chaque commande par WhatsApp avant l'expédition et améliorez vos descriptions produits.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ══ PRODUITS TAB ═════════════════════════════════ */}
            {tab === 'products' && (
              <>
                {data.topProducts.length === 0 ? (
                  <div className="text-center py-32 text-gray-400">
                    <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-semibold">Aucune vente sur cette période</p>
                  </div>
                ) : (
                  <>
                    {/* Star / highlight cards */}
                    {(() => {
                      const top    = data.topProducts[0]
                      const topShare = data.totalRevenue > 0 ? Math.round((top.revenue / data.totalRevenue) * 100) : 0
                      const mostUnits = [...data.topProducts].sort((a, b) => b.units - a.units)[0]
                      const bestAvg   = [...data.topProducts].filter((p) => p.orders >= 2).sort((a, b) => b.avgPrice - a.avgPrice)[0]
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-5 text-white">
                            <div className="flex items-center gap-2 mb-3">
                              <Award className="w-5 h-5 opacity-80" />
                              <p className="text-xs font-bold uppercase tracking-wide opacity-80">Meilleur CA</p>
                            </div>
                            <p className="font-black text-xl leading-tight mb-1 line-clamp-2">{top.name}</p>
                            <p className="text-2xl font-black">{formatPrice(top.revenue)}</p>
                            <p className="text-xs opacity-70 mt-1">{top.orders} cmd · {top.units} unités · {topShare}% du CA total</p>
                          </div>
                          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
                            <div className="flex items-center gap-2 mb-3">
                              <Target className="w-5 h-5 opacity-80" />
                              <p className="text-xs font-bold uppercase tracking-wide opacity-80">Plus vendu (unités)</p>
                            </div>
                            <p className="font-black text-xl leading-tight mb-1 line-clamp-2">{mostUnits.name}</p>
                            <p className="text-2xl font-black">{mostUnits.units} unités</p>
                            <p className="text-xs opacity-70 mt-1">{mostUnits.orders} commandes · {formatPrice(mostUnits.revenue)}</p>
                          </div>
                          {bestAvg && (
                            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white">
                              <div className="flex items-center gap-2 mb-3">
                                <Star className="w-5 h-5 opacity-80" />
                                <p className="text-xs font-bold uppercase tracking-wide opacity-80">Prix unitaire le plus élevé</p>
                              </div>
                              <p className="font-black text-xl leading-tight mb-1 line-clamp-2">{bestAvg.name}</p>
                              <p className="text-2xl font-black">{formatPrice(bestAvg.avgPrice)}</p>
                              <p className="text-xs opacity-70 mt-1">moy. par unité · {bestAvg.units} vendues</p>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* Horizontal bar chart of top products */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
                      <h2 className="font-bold text-gray-900 mb-4">CA par produit (Top {Math.min(data.topProducts.length, 10)})</h2>
                      <ResponsiveContainer width="100%" height={Math.max(200, Math.min(data.topProducts.length, 10) * 40)}>
                        <BarChart
                          data={data.topProducts.slice(0, 10).map((p) => ({
                            name: p.name.length > 28 ? p.name.slice(0, 26) + '…' : p.name,
                            revenue: p.revenue,
                          }))}
                          layout="vertical"
                          margin={{ left: 140, right: 60, top: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                            tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={136} />
                          <Tooltip
                            formatter={(v) => [formatPrice(Number(v ?? 0)), 'CA']}
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                          />
                          <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                            {data.topProducts.slice(0, 10).map((_, i) => (
                              <Cell key={i} fill={PRODUCT_PALETTE[i % PRODUCT_PALETTE.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Detailed product table */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                        <h2 className="font-bold text-gray-900">Tableau détaillé</h2>
                        <span className="text-xs text-gray-400">{data.topProducts.length} produit{data.topProducts.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {['#', 'Produit', 'Cmd', 'Unités', 'CA', 'Prix moy/u', 'Part CA'].map((h) => (
                                <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {data.topProducts.map((p, i) => {
                              const share = data.totalRevenue > 0 ? Math.round((p.revenue / data.totalRevenue) * 100) : 0
                              return (
                                <tr key={p.name} className={`hover:bg-gray-50 ${i === 0 ? 'bg-indigo-50/30' : ''}`}>
                                  <td className="px-4 py-3.5">
                                    {i === 0
                                      ? <span className="w-6 h-6 rounded-full bg-amber-400 text-white text-xs font-black flex items-center justify-center">★</span>
                                      : <span className="text-gray-400 font-bold text-xs">{i + 1}</span>
                                    }
                                  </td>
                                  <td className="px-4 py-3.5 font-semibold text-gray-900 max-w-[200px]">
                                    <span className="truncate block">{p.name}</span>
                                  </td>
                                  <td className="px-4 py-3.5 text-gray-600 tabular-nums">{p.orders}</td>
                                  <td className="px-4 py-3.5 text-gray-600 tabular-nums">{p.units}</td>
                                  <td className="px-4 py-3.5 font-black text-gray-900 tabular-nums">{formatPrice(p.revenue)}</td>
                                  <td className="px-4 py-3.5 text-gray-500 tabular-nums">{formatPrice(p.avgPrice)}</td>
                                  <td className="px-4 py-3.5 min-w-[100px]">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-16">
                                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${share}%` }} />
                                      </div>
                                      <span className="text-xs font-bold text-gray-500 tabular-nums">{share}%</span>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot className="bg-gray-50 border-t border-gray-100">
                            <tr>
                              <td colSpan={2} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Total</td>
                              <td className="px-4 py-3 font-black text-gray-700 tabular-nums">{data.totalOrders}</td>
                              <td className="px-4 py-3 font-black text-gray-700 tabular-nums">{data.topProducts.reduce((s, p) => s + p.units, 0)}</td>
                              <td className="px-4 py-3 font-black text-indigo-700 tabular-nums">{formatPrice(data.totalRevenue)}</td>
                              <td className="px-4 py-3 font-black text-gray-700 tabular-nums">{formatPrice(data.avgOrderValue)}</td>
                              <td className="px-4 py-3 font-bold text-gray-500">100%</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ══ GEO TAB ══════════════════════════════════════ */}
            {tab === 'geo' && (
              <>
                {data.byWilaya.length === 0 ? (
                  <div className="text-center py-32 text-gray-400">
                    <MapPin className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-semibold">Aucune donnée géographique</p>
                  </div>
                ) : (
                  <>
                    {/* Highlight cards */}
                    {(() => {
                      const topOrders   = data.byWilaya[0]
                      const topRevenue  = [...data.byWilaya].sort((a, b) => b.revenue - a.revenue)[0]
                      const bestDel     = [...data.byWilaya].filter((w) => w.orders >= 3).sort((a, b) => b.deliveryRate - a.deliveryRate)[0]
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                          <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl p-5 text-white">
                            <p className="text-xs font-bold uppercase tracking-wide opacity-80 mb-2">Plus de commandes</p>
                            <p className="font-black text-2xl">{topOrders.wilaya}</p>
                            <p className="text-3xl font-black mt-1">{topOrders.orders}</p>
                            <p className="text-xs opacity-70 mt-1">{formatPrice(topOrders.revenue)} · livraison {topOrders.deliveryRate}%</p>
                          </div>
                          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white">
                            <p className="text-xs font-bold uppercase tracking-wide opacity-80 mb-2">Meilleur CA</p>
                            <p className="font-black text-2xl">{topRevenue.wilaya}</p>
                            <p className="text-3xl font-black mt-1">{formatPrice(topRevenue.revenue)}</p>
                            <p className="text-xs opacity-70 mt-1">panier moy. {formatPrice(topRevenue.avgOrder)}</p>
                          </div>
                          {bestDel && (
                            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white">
                              <p className="text-xs font-bold uppercase tracking-wide opacity-80 mb-2">Meilleure livraison</p>
                              <p className="font-black text-2xl">{bestDel.wilaya}</p>
                              <p className="text-3xl font-black mt-1">{bestDel.deliveryRate}%</p>
                              <p className="text-xs opacity-70 mt-1">{bestDel.orders} cmd · {bestDel.delivered} livrées</p>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* Revenue + orders dual bar chart */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
                      <h2 className="font-bold text-gray-900 mb-4">Commandes par Wilaya</h2>
                      <ResponsiveContainer width="100%" height={Math.max(240, data.byWilaya.length * 36)}>
                        <BarChart
                          data={data.byWilaya.map((w) => ({ name: w.wilaya, orders: w.orders, livrees: w.delivered }))}
                          layout="vertical"
                          margin={{ left: 100, right: 30, top: 0, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={96} />
                          <Tooltip
                            formatter={(v, name) => [v, name === 'orders' ? 'Commandes' : 'Livrées']}
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                          />
                          <Legend formatter={(v) => v === 'orders' ? 'Commandes' : 'Livrées'} iconType="circle" iconSize={8} />
                          <Bar dataKey="orders"  fill="#6366F1" radius={[0, 2, 2, 0]} barSize={10} />
                          <Bar dataKey="livrees" fill="#10B981" radius={[0, 2, 2, 0]} barSize={10} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Wilaya detail table */}
                    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-gray-50">
                        <h2 className="font-bold text-gray-900">Détail par Wilaya</h2>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {['#', 'Wilaya', 'Cmd', 'CA', 'Panier moy', 'Livraison', 'Retour'].map((h) => (
                                <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {data.byWilaya.map((w, i) => (
                              <tr key={w.wilaya} className={`hover:bg-gray-50 ${i === 0 ? 'bg-indigo-50/30' : ''}`}>
                                <td className="px-4 py-3.5 text-gray-400 font-bold text-xs">{i + 1}</td>
                                <td className="px-4 py-3.5 font-semibold text-gray-900">{w.wilaya}</td>
                                <td className="px-4 py-3.5 font-bold text-gray-700 tabular-nums">{w.orders}</td>
                                <td className="px-4 py-3.5 font-black text-indigo-600 tabular-nums">{formatPrice(w.revenue)}</td>
                                <td className="px-4 py-3.5 text-gray-500 tabular-nums">{formatPrice(w.avgOrder)}</td>
                                <td className="px-4 py-3.5">
                                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    w.deliveryRate >= 70 ? 'bg-green-100 text-green-700'
                                    : w.deliveryRate >= 50 ? 'bg-amber-100 text-amber-700'
                                    : w.orders < 3 ? 'bg-gray-100 text-gray-500'
                                    : 'bg-red-100 text-red-700'
                                  }`}>
                                    {w.orders >= 2 ? `${w.deliveryRate}%` : '—'}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                    w.returnRate === 0 ? 'bg-green-100 text-green-700'
                                    : w.returnRate <= 20 ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                                  }`}>
                                    {w.orders >= 2 ? `${w.returnRate}%` : '—'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ══ FUNNEL TAB ═══════════════════════════════════ */}
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
                      <FunnelStep icon={ShoppingBag} label="Commandé"  count={data.totalOrders}    total={data.totalOrders} color="bg-blue-50 text-blue-600" />
                      <FunnelStep icon={CheckCircle} label="Confirmé"  count={data.confirmedOrders} total={data.totalOrders} color="bg-indigo-50 text-indigo-600"
                        rate={data.totalOrders > 0 ? Math.round((data.confirmedOrders / data.totalOrders) * 100) : 0} />
                      <FunnelStep icon={Truck}       label="Expédié"   count={data.shippedOrders}  total={data.totalOrders} color="bg-violet-50 text-violet-600"
                        rate={data.confirmedOrders > 0 ? Math.round((data.shippedOrders / data.confirmedOrders) * 100) : 0} />
                      <FunnelStep icon={CheckCircle} label="Livré"     count={data.deliveredOrders} total={data.totalOrders} color="bg-emerald-50 text-emerald-600"
                        rate={data.shippedOrders > 0 ? Math.round((data.deliveredOrders / data.shippedOrders) * 100) : 0} isLast />
                    </div>
                  )}
                </div>

                {data.totalOrders > 0 && (
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-white rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <p className="font-bold text-gray-900 text-sm">Annulées</p>
                      </div>
                      <p className="text-3xl font-black text-red-600">{data.cancelledOrders}</p>
                      <p className="text-xs text-gray-500 mt-1">{Math.round((data.cancelledOrders / data.totalOrders) * 100)}% du total</p>
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
                        <Tooltip formatter={(v) => [v, 'Commandes']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                        <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
                          {data.byDayOfWeek.map((d, i) => {
                            const max = Math.max(...data.byDayOfWeek.map((x) => x.orders))
                            return <Cell key={i} fill={d.orders === max ? '#6366F1' : '#c7d2fe'} />
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* ══ INSIGHTS TAB ═════════════════════════════════ */}
            {tab === 'insights' && (
              <div className="max-w-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <h2 className="font-bold text-gray-900">Recommandations personnalisées</h2>
                  <span className="text-xs text-gray-400 ml-auto">Basé sur les {days} derniers jours</span>
                </div>
                <div className="space-y-3">
                  {insights.map((insight, i) => <InsightCard key={i} {...insight} />)}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
