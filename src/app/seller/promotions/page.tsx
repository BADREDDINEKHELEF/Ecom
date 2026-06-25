'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Tag, Zap, Plus, X, Check, Loader2, Copy, CheckCheck,
  Percent, DollarSign, Clock, Trash2, Share2, Menu,
} from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { getVendorProducts } from '@/lib/supabase/queries'
import { formatPrice } from '@/lib/utils'
import { useRTL } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'
import type { Product } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PromoCode {
  id:            string
  code:          string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order:     number
  max_uses:      number | null
  uses_count:    number
  expires_at:    string | null
  is_active:     boolean
  free_shipping: boolean
  one_per_buyer: boolean
  created_at:    string
}

interface FlashSale {
  id:          string
  product_id:  string
  flash_price: number
  stock_limit: number | null
  sold_count:  number
  starts_at:   string
  ends_at:     string
  is_active:   boolean
}

type PromoTab = 'codes' | 'flash'

function generateCode() {
  return 'PROMO' + crypto.randomUUID().replace(/-/g, '').slice(0, 5).toUpperCase()
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SellerPromotionsPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const isRTL = useRTL()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tab, setTab]           = useState<PromoTab>('codes')
  const [products, setProducts] = useState<Product[]>([])
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([])
  const [flashSales, setFlashSales] = useState<FlashSale[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [copied, setCopied]     = useState<string | null>(null)

  // Promo code form
  const [showPromoForm, setShowPromoForm] = useState(false)
  const [promoForm, setPromoForm] = useState({
    code: generateCode(), discount_type: 'percentage' as 'percentage'|'fixed',
    discount_value: 10, min_order: 0, max_uses: '', expires_at: '',
    free_shipping: false, one_per_buyer: false,
  })
  const [savingPromo, setSavingPromo] = useState(false)

  // Flash sale form
  const [showFlashForm, setShowFlashForm] = useState(false)
  const [flashForm, setFlashForm] = useState({
    product_id: '', flash_price: 0, stock_limit: '',
    starts_at: '', ends_at: '',
  })
  const [savingFlash, setSavingFlash] = useState(false)

  const load = useCallback(async () => {
    if (!vendor) return
    setLoadingData(true)
    const [prods, codesRes, flashRes] = await Promise.all([
      getVendorProducts(vendor.id),
      fetch('/api/seller/promo-codes'),
      fetch('/api/seller/flash-sales'),
    ])
    setProducts(prods)
    if (codesRes.ok) setPromoCodes((await codesRes.json()).codes ?? [])
    if (flashRes.ok) setFlashSales((await flashRes.json()).flashSales ?? [])
    setLoadingData(false)
  }, [vendor])

  useEffect(() => { load() }, [load])

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const shareWhatsApp = (code: PromoCode) => {
    const discount = code.discount_type === 'percentage'
      ? `${code.discount_value}% de réduction`
      : `${formatPrice(code.discount_value)} de réduction`
    const msg = encodeURIComponent(
      `🎁 Code promo exclusif : *${code.code}*\n${discount} sur votre commande.\n${code.min_order > 0 ? `Commande minimum : ${formatPrice(code.min_order)}.\n` : ''}${code.expires_at ? `Valable jusqu\'au ${new Date(code.expires_at).toLocaleDateString('fr-DZ')}.\n` : ''}Commandez sur storedz.dz/shop/${vendor?.store_slug}`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  const savePromoCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendor) return
    setSavingPromo(true)
    try {
      const res = await fetch('/api/seller/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...promoForm,
          vendor_id:  vendor.id,
          max_uses:   promoForm.max_uses ? Number(promoForm.max_uses) : null,
          expires_at: promoForm.expires_at || null,
          min_order:  promoForm.min_order || 0,
        }),
      })
      if (res.ok) {
        const { code } = await res.json()
        setPromoCodes((prev) => [code, ...prev])
        setShowPromoForm(false)
        setPromoForm({ code: generateCode(), discount_type: 'percentage', discount_value: 10, min_order: 0, max_uses: '', expires_at: '', free_shipping: false, one_per_buyer: false })
      }
    } finally {
      setSavingPromo(false)
    }
  }

  const saveFlashSale = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendor) return
    setSavingFlash(true)
    try {
      const res = await fetch('/api/seller/flash-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...flashForm,
          vendor_id:   vendor.id,
          stock_limit: flashForm.stock_limit ? Number(flashForm.stock_limit) : null,
        }),
      })
      if (res.ok) {
        const { flashSale } = await res.json()
        setFlashSales((prev) => [flashSale, ...prev])
        setShowFlashForm(false)
        setFlashForm({ product_id: '', flash_price: 0, stock_limit: '', starts_at: '', ends_at: '' })
      }
    } finally {
      setSavingFlash(false)
    }
  }

  const togglePromoActive = async (id: string, current: boolean) => {
    await fetch('/api/seller/promo-codes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !current }),
    })
    setPromoCodes((prev) => prev.map((c) => c.id === id ? { ...c, is_active: !current } : c))
  }

  if (loading || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const selectedProduct = products.find((p) => p.id === flashForm.product_id)
  const flashDiscount   = selectedProduct && flashForm.flash_price > 0
    ? Math.round((1 - flashForm.flash_price / selectedProduct.price) * 100)
    : 0

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
              <Tag className="w-6 h-6 text-emerald-600" /> Promotions
            </h1>
            <p className="text-gray-500 text-sm mt-1">Codes promo, ventes flash, offres spéciales</p>
          </div>
          <button onClick={() => tab === 'codes' ? setShowPromoForm(true) : setShowFlashForm(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-700 text-sm">
            <Plus className="w-4 h-4" />
            {tab === 'codes' ? 'Nouveau code promo' : 'Nouvelle vente flash'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
          {([['codes', <Tag className="w-4 h-4" key="t" />, 'Codes promo'],
             ['flash', <Zap className="w-4 h-4" key="z" />, 'Ventes flash']] as const).map(([key, icon, label]) => (
            <button key={key} onClick={() => setTab(key as PromoTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ── PROMO CODES ─────────────────────────────────────────────────── */}
        {tab === 'codes' && (
          <>
            {/* Create form */}
            {showPromoForm && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 mb-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-gray-900">Créer un code promo</h2>
                  <button onClick={() => setShowPromoForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <form onSubmit={savePromoCode} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Code</label>
                    <div className="flex gap-2">
                      <input required type="text" value={promoForm.code} onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:outline-none focus:border-emerald-400" />
                      <button type="button" onClick={() => setPromoForm({ ...promoForm, code: generateCode() })}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                        Générer
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Type de réduction</label>
                    <div className="flex gap-2">
                      {(['percentage', 'fixed'] as const).map((type) => (
                        <button key={type} type="button"
                          onClick={() => setPromoForm({ ...promoForm, discount_type: type })}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold flex-1 justify-center ${
                            promoForm.discount_type === type
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 text-gray-700'
                          }`}>
                          {type === 'percentage' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                          {type === 'percentage' ? 'Pourcentage' : 'Montant fixe'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                      Valeur {promoForm.discount_type === 'percentage' ? '(%)' : '(DA)'}
                    </label>
                    <input required type="number" min="1" value={promoForm.discount_value}
                      onChange={(e) => setPromoForm({ ...promoForm, discount_value: Number(e.target.value) })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Commande minimum (DA)</label>
                    <input type="number" min="0" value={promoForm.min_order || ''}
                      onChange={(e) => setPromoForm({ ...promoForm, min_order: Number(e.target.value) })}
                      placeholder="0 = pas de minimum"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Utilisations max</label>
                    <input type="number" min="1" value={promoForm.max_uses}
                      onChange={(e) => setPromoForm({ ...promoForm, max_uses: e.target.value })}
                      placeholder="Illimité"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Expiration</label>
                    <input type="datetime-local" value={promoForm.expires_at}
                      onChange={(e) => setPromoForm({ ...promoForm, expires_at: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
                  </div>

                  <div className="sm:col-span-2 flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={promoForm.free_shipping}
                        onChange={(e) => setPromoForm({ ...promoForm, free_shipping: e.target.checked })}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-sm font-medium text-gray-700">Livraison gratuite</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={promoForm.one_per_buyer}
                        onChange={(e) => setPromoForm({ ...promoForm, one_per_buyer: e.target.checked })}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-sm font-medium text-gray-700">1 utilisation par acheteur</span>
                    </label>
                  </div>

                  <div className="sm:col-span-2 flex gap-3">
                    <button type="submit" disabled={savingPromo}
                      className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-60 text-sm">
                      {savingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Créer le code
                    </button>
                    <button type="button" onClick={() => setShowPromoForm(false)}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Promo codes list */}
            {loadingData ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : promoCodes.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center text-gray-400">
                <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Aucun code promo</p>
                <button onClick={() => setShowPromoForm(true)} className="mt-2 text-emerald-600 font-bold text-sm hover:underline">Créer votre premier code →</button>
              </div>
            ) : (
              <div className="space-y-3">
                {promoCodes.map((code) => {
                  const isExpired = code.expires_at ? new Date(code.expires_at) < new Date() : false
                  return (
                    <div key={code.id} className={`bg-white rounded-2xl p-5 shadow-sm border ${!code.is_active || isExpired ? 'opacity-60 border-gray-100' : 'border-gray-100'}`}>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1.5">
                            <span className="font-mono text-lg font-black text-gray-900 tracking-wider">{code.code}</span>
                            <button onClick={() => copyCode(code.code)} className="text-gray-400 hover:text-gray-600">
                              {copied === code.code ? <CheckCheck className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              !code.is_active || isExpired
                                ? 'bg-gray-100 text-gray-500'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {isExpired ? 'Expiré' : code.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span>
                              {code.discount_type === 'percentage'
                                ? `${code.discount_value}% de réduction`
                                : `${formatPrice(code.discount_value)} de réduction`}
                            </span>
                            {code.min_order > 0 && <span>Min: {formatPrice(code.min_order)}</span>}
                            {code.max_uses && <span>{code.uses_count}/{code.max_uses} utilisations</span>}
                            {!code.max_uses && <span>{code.uses_count} utilisations</span>}
                            {code.expires_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Expire {new Date(code.expires_at).toLocaleDateString('fr-DZ')}
                              </span>
                            )}
                            {code.free_shipping && <span>🚚 Livraison offerte</span>}
                            {code.one_per_buyer && <span>1× par acheteur</span>}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => shareWhatsApp(code)}
                            className="flex items-center gap-1.5 bg-green-500 text-white font-bold px-3 py-2 rounded-xl hover:bg-green-600 text-xs">
                            <Share2 className="w-3.5 h-3.5" /> WhatsApp
                          </button>
                          <button onClick={() => togglePromoActive(code.id, code.is_active)}
                            className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors ${
                              code.is_active
                                ? 'border-gray-200 text-gray-600 hover:bg-gray-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}>
                            {code.is_active ? 'Désactiver' : 'Activer'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── FLASH SALES ─────────────────────────────────────────────────── */}
        {tab === 'flash' && (
          <>
            {/* Create form */}
            {showFlashForm && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 mb-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" /> Créer une vente flash
                  </h2>
                  <button onClick={() => setShowFlashForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <form onSubmit={saveFlashSale} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Produit</label>
                    <select required value={flashForm.product_id}
                      onChange={(e) => {
                        const p = products.find((x) => x.id === e.target.value)
                        setFlashForm({ ...flashForm, product_id: e.target.value, flash_price: p ? Math.round(p.price * 0.8) : 0 })
                      }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-400">
                      <option value="">Sélectionner un produit…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} — {formatPrice(p.price)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Prix flash (DA)</label>
                    <input required type="number" min="1" value={flashForm.flash_price || ''}
                      onChange={(e) => setFlashForm({ ...flashForm, flash_price: Number(e.target.value) })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
                    {flashDiscount > 0 && (
                      <p className="text-xs text-emerald-600 font-bold mt-1">
                        −{flashDiscount}% vs prix normal ({formatPrice(selectedProduct!.price)})
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Stock limité (optionnel)</label>
                    <input type="number" min="1" value={flashForm.stock_limit}
                      onChange={(e) => setFlashForm({ ...flashForm, stock_limit: e.target.value })}
                      placeholder="Illimité"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Début</label>
                    <input required type="datetime-local" value={flashForm.starts_at}
                      onChange={(e) => setFlashForm({ ...flashForm, starts_at: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Fin</label>
                    <input required type="datetime-local" value={flashForm.ends_at}
                      onChange={(e) => setFlashForm({ ...flashForm, ends_at: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
                  </div>

                  <div className="sm:col-span-2 flex gap-3">
                    <button type="submit" disabled={savingFlash}
                      className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-60 text-sm">
                      {savingFlash ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Lancer la vente flash
                    </button>
                    <button type="button" onClick={() => setShowFlashForm(false)}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Flash sales list */}
            {loadingData ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : flashSales.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm text-center text-gray-400">
                <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Aucune vente flash</p>
                <button onClick={() => setShowFlashForm(true)} className="mt-2 text-emerald-600 font-bold text-sm hover:underline">Créer votre première vente flash →</button>
              </div>
            ) : (
              <div className="space-y-3">
                {flashSales.map((fs) => {
                  const product   = products.find((p) => p.id === fs.product_id)
                  const now       = new Date()
                  const start     = new Date(fs.starts_at)
                  const end       = new Date(fs.ends_at)
                  const isActive  = fs.is_active && now >= start && now <= end
                  const isPending = fs.is_active && now < start
                  const isEnded   = now > end || !fs.is_active
                  const pct       = product ? Math.round((1 - fs.flash_price / product.price) * 100) : 0
                  const fillPct   = fs.stock_limit ? Math.round((fs.sold_count / fs.stock_limit) * 100) : 0

                  return (
                    <div key={fs.id} className={`bg-white rounded-2xl p-5 shadow-sm border ${isEnded ? 'opacity-60 border-gray-100' : 'border-amber-100'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isActive ? 'bg-amber-100' : isPending ? 'bg-blue-50' : 'bg-gray-100'
                        }`}>
                          <Zap className={`w-5 h-5 ${isActive ? 'text-amber-600' : isPending ? 'text-blue-500' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-gray-900 truncate">{product?.name ?? 'Produit supprimé'}</p>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                              isActive  ? 'bg-amber-100 text-amber-700'
                              : isPending ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                            }`}>
                              {isActive ? '🔥 En cours' : isPending ? '⏳ À venir' : 'Terminé'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
                            <span className="font-bold text-amber-600">{formatPrice(fs.flash_price)}</span>
                            {product && <span className="line-through">{formatPrice(product.price)}</span>}
                            {pct > 0 && <span className="text-emerald-600 font-bold">−{pct}%</span>}
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{start.toLocaleDateString('fr-DZ')} → {end.toLocaleDateString('fr-DZ')}</span>
                          </div>
                          {fs.stock_limit && (
                            <div>
                              <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>{fs.sold_count} vendu{fs.sold_count > 1 ? 's' : ''}</span>
                                <span>{fs.stock_limit} max</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${fillPct > 80 ? 'bg-red-500' : 'bg-amber-500'}`}
                                  style={{ width: `${fillPct}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            await fetch('/api/seller/flash-sales', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: fs.id, is_active: false }),
                            })
                            setFlashSales((prev) => prev.filter((x) => x.id !== fs.id))
                          }}
                          className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
