'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShoppingCart, RefreshCw, MessageCircle, Check, X, Loader2, TrendingUp, Clock, DollarSign, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'

interface AbandonedCheckout {
  id: string
  session_id: string
  name: string | null
  phone: string | null
  wilaya: string | null
  address: string | null
  cart_snapshot: Array<{ id: string; name: string; quantity: number; price: number }> | null
  cart_total: number
  status: 'abandoned' | 'recovered' | 'ignored'
  created_at: string
  updated_at: string
  recovered_at: string | null
  order_id: string | null
  seller_notified_at: string | null
}

type FilterPeriod = 'today' | 'week' | 'all'

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'À l\'instant'
  if (mins < 60) return `Il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Il y a ${hrs}h`
  return `Il y a ${Math.floor(hrs / 24)}j`
}

function buildWhatsAppMsg(row: AbandonedCheckout): string {
  const name = row.name ? row.name.split(' ')[0] : 'client'
  const items = row.cart_snapshot?.slice(0, 2).map((i) => i.name).join(', ') ?? 'vos articles'
  const total = formatPrice(row.cart_total)
  const msg = `Salam ${name} 👋 Vous avez laissé *${items}* dans votre panier (${total}). Voulez-vous finaliser votre commande ? 🛍️ Répondez OUI et on vous confirme tout de suite !`
  return `https://wa.me/${row.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`
}

export default function AbandonedCheckoutsPage() {
  const [rows, setRows] = useState<AbandonedCheckout[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterPeriod>('today')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    let query = supabase
      .from('abandoned_checkouts')
      .select('*')
      .eq('status', 'abandoned')
      .order('cart_total', { ascending: false })

    if (filter === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0)
      query = query.gte('created_at', start.toISOString())
    } else if (filter === 'week') {
      const start = new Date(); start.setDate(start.getDate() - 7)
      query = query.gte('created_at', start.toISOString())
    }

    const { data } = await query.limit(100)
    setRows((data ?? []) as AbandonedCheckout[])
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(load, 120_000)
    return () => clearInterval(interval)
  }, [load])

  const updateStatus = async (id: string, status: 'recovered' | 'ignored') => {
    setUpdating(id)
    const supabase = createClient()
    await supabase.from('abandoned_checkouts').update({
      status,
      ...(status === 'recovered' ? { recovered_at: new Date().toISOString() } : {}),
    }).eq('id', id)
    setRows((prev) => prev.filter((r) => r.id !== id))
    setUpdating(null)
  }

  // Stats
  const totalRevAtRisk = rows.reduce((s, r) => s + r.cart_total, 0)
  const withPhone = rows.filter((r) => r.phone).length

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Paniers Abandonnés</h1>
          <p className="text-gray-500 text-sm mt-1">Récupérez les commandes perdues via WhatsApp</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: ShoppingCart, label: 'Abandonnés', value: rows.length, color: 'text-red-500', bg: 'bg-red-50' },
          { icon: DollarSign, label: 'Revenus à risque', value: formatPrice(totalRevAtRisk), color: 'text-amber-500', bg: 'bg-amber-50' },
          { icon: Users, label: 'Avec WhatsApp', value: withPhone, color: 'text-green-500', bg: 'bg-green-50' },
          { icon: TrendingUp, label: 'Récupérables', value: `${withPhone > 0 ? Math.round((withPhone / rows.length) * 100) : 0}%`, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Period filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 flex items-center gap-2">
        {(['today', 'week', 'all'] as FilterPeriod[]).map((p) => (
          <button key={p} onClick={() => setFilter(p)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filter === p ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {p === 'today' ? "Aujourd'hui" : p === 'week' ? '7 derniers jours' : 'Tout voir'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">Aucun panier abandonné pour cette période.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Client', 'Téléphone', 'Wilaya', 'Panier', 'Produits', 'Temps', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900">{row.name ?? '—'}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{row.phone ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-600">{row.wilaya ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-gray-900">{formatPrice(row.cart_total)}</span>
                    </td>
                    <td className="px-5 py-3.5 max-w-[200px]">
                      <p className="text-xs text-gray-500 truncate">
                        {row.cart_snapshot?.map((i) => `${i.name} ×${i.quantity}`).join(', ') ?? '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <Clock className="w-3 h-3" />
                        {timeAgo(row.updated_at)}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        {row.phone && (
                          <a href={buildWhatsAppMsg(row)} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors">
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        )}
                        <button onClick={() => updateStatus(row.id, 'recovered')} disabled={updating === row.id}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Marquer récupéré">
                          {updating === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button onClick={() => updateStatus(row.id, 'ignored')} disabled={updating === row.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Ignorer">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SQL Setup notice */}
      <details className="mt-6 bg-gray-50 rounded-2xl p-4">
        <summary className="text-sm font-semibold text-gray-600 cursor-pointer">SQL Supabase requis</summary>
        <pre className="text-xs text-gray-500 mt-3 overflow-x-auto whitespace-pre-wrap">{SQL}</pre>
      </details>
    </div>
  )
}

const SQL = `-- Run in Supabase SQL editor
create table if not exists abandoned_checkouts (
  id                  uuid primary key default gen_random_uuid(),
  session_id          text unique not null,
  name                text,
  phone               text,
  wilaya              text,
  address             text,
  cart_snapshot       jsonb,
  cart_total          numeric(10,2) default 0,
  status              text not null default 'abandoned' check (status in ('abandoned','recovered','ignored')),
  order_id            uuid references orders(id) on delete set null,
  seller_notified_at  timestamptz,
  recovered_at        timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists idx_abandoned_status on abandoned_checkouts(status);
create index if not exists idx_abandoned_created on abandoned_checkouts(created_at desc);
create index if not exists idx_abandoned_phone on abandoned_checkouts(phone);`
