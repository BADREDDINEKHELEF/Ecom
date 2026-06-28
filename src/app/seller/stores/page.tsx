'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Store, Plus, ExternalLink, CheckCircle2, XCircle, Clock,
  Settings, AlertCircle, RefreshCw, Crown, ChevronRight, Menu,
} from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { useRTL } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'
import { ALL_WILAYAS } from '@/lib/data/wilayas'

interface StoreItem {
  id: string
  store_name: string
  store_slug: string
  logo_url: string | null
  is_active: boolean
  is_approved: boolean
  subscription_status: string | null
  subscription_plan_id: string | null
  wilaya: string | null
  created_at: string
}

const SUB_STATUS: Record<string, { label: string; color: string }> = {
  active:       { label: 'Actif',         color: 'bg-emerald-100 text-emerald-700' },
  trial:        { label: 'Essai',          color: 'bg-blue-100 text-blue-700' },
  grace_period: { label: 'PÃƒÂ©riode grace', color: 'bg-amber-100 text-amber-700' },
  expired:      { label: 'ExpirÃƒÂ©',        color: 'bg-red-100 text-red-700' },
  none:         { label: 'Sans plan',     color: 'bg-gray-100 text-gray-500' },
}

export default function SellerStoresPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const isRTL = useRTL()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stores, setStores] = useState<StoreItem[]>([])
  const [fetching, setFetching] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ store_name: '', store_slug: '', description: '', phone: '', wilaya: '' })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [toggleLoading, setToggleLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!vendor) return
    fetch('/api/seller/stores')
      .then((r) => r.json())
      .then((d) => setStores(d.stores ?? []))
      .finally(() => setFetching(false))
  }, [vendor])

  // Auto-fill slug from store_name
  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setForm((f) => ({ ...f, store_name: name, store_slug: slug }))
  }

  const handleCreate = async () => {
    if (!form.store_name || !form.store_slug) return
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/seller/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error ?? 'Erreur')
        if (data.upgradeRequired) {
          setCreateError(data.error + ' Visitez la page Abonnement pour upgrader.')
        }
      } else {
        setStores((prev) => [...prev, data.store])
        setShowCreate(false)
        setForm({ store_name: '', store_slug: '', description: '', phone: '', wilaya: '' })
      }
    } catch {
      setCreateError('Erreur rÃƒÂ©seau.')
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (store: StoreItem) => {
    setToggleLoading(store.id)
    await fetch('/api/seller/stores', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: store.id, is_active: !store.is_active }),
    })
    setStores((prev) => prev.map((s) => s.id === store.id ? { ...s, is_active: !s.is_active } : s))
    setToggleLoading(null)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!vendor) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg:hidden sticky top-0 z-20 bg-gray-950 flex items-center h-14 px-4 gap-3 shadow-sm">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors" aria-label="Menu"><Menu className="w-5 h-5" /></button>
        <span className="font-semibold text-white text-sm truncate flex-1">{vendor.store_name}</span>
      </div>
      <SellerSidebar storeName={vendor.store_name!} slug={vendor.store_slug!} onLogout={signOut}
        subscriptionStatus={vendor.subscription_status}
        isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <main className={`flex-1 ${isRTL ? 'lg:mr-64' : 'lg:ml-64'} p-4 sm:p-8 min-w-0`}>
        <div className="max-w-3xl">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Mes Boutiques</h1>
              <p className="text-gray-500 text-sm mt-1">GÃƒÂ©rez toutes vos boutiques depuis un seul compte</p>
            </div>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Nouvelle boutique
            </button>
          </div>

          {/* Create form */}
          {showCreate && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
              <h2 className="font-bold text-gray-900 mb-5">CrÃƒÂ©er une nouvelle boutique</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Nom de la boutique *</label>
                  <input type="text" value={form.store_name} onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ma Boutique AlgÃƒÂ©rienne"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">URL de la boutique *</label>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                    <span className="px-3 text-xs text-gray-400 bg-gray-50 h-full flex items-center border-r border-gray-200 py-2.5">/shop/</span>
                    <input type="text" value={form.store_slug} onChange={(e) => setForm((f) => ({ ...f, store_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                      placeholder="ma-boutique"
                      className="flex-1 px-3 py-2.5 text-sm focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">TÃƒÂ©lÃƒÂ©phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="05xx xxx xxx"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Wilaya</label>
                  <select value={form.wilaya} onChange={(e) => setForm((f) => ({ ...f, wilaya: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                    <option value="">SÃƒÂ©lectionnezÃ¢â‚¬Â¦</option>
                    {ALL_WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Que vendez-vous ?"
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
                </div>
              </div>
              {createError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {createError}
                  {createError.includes('Abonnement') && (
                    <Link href="/seller/subscription" className="ml-1 text-red-800 font-bold underline">Voir les plans Ã¢â€ â€™</Link>
                  )}
                </div>
              )}
              <div className="mt-5 flex items-center gap-3">
                <button onClick={handleCreate} disabled={creating || !form.store_name || !form.store_slug}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white font-bold px-6 py-2.5 rounded-xl transition-colors text-sm">
                  {creating ? <><RefreshCw className="w-4 h-4 animate-spin" /> CrÃƒÂ©ationÃ¢â‚¬Â¦</> : <><Plus className="w-4 h-4" /> CrÃƒÂ©er la boutique</>}
                </button>
                <button onClick={() => setShowCreate(false)} className="text-sm text-gray-500 hover:text-gray-800 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Stores list */}
          {fetching ? (
            <div className="space-y-3">
              {[1,2].map((i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}
            </div>
          ) : stores.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <Store className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucune boutique trouvÃƒÂ©e</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stores.map((store) => {
                const sub = SUB_STATUS[store.subscription_status ?? 'none'] ?? SUB_STATUS.none
                const isCurrentStore = store.id === vendor.id
                return (
                  <div key={store.id} className={`bg-white rounded-2xl p-5 shadow-sm border transition-colors ${
                    isCurrentStore ? 'border-emerald-400' : 'border-gray-100'
                  }`}>
                    <div className="flex items-center gap-4">
                      {/* Logo / icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isCurrentStore ? 'bg-emerald-100' : 'bg-gray-100'
                      }`}>
                        {store.logo_url
                          ? <Image src={store.logo_url} alt={store.store_name} width={48} height={48} className="w-full h-full rounded-xl object-cover" />
                          : <Store className={`w-6 h-6 ${isCurrentStore ? 'text-emerald-600' : 'text-gray-400'}`} />
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900">{store.store_name}</p>
                          {isCurrentStore && (
                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">ACTUELLE</span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sub.color}`}>
                            {sub.label}
                          </span>
                          {store.is_approved ? (
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5" /> ApprouvÃƒÂ©e
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> En attente
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">/shop/{store.store_slug} Ã‚Â· {store.wilaya ?? 'Ã¢â‚¬â€'}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Active toggle */}
                        <button onClick={() => toggleActive(store)} disabled={toggleLoading === store.id}
                          title={store.is_active ? 'DÃƒÂ©sactiver' : 'Activer'}
                          className={`p-2 rounded-xl transition-colors ${
                            store.is_active
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}>
                          {toggleLoading === store.id
                            ? <RefreshCw className="w-4 h-4 animate-spin" />
                            : store.is_active ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />
                          }
                        </button>

                        {/* View store */}
                        <a href={`/shop/${store.store_slug}`} target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        {/* Settings */}
                        <Link href={`/seller/settings?store=${store.id}`}
                          className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                          <Settings className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Upgrade CTA */}
          {stores.length >= 1 && (
            <div className="mt-6 bg-gradient-to-r from-violet-50 to-emerald-50 border border-violet-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm">GÃƒÂ©rez jusqu&apos;ÃƒÂ  10 boutiques</p>
                <p className="text-xs text-gray-500 mt-0.5">Passez au plan Professionnel (3 boutiques) ou Entreprise (10 boutiques).</p>
              </div>
              <Link href="/seller/subscription"
                className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors flex-shrink-0">
                Voir les plans <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
