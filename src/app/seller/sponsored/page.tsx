'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Zap, Plus, Eye, MousePointerClick, ShoppingCart, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, Menu } from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { useRTL } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'
import { getVendorProducts } from '@/lib/supabase/products'
import type { Product } from '@/types'

interface SponsoredProduct {
  id: string
  product_id: string
  placement: string
  status: 'pending' | 'active' | 'paused' | 'rejected' | 'expired'
  starts_at: string
  ends_at: string
  impressions: number
  clicks: number
  conversions: number
  amount_dzd: number
  admin_note: string | null
  product_name?: string
  product_image?: string | null
}

const STATUS_CFG = {
  pending:  { label: 'En attente',  color: 'bg-blue-100 text-blue-700',      icon: Clock },
  active:   { label: 'Actif',       color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  paused:   { label: 'En pause',    color: 'bg-gray-100 text-gray-600',      icon: AlertCircle },
  rejected: { label: 'RefusÃ©',      color: 'bg-red-100 text-red-700',        icon: XCircle },
  expired:  { label: 'ExpirÃ©',      color: 'bg-gray-100 text-gray-500',      icon: Clock },
} as const

const PLACEMENTS = [
  { id: 'homepage', label: 'Page d\'accueil', desc: 'Section "Produits SponsorisÃ©s" sur la page principale', price: 1500 },
  { id: 'category', label: 'Page catÃ©gorie', desc: 'En haut des pages de catÃ©gorie de votre niche', price: 1000 },
  { id: 'search',   label: 'RÃ©sultats de recherche', desc: 'Mis en avant dans les rÃ©sultats de recherche', price: 800 },
  { id: 'all',      label: 'Toutes les pages', desc: 'PrÃ©sence maximale â€” homepage + catÃ©gorie + recherche', price: 3000 },
]

const DURATIONS = [
  { days: 7, label: '7 jours' },
  { days: 14, label: '14 jours' },
  { days: 30, label: '30 jours' },
]

export default function SellerSponsoredPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const isRTL = useRTL()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sponsored, setSponsored] = useState<SponsoredProduct[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [fetching, setFetching] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [placement, setPlacement] = useState('homepage')
  const [duration, setDuration] = useState(7)
  const [paymentRef, setPaymentRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!vendor) return
    Promise.all([
      fetch('/api/seller/sponsored')
        .then((r) => { if (!r.ok) throw new Error('fetch failed'); return r.json() })
        .then((d) => (Array.isArray(d.sponsored) ? d.sponsored : [])),
      getVendorProducts(vendor.id),
    ]).then(([sp, prods]) => {
      setSponsored(sp)
      setProducts(prods)
    }).catch((err) => { console.error('[seller/sponsored] fetch failed:', err instanceof Error ? err.message : String(err)) })
    .finally(() => setFetching(false))
  }, [vendor])

  const selectedPlacement = PLACEMENTS.find((p) => p.id === placement)
  const totalAmount = (selectedPlacement?.price ?? 0) * Math.ceil(duration / 7)

  const handleSubmit = async () => {
    if (!selectedProduct || !placement) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/seller/sponsored', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct,
          placement,
          duration_days: duration,
          amount_dzd: totalAmount,
          payment_reference: paymentRef || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setSubmitError(d.error ?? 'Erreur')
      } else {
        const d = await res.json()
        setSponsored((prev) => [d.sponsored, ...prev])
        setSuccess(true)
        setShowForm(false)
        setSelectedProduct('')
        setPaymentRef('')
      }
    } catch {
      setSubmitError('Erreur rÃ©seau. RÃ©essayez.')
    } finally {
      setSubmitting(false)
    }
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
      <SellerSidebar storeName={vendor.store_name!} slug={vendor.store_slug!} onLogout={signOut} logoUrl={vendor.logo_url}
        subscriptionStatus={vendor.subscription_status}
        isMobileOpen={sidebarOpen} onMobileClose={() => setSidebarOpen(false)} />
      <main className={`flex-1 ${isRTL ? 'lg:mr-64' : 'lg:ml-64'} p-4 sm:p-8 min-w-0`}>
        <div className="max-w-4xl">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-amber-500" />
                <h1 className="text-2xl font-black text-gray-900">Produits SponsorisÃ©s</h1>
              </div>
              <p className="text-gray-500 text-sm">Boostez la visibilitÃ© de vos produits sur StoreDz</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Sponsoriser un produit
            </button>
          </div>

          {/* Success */}
          {success && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-800">Demande envoyÃ©e !</p>
                <p className="text-sm text-emerald-700 mt-0.5">Notre Ã©quipe examinera votre demande dans les 24h.</p>
              </div>
            </div>
          )}

          {/* New promotion form */}
          {showForm && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
              <h2 className="font-bold text-gray-900 mb-5">Nouvelle promotion</h2>

              {/* Product selection */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">Produit Ã  sponsoriser</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                  <option value="">SÃ©lectionnez un produitâ€¦</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Placement */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">Emplacement</label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {PLACEMENTS.map((pl) => (
                    <button key={pl.id}
                      onClick={() => setPlacement(pl.id)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        placement === pl.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm text-gray-900">{pl.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{pl.desc}</p>
                        </div>
                        <p className="text-sm font-black text-emerald-600 flex-shrink-0">{pl.price.toLocaleString()} DZD/sem.</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">DurÃ©e</label>
                <div className="flex gap-3">
                  {DURATIONS.map((d) => (
                    <button key={d.days}
                      onClick={() => setDuration(d.days)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                        duration === d.days ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">Total Ã  payer</p>
                  <p className="text-lg font-black text-emerald-600">{totalAmount.toLocaleString()} DZD</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Envoyez ce montant via BaridiMob ou CCP et entrez la rÃ©fÃ©rence ci-dessous.
                </p>
              </div>

              {/* Payment reference */}
              <div className="mb-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  RÃ©fÃ©rence de paiement <span className="font-normal text-gray-400">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="RÃ©fÃ©rence de la transaction"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {submitError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{submitError}</div>
              )}

              <button
                onClick={handleSubmit}
                disabled={submitting || !selectedProduct}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 text-white font-bold px-6 py-3 rounded-xl transition-colors">
                {submitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Envoiâ€¦</> : 'Soumettre la demande'}
              </button>
            </div>
          )}

          {/* Active / past promotions */}
          <h2 className="font-bold text-gray-900 mb-4">Mes promotions</h2>
          {fetching ? (
            <div className="space-y-3">
              {[1,2].map((i) => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />)}
            </div>
          ) : sponsored.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <Zap className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucune promotion pour l&apos;instant</p>
              <p className="text-sm text-gray-400 mt-1">Sponsorisez un produit pour augmenter sa visibilitÃ©.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sponsored.map((sp) => {
                const cfg = STATUS_CFG[sp.status] ?? STATUS_CFG.pending
                const Icon = cfg.icon
                const product = products.find((p) => p.id === sp.product_id)
                const img = sp.product_image ?? product?.images[0]
                return (
                  <div key={sp.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
                    {img ? (
                      <Image src={img} alt="" width={56} height={56} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Zap className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{sp.product_name ?? product?.name ?? 'Produit'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cfg.color}`}>
                          <Icon className="w-3 h-3" />{cfg.label}
                        </span>
                        <span className="text-xs text-gray-400 capitalize">{PLACEMENTS.find((p) => p.id === sp.placement)?.label ?? sp.placement}</span>
                        <span className="text-xs text-gray-400">
                          {new Date(sp.ends_at).toLocaleDateString('fr-DZ', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-center flex-shrink-0">
                      <div>
                        <div className="flex items-center gap-1 text-gray-500 justify-center mb-0.5">
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-xs">Vues</span>
                        </div>
                        <p className="text-sm font-black text-gray-900">{sp.impressions.toLocaleString()}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-gray-500 justify-center mb-0.5">
                          <MousePointerClick className="w-3.5 h-3.5" />
                          <span className="text-xs">Clics</span>
                        </div>
                        <p className="text-sm font-black text-gray-900">{sp.clicks.toLocaleString()}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-gray-500 justify-center mb-0.5">
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span className="text-xs">Conv.</span>
                        </div>
                        <p className="text-sm font-black text-gray-900">{sp.conversions.toLocaleString()}</p>
                      </div>
                    </div>
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
