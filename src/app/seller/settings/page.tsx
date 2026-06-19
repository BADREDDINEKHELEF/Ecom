'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Loader2, Check, ExternalLink, Copy, Instagram, Facebook, Menu,
  Plane, Banknote, Bell, ChevronDown, ChevronUp, Store, Palette,
  Share2, Search, FileText, BarChart3, Shield, AlertCircle,
} from 'lucide-react'
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

// ── Accordion section wrapper ─────────────────────────────────────────────────
function Section({
  id, open, onToggle, icon: Icon, title, subtitle, badge, children,
}: {
  id: string; open: boolean; onToggle: (id: string) => void
  icon: React.ElementType; title: string; subtitle: string
  badge?: 'required' | 'optional' | 'advanced'
  children: React.ReactNode
}) {
  const badgeMap = {
    required: 'bg-red-50 text-red-600 border border-red-100',
    optional:  'bg-gray-50 text-gray-400 border border-gray-100',
    advanced:  'bg-violet-50 text-violet-600 border border-violet-100',
  }
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900 text-sm">{title}</p>
            {badge && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeMap[badge]}`}>
                {badge === 'required' ? 'Requis' : badge === 'advanced' ? 'Avancé' : 'Optionnel'}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && <div className="px-6 pb-6 pt-2 border-t border-gray-50 space-y-5">{children}</div>}
    </div>
  )
}

// ── Field helpers ─────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

const INPUT = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400'
const TEXTAREA = `${INPUT} resize-none`

// ─────────────────────────────────────────────────────────────────────────────

export default function SellerSettingsPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const isRTL = useRTL()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openSection, setOpenSection] = useState<string>('essential')
  const toggle = (id: string) => setOpenSection((prev) => (prev === id ? '' : id))

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [pixelCopied, setPixelCopied] = useState(false)
  const [vacationSaving, setVacationSaving] = useState(false)
  const [vacationSaved, setVacationSaved] = useState(false)
  const [vacation, setVacation] = useState({ is_on_vacation: false, vacation_message: '' })
  const [pixels, setPixels] = useState({
    meta_pixel_id: '', gtag_id: '', tiktok_pixel_id: '',
    meta_capi_token: '', tiktok_capi_token: '', gtag_api_secret: '',
  })
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
    setPixels({
      meta_pixel_id:    vendor.meta_pixel_id    ?? '',
      gtag_id:          vendor.gtag_id           ?? '',
      tiktok_pixel_id:  vendor.tiktok_pixel_id   ?? '',
      meta_capi_token:  vendor.meta_capi_token   ?? '',
      tiktok_capi_token: vendor.tiktok_capi_token ?? '',
      gtag_api_secret:  vendor.gtag_api_secret   ?? '',
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

  const handleLogoChange = async (url: string) => {
    setForm((prev) => ({ ...prev, logo_url: url }))
    try {
      await fetch('/api/seller/vendor', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: url || null }),
      })
    } catch { /* saved on next form submit */ }
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

  const RESERVED_SLUGS = ['admin', 'api', 'store', 'auth', 'seller', 'dashboard', 'search', 'deals', 'pricing', 'checkout', 'orders', 'profile', 'wishlist', 'compare', 'track', 'cart', 'offline']

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendor) return
    const slug = slugify(form.store_slug)
    if (RESERVED_SLUGS.includes(slug)) {
      setError("Ce nom d'URL est réservé. Choisissez un autre nom.")
      return
    }
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
          meta_pixel_id:    pixels.meta_pixel_id    || null,
          gtag_id:          pixels.gtag_id           || null,
          tiktok_pixel_id:  pixels.tiktok_pixel_id   || null,
          meta_capi_token:  pixels.meta_capi_token   || null,
          tiktok_capi_token: pixels.tiktok_capi_token || null,
          gtag_api_secret:  pixels.gtag_api_secret   || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Échec de la sauvegarde')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Échec de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

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

        {/* Page header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Paramètres de la boutique</h1>
            <p className="text-gray-500 text-sm mt-1">Gérez votre profil et les détails de votre boutique</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}/store/${vendor.store_slug}`
                navigator.clipboard.writeText(url).then(() => {
                  setLinkCopied(true)
                  setTimeout(() => setLinkCopied(false), 2000)
                })
              }}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-800 bg-white border border-gray-200 px-3 py-2 rounded-xl transition-colors"
            >
              {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{linkCopied ? 'Copié !' : 'Copier le lien'}</span>
            </button>
            <Link
              href={`/store/${vendor.store_slug}`}
              target="_blank"
              className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Voir ma boutique</span>
            </Link>
          </div>
        </div>

        {/* Vacation mode — always visible, not inside accordion */}
        <div className={`mb-4 rounded-2xl p-5 shadow-sm border ${vacation.is_on_vacation ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Plane className={`w-5 h-5 flex-shrink-0 ${vacation.is_on_vacation ? 'text-amber-600' : 'text-gray-400'}`} />
              <div>
                <p className="font-bold text-gray-900 text-sm">Mode vacances</p>
                <p className="text-xs text-gray-500">
                  {vacation.is_on_vacation ? '⚠️ Boutique en pause — aucune commande acceptée' : 'Boutique active — commandes acceptées'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVacation({ ...vacation, is_on_vacation: !vacation.is_on_vacation })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${vacation.is_on_vacation ? 'bg-amber-500' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${vacation.is_on_vacation ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          {vacation.is_on_vacation && (
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={vacation.vacation_message}
                onChange={(e) => setVacation({ ...vacation, vacation_message: e.target.value })}
                placeholder="Ex: De retour le 15 janvier !"
                maxLength={200}
                className="flex-1 border border-amber-200 bg-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={handleVacationSave}
                disabled={vacationSaving}
                className="flex items-center justify-center gap-2 bg-amber-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm hover:bg-amber-600 disabled:opacity-60 transition-colors"
              >
                {vacationSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : vacationSaved ? <Check className="w-4 h-4" /> : null}
                {vacationSaved ? 'Enregistré !' : 'Enregistrer'}
              </button>
            </div>
          )}
        </div>

        {/* Main form */}
        <form onSubmit={handleSave} className="space-y-3">

          {/* 1 — Essential */}
          <Section id="essential" open={openSection === 'essential'} onToggle={toggle}
            icon={Store} badge="required"
            title="Informations essentielles"
            subtitle="Nom, URL, téléphone WhatsApp, description — remplissez ces champs en premier"
          >
            <Field label="Nom de la boutique">
              <input required type="text" value={form.store_name}
                onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                className={INPUT} />
            </Field>

            <Field label="URL de votre boutique" hint="Votre lien unique : storedz.dz/store/votre-nom — uniquement des lettres, chiffres et tirets">
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-emerald-400">
                <span className="px-3 py-3 bg-gray-50 text-gray-400 text-sm border-r border-gray-200 whitespace-nowrap">storedz.dz/store/</span>
                <input required type="text" value={form.store_slug}
                  onChange={(e) => setForm({ ...form, store_slug: slugify(e.target.value) })}
                  className="flex-1 px-3 py-3 text-sm focus:outline-none" />
              </div>
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Téléphone WhatsApp" hint="Numéro sur lequel vous recevrez les commandes clients">
                <div className="flex gap-2">
                  <input type="tel" value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="05xx xxx xxx"
                    className={`${INPUT} flex-1`} />
                  {form.phone && (
                    <a
                      href={(() => { const d = form.phone.replace(/\D/g, ''); return `https://wa.me/${d.startsWith('213') ? d : d.startsWith('0') ? '213' + d.slice(1) : '213' + d}` })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Tester le lien WhatsApp"
                      className="flex items-center justify-center w-12 h-12 bg-green-50 border border-green-200 text-green-600 rounded-xl hover:bg-green-100 transition-colors flex-shrink-0"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </a>
                  )}
                </div>
              </Field>
              <Field label="Wilaya" hint="Utilisée pour estimer les délais de livraison">
                <select value={form.wilaya} onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
                  className={`${INPUT} bg-white`}>
                  <option value="">Choisir une wilaya…</option>
                  {ALL_WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <LogoUploader value={form.logo_url} onChange={handleLogoChange} />
              </div>
              <Field label="Type de commerce">
                <div className="flex flex-wrap gap-2 mt-1">
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
              </Field>
            </div>

            <Field label="Description de la boutique" hint={`${form.description.length}/300 — Décrivez vos produits et ce qui vous rend unique`}>
              <textarea value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} maxLength={300}
                placeholder="Ex: Boutique spécialisée dans la mode kabyle traditionnelle. Livraison dans toute l'Algérie…"
                className={TEXTAREA} />
            </Field>
          </Section>

          {/* 2 — Appearance */}
          <Section id="appearance" open={openSection === 'appearance'} onToggle={toggle}
            icon={Palette} badge="optional"
            title="Apparence de la boutique"
            subtitle="Thème, couleur principale, bannière et image de couverture"
          >
            <Field label="Thème de couleur" hint="Choisissez le style visuel qui correspond à votre marque">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-1">
                {THEME_PRESETS.map((t) => (
                  <button key={t.id} type="button"
                    onClick={() => setForm({ ...form, theme_preset: t.id })}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${
                      form.theme_preset === t.id ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: t.bg, color: t.text }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Couleur personnalisée" hint="Code hexadécimal (ex: #4f46e5)">
              <div className="flex items-center gap-3">
                <input type="color" value={form.accent_color}
                  onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                  className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer p-1" />
                <input type="text" value={form.accent_color}
                  onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-sm font-mono focus:outline-none focus:border-emerald-400" />
              </div>
            </Field>

            <Field label="Image bannière" hint="Format recommandé : 1200 × 300 px — apparaît en haut de votre boutique">
              <input type="url" value={form.banner_url}
                onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
                placeholder="https://example.com/banner.jpg"
                className={INPUT} />
            </Field>

            <Field label="Image de couverture" hint="Format recommandé : 1600 × 400 px — grande image héro">
              <input type="url" value={form.cover_url}
                onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                placeholder="https://example.com/cover.jpg"
                className={INPUT} />
            </Field>
          </Section>

          {/* 3 — Social */}
          <Section id="social" open={openSection === 'social'} onToggle={toggle}
            icon={Share2} badge="optional"
            title="Réseaux sociaux"
            subtitle="Liens vers vos pages Instagram, Facebook, TikTok"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Instagram">
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-emerald-400">
                  <span className="px-3 py-3 bg-gray-50 border-r border-gray-200"><Instagram className="w-4 h-4 text-pink-500" /></span>
                  <input type="url" value={form.social_instagram}
                    onChange={(e) => setForm({ ...form, social_instagram: e.target.value })}
                    placeholder="https://instagram.com/maboutique"
                    className="flex-1 px-3 py-3 text-sm focus:outline-none" />
                </div>
              </Field>
              <Field label="Facebook">
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-emerald-400">
                  <span className="px-3 py-3 bg-gray-50 border-r border-gray-200"><Facebook className="w-4 h-4 text-blue-600" /></span>
                  <input type="url" value={form.social_facebook}
                    onChange={(e) => setForm({ ...form, social_facebook: e.target.value })}
                    placeholder="https://facebook.com/maboutique"
                    className="flex-1 px-3 py-3 text-sm focus:outline-none" />
                </div>
              </Field>
              <Field label="WhatsApp" hint="Numéro affiché sur la page boutique pour contacter le vendeur">
                <div className="flex gap-2">
                  <input type="tel" value={form.social_whatsapp}
                    onChange={(e) => setForm({ ...form, social_whatsapp: e.target.value })}
                    placeholder="05xx xxx xxx"
                    className={`${INPUT} flex-1`} />
                  {form.social_whatsapp && (
                    <a
                      href={(() => { const d = form.social_whatsapp.replace(/\D/g, ''); return `https://wa.me/${d.startsWith('213') ? d : d.startsWith('0') ? '213' + d.slice(1) : '213' + d}` })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Tester le lien WhatsApp"
                      className="flex items-center justify-center w-12 h-12 bg-green-50 border border-green-200 text-green-600 rounded-xl hover:bg-green-100 transition-colors flex-shrink-0"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </a>
                  )}
                </div>
              </Field>
              <Field label="TikTok">
                <input type="url" value={form.social_tiktok}
                  onChange={(e) => setForm({ ...form, social_tiktok: e.target.value })}
                  placeholder="https://tiktok.com/@maboutique"
                  className={INPUT} />
              </Field>
            </div>
          </Section>

          {/* 4 — Policies */}
          <Section id="policies" open={openSection === 'policies'} onToggle={toggle}
            icon={FileText} badge="optional"
            title="Politiques de la boutique"
            subtitle="Livraison et retours — affichées aux acheteurs sur votre boutique"
          >
            <div className="bg-blue-50 rounded-xl p-3 flex gap-2 text-xs text-blue-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              Les boutiques avec des politiques claires convertissent mieux — les clients savent à quoi s&apos;attendre.
            </div>
            <Field label="Politique de livraison" hint="Délais, zones couvertes, transporteur utilisé">
              <textarea value={form.shipping_policy}
                onChange={(e) => setForm({ ...form, shipping_policy: e.target.value })}
                rows={4}
                placeholder="Ex: Livraison sous 3-5 jours ouvrables dans toute l'Algérie via Yalidine. Retrait possible à Alger sur rendez-vous…"
                className={TEXTAREA} />
            </Field>
            <Field label="Politique de retour" hint="Conditions d'acceptation des retours et délais">
              <textarea value={form.return_policy}
                onChange={(e) => setForm({ ...form, return_policy: e.target.value })}
                rows={4}
                placeholder="Ex: Retours acceptés sous 7 jours après réception, produit non utilisé dans son emballage d'origine…"
                className={TEXTAREA} />
            </Field>
          </Section>

          {/* 5 — SEO */}
          <Section id="seo" open={openSection === 'seo'} onToggle={toggle}
            icon={Search} badge="optional"
            title="Référencement (SEO)"
            subtitle="Titre et description affichés dans Google — augmentez votre visibilité"
          >
            <Field label="Titre SEO" hint={`${form.seo_title.length}/70 caractères — apparaît dans l'onglet du navigateur et Google`}>
              <input type="text" value={form.seo_title} maxLength={70}
                onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                placeholder={`${form.store_name} — StoreDz`}
                className={INPUT} />
            </Field>
            <Field label="Méta-description" hint={`${form.seo_description.length}/160 caractères — résumé affiché dans les résultats Google`}>
              <textarea value={form.seo_description} maxLength={160}
                onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                rows={3}
                placeholder="Description courte de votre boutique affichée dans Google…"
                className={TEXTAREA} />
            </Field>
          </Section>

          {/* 6 — Bank */}
          <Section id="bank" open={openSection === 'bank'} onToggle={toggle}
            icon={Banknote} badge="optional"
            title="Coordonnées bancaires"
            subtitle="Pour recevoir vos virements de la plateforme — stockées de façon sécurisée"
          >
            <div className="bg-amber-50 rounded-xl p-3 flex gap-2 text-xs text-amber-700">
              <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
              Ces informations sont confidentielles. Ne les partagez jamais par message.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom du titulaire du compte">
                <input type="text" value={form.bank_account_name}
                  onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
                  placeholder="Mohammed Amiri"
                  className={INPUT} />
              </Field>
              <Field label="RIB" hint="Format : 00000-00000-000000000000-00">
                <input type="text" value={form.bank_rib}
                  onChange={(e) => setForm({ ...form, bank_rib: e.target.value })}
                  placeholder="00000-00000-000000000000-00"
                  className={`${INPUT} font-mono`} />
              </Field>
              <Field label="Compte CCP" hint="Numéro de compte postal">
                <input type="text" value={form.bank_ccp}
                  onChange={(e) => setForm({ ...form, bank_ccp: e.target.value })}
                  placeholder="0000000 / clé 00"
                  className={`${INPUT} font-mono`} />
              </Field>
              <Field label="Numéro BaridiMob" hint="Numéro de téléphone lié à votre compte BaridiMob">
                <input type="text" value={form.bank_baridimob}
                  onChange={(e) => setForm({ ...form, bank_baridimob: e.target.value })}
                  placeholder="05xx xxx xxx"
                  className={INPUT} />
              </Field>
            </div>
          </Section>

          {/* 7 — Stock alert */}
          <Section id="stock" open={openSection === 'stock'} onToggle={toggle}
            icon={Bell} badge="optional"
            title="Alerte stock bas"
            subtitle="Recevez une alerte quand un produit descend sous un seuil critique"
          >
            <Field label="Seuil d'alerte" hint="Vous serez notifié dans le tableau de bord quand un produit a ce nombre d'unités ou moins">
              <div className="flex items-center gap-3">
                <input type="number" min={0} max={100}
                  value={form.low_stock_threshold}
                  onChange={(e) => setForm({ ...form, low_stock_threshold: parseInt(e.target.value) || 0 })}
                  className="w-28 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400"
                />
                <span className="text-sm text-gray-500">unités restantes</span>
              </div>
            </Field>
          </Section>

          {/* 8 — Pixels */}
          <Section id="pixels" open={openSection === 'pixels'} onToggle={toggle}
            icon={BarChart3} badge="advanced"
            title="Pixels & Tracking publicitaire"
            subtitle="Meta, Google Analytics, TikTok — pour mesurer vos campagnes (facultatif)"
          >
            <div className="bg-violet-50 rounded-xl p-3 flex gap-2 text-xs text-violet-700 mb-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              Section réservée aux vendeurs qui font de la publicité payante. Laissez vide si vous n&apos;utilisez pas ces outils.
            </div>

            {/* Meta */}
            <div className="bg-[#f0f2ff] rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-[#1877F2] uppercase tracking-wider">Meta (Facebook / Instagram)</p>
              <Field label="Pixel ID" hint="Meta Business Suite → Events Manager → votre pixel → Paramètres">
                <input type="text" value={pixels.meta_pixel_id}
                  onChange={(e) => setPixels({ ...pixels, meta_pixel_id: e.target.value })}
                  placeholder="1234567890123456"
                  className={`${INPUT} font-mono bg-white`} />
              </Field>
              <Field label="Conversions API Token (server-side)" hint="Events Manager → votre pixel → Paramètres → Conversions API → Générer un token">
                <input type="password" value={pixels.meta_capi_token}
                  onChange={(e) => setPixels({ ...pixels, meta_capi_token: e.target.value })}
                  placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className={`${INPUT} font-mono bg-white`} />
              </Field>
            </div>

            {/* Google */}
            <div className="bg-[#f0fdf4] rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Google Analytics 4</p>
              <Field label="Measurement ID" hint="GA4 → Admin → Flux de données → votre flux web → Measurement ID">
                <input type="text" value={pixels.gtag_id}
                  onChange={(e) => setPixels({ ...pixels, gtag_id: e.target.value })}
                  placeholder="G-XXXXXXXXXX"
                  className={`${INPUT} font-mono bg-white`} />
              </Field>
              <Field label="API Secret (Measurement Protocol)" hint="GA4 → Admin → Flux de données → votre flux → Measurement Protocol API secrets">
                <input type="password" value={pixels.gtag_api_secret}
                  onChange={(e) => setPixels({ ...pixels, gtag_api_secret: e.target.value })}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className={`${INPUT} font-mono bg-white`} />
              </Field>
            </div>

            {/* TikTok */}
            <div className="bg-[#fff0f3] rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-[#fe2c55] uppercase tracking-wider">TikTok</p>
              <Field label="Pixel ID" hint="TikTok Ads Manager → Assets → Events → votre pixel → Paramètres">
                <input type="text" value={pixels.tiktok_pixel_id}
                  onChange={(e) => setPixels({ ...pixels, tiktok_pixel_id: e.target.value })}
                  placeholder="CXXXXXXXXXXXXXXXXXX"
                  className={`${INPUT} font-mono bg-white`} />
              </Field>
              <Field label="Events API Access Token (server-side)" hint="TikTok Ads Manager → Assets → Events → votre pixel → API Access Token">
                <input type="password" value={pixels.tiktok_capi_token}
                  onChange={(e) => setPixels({ ...pixels, tiktok_capi_token: e.target.value })}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className={`${INPUT} font-mono bg-white`} />
              </Field>
            </div>

            {/* StoreDz first-party pixel */}
            {vendor.pixel_id && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-800">Pixel StoreDz (1st party)</p>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">ACTIF</span>
                </div>
                <p className="text-xs text-gray-500">Snippet à intégrer sur n&apos;importe quelle page externe pour collecter des données dans votre tableau de bord StoreDz.</p>
                <div className="relative">
                  <pre className="bg-gray-900 text-green-400 text-[11px] rounded-xl p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
{`<img src="https://storedz.dz/api/pixel/collect?pid=${vendor.pixel_id}&e=pageview" width="1" height="1" style="display:none" />`}
                  </pre>
                  <button type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`<img src="https://storedz.dz/api/pixel/collect?pid=${vendor.pixel_id}&e=pageview" width="1" height="1" style="display:none" />`)
                      setPixelCopied(true)
                      setTimeout(() => setPixelCopied(false), 2000)
                    }}
                    className="absolute top-2 right-2 flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors">
                    {pixelCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {pixelCopied ? 'Copié' : 'Copier'}
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Save button */}
          <div className="bg-white rounded-2xl shadow-sm px-6 py-4 flex items-center justify-between gap-4">
            <div className="text-xs text-gray-400">
              Commission sur vos ventes : <span className="font-bold text-emerald-600">0%</span>
              {' · '}
              Statut du compte : <span className={`font-bold ${vendor.is_approved ? 'text-emerald-600' : 'text-amber-600'}`}>
                {vendor.is_approved ? 'Approuvé' : 'En attente'}
              </span>
            </div>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors whitespace-nowrap">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
              {saved ? 'Enregistré !' : 'Enregistrer les modifications'}
            </button>
          </div>

        </form>
      </main>
    </div>
  )
}
