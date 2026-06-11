'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Check, ExternalLink, Copy, Instagram, Facebook, Menu, Plane, Banknote, Bell } from 'lucide-react'
import LogoUploader from '@/components/seller/LogoUploader'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { ALL_WILAYAS } from '@/lib/data/wilayas'
import { useRTL } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'

const THEME_PRESETS = [
  { id: 'default',  label: 'Défaut',    bg: '#4f46e5', text: 'white' },
  { id: 'minimal',  label: 'Minimal',   bg: '#111827', text: 'white' },
  { id: 'bold',     label: 'Audacieux', bg: '#dc2626', text: 'white' },
  { id: 'elegant',  label: 'Élégant',   bg: '#78716c', text: 'white' },
  { id: 'earthy',   label: 'Nature',    bg: '#16a34a', text: 'white' },
]

const BUSINESS_TYPES = [
  { id: 'individual',    label: 'Particulier' },
  { id: 'small_business', label: 'Petite entreprise' },
  { id: 'wholesaler',    label: 'Grossiste' },
  { id: 'brand',         label: 'Marque' },
]

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 40)
}

export default function SellerSettingsPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const isRTL = useRTL()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [vacationSaving, setVacationSaving] = useState(false)
  const [vacationSaved, setVacationSaved] = useState(false)
  const [vacation, setVacation] = useState({ is_on_vacation: false, vacation_message: '' })
  const [form, setForm] = useState({
    store_name: '', store_slug: '', phone: '', wilaya: '', description: '',
    logo_url: '', banner_url: '', cover_url: '', accent_color: '#4f46e5',
    seo_title: '', seo_description: '',
    social_instagram: '', social_facebook: '', social_whatsapp: '', social_tiktok: '',
    theme_preset: 'default', business_type: 'individual',
    bank_account_name: '', bank_rib: '', bank_ccp: '', bank_baridimob: '',
    low_stock_threshold: 5,
    return_policy: '', shipping_policy: '',
  })
  const [initialized, setInitialized] = useState(false)

  if (!initialized && vendor) {
    setVacation({
      is_on_vacation:   vendor.is_on_vacation ?? false,
      vacation_message: vendor.vacation_message ?? '',
    })
    setForm({
      store_name:       vendor.store_name,
      store_slug:       vendor.store_slug,
      phone:            vendor.phone || '',
      wilaya:           vendor.wilaya || '',
      description:      vendor.description || '',
      logo_url:         vendor.logo_url || '',
      banner_url:       vendor.banner_url || '',
      cover_url:        vendor.cover_url || '',
      accent_color:     vendor.accent_color || '#4f46e5',
      seo_title:        vendor.seo_title || '',
      seo_description:  vendor.seo_description || '',
      social_instagram: vendor.social_instagram || '',
      social_facebook:  vendor.social_facebook || '',
      social_whatsapp:  vendor.social_whatsapp || '',
      social_tiktok:    vendor.social_tiktok || '',
      theme_preset:       vendor.theme_preset || 'default',
      business_type:      vendor.business_type || 'individual',
      bank_account_name:  vendor.bank_account_name || '',
      bank_rib:           vendor.bank_rib || '',
      bank_ccp:           vendor.bank_ccp || '',
      bank_baridimob:     vendor.bank_baridimob || '',
      low_stock_threshold: vendor.low_stock_threshold ?? 5,
      return_policy:      vendor.return_policy || '',
      shipping_policy:    vendor.shipping_policy || '',
    })
    setInitialized(true)
  }

  const handleVacationSave = async () => {
    setVacationSaving(true)
    try {
      await fetch('/api/seller/vendor/vacation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vacation),
      })
      setVacationSaved(true)
      setTimeout(() => setVacationSaved(false), 3000)
    } finally {
      setVacationSaving(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendor) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/seller/vendor', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name:       form.store_name,
          store_slug:       slugify(form.store_slug),
          phone:            form.phone || null,
          wilaya:           form.wilaya || null,
          description:      form.description || null,
          logo_url:         form.logo_url || null,
          banner_url:       form.banner_url || null,
          cover_url:        form.cover_url || null,
          accent_color:     form.accent_color || null,
          seo_title:        form.seo_title || null,
          seo_description:  form.seo_description || null,
          social_instagram: form.social_instagram || null,
          social_facebook:  form.social_facebook || null,
          social_whatsapp:  form.social_whatsapp || null,
          social_tiktok:    form.social_tiktok || null,
          theme_preset:     form.theme_preset || null,
          business_type:    form.business_type || null,
          bank_account_name: form.bank_account_name || null,
          bank_rib:         form.bank_rib || null,
          bank_ccp:         form.bank_ccp || null,
          bank_baridimob:   form.bank_baridimob || null,
          low_stock_threshold: form.low_stock_threshold || null,
          return_policy:   form.return_policy || null,
          shipping_policy: form.shipping_policy || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !vendor) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" /></div>
  }

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
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Store Settings</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your store profile and details</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}/store/${vendor.store_slug}`
                navigator.clipboard.writeText(url).then(() => {
                  setLinkCopied(true)
                  setTimeout(() => setLinkCopied(false), 2000)
                })
              }}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-800 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl transition-colors"
              title="Copier le lien"
            >
              {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {linkCopied ? 'Copié !' : 'Copier le lien'}
            </button>
            <Link
              href={`/store/${vendor.store_slug}`}
              target="_blank"
              className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Voir ma boutique
            </Link>
          </div>
        </div>

        {/* Vacation Mode Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${vacation.is_on_vacation ? 'bg-amber-100' : 'bg-gray-100'}`}>
                <Plane className={`w-5 h-5 ${vacation.is_on_vacation ? 'text-amber-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Mode vacances</h3>
                <p className="text-xs text-gray-500">
                  {vacation.is_on_vacation ? 'Boutique en pause — les clients voient un message' : 'Boutique active — commandes acceptées'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVacation({ ...vacation, is_on_vacation: !vacation.is_on_vacation })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${vacation.is_on_vacation ? 'bg-amber-500' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${vacation.is_on_vacation ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {vacation.is_on_vacation && (
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message aux clients (optionnel)</label>
              <input
                type="text"
                value={vacation.vacation_message}
                onChange={(e) => setVacation({ ...vacation, vacation_message: e.target.value })}
                placeholder="Ex: De retour le 15 janvier !"
                maxLength={200}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
          )}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleVacationSave}
              disabled={vacationSaving}
              className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {vacationSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : vacationSaved ? <Check className="w-4 h-4" /> : null}
              {vacationSaved ? 'Enregistré !' : 'Enregistrer'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Store Name</label>
              <input required type="text" value={form.store_name}
                onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Store URL</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-emerald-400">
                <span className="px-3 py-3 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap">shopdz.dz/shop/</span>
                <input required type="text" value={form.store_slug}
                  onChange={(e) => setForm({ ...form, store_slug: slugify(e.target.value) })}
                  className="flex-1 px-3 py-3 text-sm focus:outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone</label>
                <input type="tel" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="05xx xxx xxx"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Wilaya</label>
                <select value={form.wilaya} onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-emerald-400">
                  <option value="">Select…</option>
                  {ALL_WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <LogoUploader
                  value={form.logo_url}
                  onChange={(url) => setForm({ ...form, logo_url: url })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Couleur principale</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.accent_color}
                    onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                  <input type="text" value={form.accent_color}
                    onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-emerald-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bannière URL <span className="text-gray-400 font-normal">(1200×300px recommandé)</span></label>
              <input type="url" value={form.banner_url}
                onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
                placeholder="https://example.com/banner.jpg"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Image de couverture URL <span className="text-gray-400 font-normal">(hero large, 1600×400px)</span></label>
              <input type="url" value={form.cover_url}
                onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                placeholder="https://example.com/cover.jpg"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description de la boutique</label>
              <textarea value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} maxLength={300}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 resize-none" />
              <p className="text-xs text-gray-400 mt-1">{form.description.length}/300</p>
            </div>

            {/* Theme preset */}
            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Thème de la boutique</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-4">
                {THEME_PRESETS.map((t) => (
                  <button key={t.id} type="button"
                    onClick={() => setForm({ ...form, theme_preset: t.id })}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                      form.theme_preset === t.id ? 'border-emerald-500 scale-105' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: t.bg, color: t.text }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Type de commerce</p>
                <div className="flex flex-wrap gap-2">
                  {BUSINESS_TYPES.map((bt) => (
                    <button key={bt.id} type="button"
                      onClick={() => setForm({ ...form, business_type: bt.id })}
                      className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border-2 ${
                        form.business_type === bt.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}>
                      {bt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Social links */}
            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Réseaux sociaux</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Instagram className="w-3.5 h-3.5 text-pink-500" /> Instagram
                  </label>
                  <input type="url" value={form.social_instagram}
                    onChange={(e) => setForm({ ...form, social_instagram: e.target.value })}
                    placeholder="https://instagram.com/maboutique"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Facebook className="w-3.5 h-3.5 text-blue-600" /> Facebook
                  </label>
                  <input type="url" value={form.social_facebook}
                    onChange={(e) => setForm({ ...form, social_facebook: e.target.value })}
                    placeholder="https://facebook.com/maboutique"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp</label>
                  <input type="tel" value={form.social_whatsapp}
                    onChange={(e) => setForm({ ...form, social_whatsapp: e.target.value })}
                    placeholder="05xx xxx xxx"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">TikTok</label>
                  <input type="url" value={form.social_tiktok}
                    onChange={(e) => setForm({ ...form, social_tiktok: e.target.value })}
                    placeholder="https://tiktok.com/@maboutique"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">SEO de la boutique</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Titre SEO <span className="text-gray-400 font-normal">(onglet navigateur)</span></label>
                  <input type="text" value={form.seo_title} maxLength={70}
                    onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                    placeholder={`${form.store_name} — ShopDZ`}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400" />
                  <p className="text-xs text-gray-400 mt-1">{form.seo_title.length}/70</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Méta-description SEO</label>
                  <textarea value={form.seo_description} maxLength={160}
                    onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                    rows={2}
                    placeholder="Description courte affichée dans Google…"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 resize-none" />
                  <p className="text-xs text-gray-400 mt-1">{form.seo_description.length}/160</p>
                </div>
              </div>
            </div>

            {/* Bank / Payout Details */}
            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5" /> Coordonnées bancaires
              </p>
              <p className="text-xs text-gray-500 mb-3">Ces informations sont utilisées pour vos virements. Ne partagez pas ces données.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nom du titulaire</label>
                  <input type="text" value={form.bank_account_name}
                    onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
                    placeholder="Mohammed Amiri"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">RIB (Relevé d&apos;Identité Bancaire)</label>
                  <input type="text" value={form.bank_rib}
                    onChange={(e) => setForm({ ...form, bank_rib: e.target.value })}
                    placeholder="00000-00000-000000000000-00"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Compte CCP</label>
                  <input type="text" value={form.bank_ccp}
                    onChange={(e) => setForm({ ...form, bank_ccp: e.target.value })}
                    placeholder="0000000 / clé 00"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Numéro BaridiMob</label>
                  <input type="text" value={form.bank_baridimob}
                    onChange={(e) => setForm({ ...form, bank_baridimob: e.target.value })}
                    placeholder="05xx xxx xxx"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400" />
                </div>
              </div>
            </div>

            {/* Low-stock threshold */}
            <div className="border-t border-gray-100 pt-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" /> Alerte stock bas
              </p>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Seuil d&apos;alerte stock
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number" min={0} max={100}
                      value={form.low_stock_threshold}
                      onChange={(e) => setForm({ ...form, low_stock_threshold: parseInt(e.target.value) || 0 })}
                      className="w-24 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400"
                    />
                    <span className="text-sm text-gray-500">unités restantes → alerter</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Store Policies */}
            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                <span className="text-sm font-black text-gray-900">Politiques de la boutique</span>
                <span className="text-xs text-gray-400">(affichées aux acheteurs)</span>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Politique de livraison</label>
                <textarea
                  value={form.shipping_policy}
                  onChange={(e) => setForm({ ...form, shipping_policy: e.target.value })}
                  rows={4}
                  placeholder="Ex: Livraison sous 3-5 jours ouvrables dans toute l'Algérie via Yalidine. Retrait possible à Alger…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Politique de retour</label>
                <textarea
                  value={form.return_policy}
                  onChange={(e) => setForm({ ...form, return_policy: e.target.value })}
                  rows={4}
                  placeholder="Ex: Retours acceptés sous 7 jours après réception, produit non utilisé dans son emballage d'origine…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 resize-none"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
                {saved ? 'Saved!' : 'Save Changes'}
              </button>
            </div>
          </form>

          {/* Read-only info */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Account Info</p>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Commission on sales</span>
                <span className="font-bold text-emerald-600">0%</span>
              </div>
              <div className="flex justify-between">
                <span>Account status</span>
                <span className={`font-bold ${vendor.is_approved ? 'text-green-600' : 'text-amber-500'}`}>
                  {vendor.is_approved ? 'Approved' : 'Pending approval'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Member since</span>
                <span className="font-medium">{new Date(vendor.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
