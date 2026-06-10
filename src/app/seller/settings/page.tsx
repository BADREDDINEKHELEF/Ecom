'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Check, ExternalLink, Copy, Instagram, Facebook, Menu } from 'lucide-react'
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
  const [form, setForm] = useState({
    store_name: '', store_slug: '', phone: '', wilaya: '', description: '',
    logo_url: '', banner_url: '', cover_url: '', accent_color: '#4f46e5',
    seo_title: '', seo_description: '',
    social_instagram: '', social_facebook: '', social_whatsapp: '', social_tiktok: '',
    theme_preset: 'default', business_type: 'individual',
  })
  const [initialized, setInitialized] = useState(false)

  if (!initialized && vendor) {
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
      theme_preset:     vendor.theme_preset || 'default',
      business_type:    vendor.business_type || 'individual',
    })
    setInitialized(true)
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
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut}
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Logo URL</label>
                <input type="url" value={form.logo_url}
                  onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400" />
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
                <span>Commission rate</span>
                <span className="font-bold text-gray-900">{vendor.commission_rate}%</span>
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
