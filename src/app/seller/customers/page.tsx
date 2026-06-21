'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, Phone, MapPin, ShoppingBag, TrendingUp,
  Eye, EyeOff, Search, RefreshCw, ChevronRight, Award,
} from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { formatPrice } from '@/lib/utils'
import SellerSidebar from '@/components/seller/SellerSidebar'

interface CustomerSummary {
  phoneHash:     string
  maskedPhone:   string
  displayName:   string
  wilaya:        string | null
  orderCount:    number
  lifetimeValue: number
  deliveryRate:  number
  lastOrderAt:   string
}

function StatCard({ icon: Icon, label, value, color = 'indigo' }: {
  icon: React.ElementType; label: string; value: string; color?: string
}) {
  const bg: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    blue:   'bg-blue-50 text-blue-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
      <div className={`p-3 rounded-lg ${bg[color]}`}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export default function SellerCustomersPage() {
  const { vendor, loading: authLoading, signOut } = useSellerAuth()
  const [customers, setCustomers]   = useState<CustomerSummary[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [search, setSearch]         = useState('')
  const [revealed, setRevealed]     = useState<Record<string, string>>({})
  const [revealing, setRevealing]   = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const fetchCustomers = useCallback(async () => {
    if (!vendor) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/seller/customers')
      if (!res.ok) throw new Error(await res.text())
      setCustomers(await res.json())
    } catch {
      setError('Impossible de charger les clients.')
    } finally {
      setLoading(false)
    }
  }, [vendor])

  useEffect(() => { if (!authLoading && vendor) fetchCustomers() }, [authLoading, vendor, fetchCustomers])

  async function revealPhone(phoneHash: string) {
    if (revealed[phoneHash] || revealing) return
    setRevealing(phoneHash)
    try {
      const res = await fetch('/api/seller/customers/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneHash }),
      })
      if (!res.ok) throw new Error()
      const { phone } = await res.json()
      setRevealed((prev) => ({ ...prev, [phoneHash]: phone }))
    } catch {
      alert('Impossible de révéler ce numéro. Réessayez.')
    } finally {
      setRevealing(null)
    }
  }

  const filtered = customers.filter((c) =>
    c.displayName.toLowerCase().includes(search.toLowerCase()) ||
    c.maskedPhone.includes(search) ||
    (c.wilaya ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const totalLTV   = customers.reduce((s, c) => s + c.lifetimeValue, 0)
  const avgOrders  = customers.length > 0 ? (customers.reduce((s, c) => s + c.orderCount, 0) / customers.length).toFixed(1) : '0'
  const repeatBuyers = customers.filter((c) => c.orderCount > 1).length

  if (authLoading || !vendor) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <SellerSidebar
        storeName={vendor.store_name}
        slug={vendor.store_slug}
        onLogout={signOut}
        logoUrl={vendor.logo_url}
        subscriptionStatus={vendor.subscription_status}
        isMobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      <main className="lg:ml-64 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-sm text-gray-500 mt-0.5">{customers.length} clients uniques</p>
          </div>
          <button onClick={fetchCustomers} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Users}     label="Total clients"   value={String(customers.length)} color="indigo" />
          <StatCard icon={Award}     label="Acheteurs fidèles" value={String(repeatBuyers)} color="amber" />
          <StatCard icon={ShoppingBag} label="Cmds moy./client" value={avgOrders} color="blue" />
          <StatCard icon={TrendingUp} label="LTV total"       value={formatPrice(totalLTV)} color="green" />
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4">
          <div className="p-4 border-b border-gray-100 flex items-center gap-3">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, téléphone, wilaya…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
          </div>

          {error && <p className="p-4 text-sm text-red-500">{error}</p>}

          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Aucun client trouvé.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <div key={c.phoneHash} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-700 font-bold text-sm">{c.displayName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{c.displayName}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="w-3 h-3" />
                          {revealed[c.phoneHash] ?? c.maskedPhone}
                        </span>
                        {c.wilaya && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />{c.wilaya}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-shrink-0 ml-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">Commandes</p>
                      <p className="text-sm font-semibold text-gray-900">{c.orderCount}</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-gray-500">LTV</p>
                      <p className="text-sm font-semibold text-gray-900">{formatPrice(c.lifetimeValue)}</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-gray-500">Livraison</p>
                      <p className={`text-sm font-semibold ${c.deliveryRate >= 70 ? 'text-green-600' : c.deliveryRate >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                        {c.deliveryRate}%
                      </p>
                    </div>
                    <button
                      onClick={() => revealPhone(c.phoneHash)}
                      disabled={!!revealed[c.phoneHash] || revealing === c.phoneHash}
                      title={revealed[c.phoneHash] ? 'Numéro révélé' : 'Révéler le numéro'}
                      className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40"
                    >
                      {revealing === c.phoneHash
                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                        : revealed[c.phoneHash]
                          ? <EyeOff className="w-4 h-4 text-indigo-500" />
                          : <Eye className="w-4 h-4" />}
                    </button>
                    <ChevronRight className="w-4 h-4 text-gray-300 hidden sm:block" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Les numéros sont masqués par défaut. Chaque révélation est enregistrée dans le journal d&apos;audit.
        </p>
      </main>
    </div>
  )
}
