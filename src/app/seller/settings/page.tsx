'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Check, ExternalLink } from 'lucide-react'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { updateVendor } from '@/lib/supabase/queries'
import { ALL_WILAYAS } from '@/lib/data/wilayas'
import SellerSidebar from '@/components/seller/SellerSidebar'

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').slice(0, 40)
}

export default function SellerSettingsPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    store_name: '', store_slug: '', phone: '', wilaya: '', description: '',
    logo_url: '', banner_url: '', accent_color: '#4f46e5', seo_title: '', seo_description: '',
  })
  const [initialized, setInitialized] = useState(false)

  if (!initialized && vendor) {
    setForm({
      store_name:      vendor.store_name,
      store_slug:      vendor.store_slug,
      phone:           vendor.phone || '',
      wilaya:          vendor.wilaya || '',
      description:     vendor.description || '',
      logo_url:        vendor.logo_url || '',
      banner_url:      vendor.banner_url || '',
      accent_color:    vendor.accent_color || '#4f46e5',
      seo_title:       vendor.seo_title || '',
      seo_description: vendor.seo_description || '',
    })
    setInitialized(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vendor) return
    setSaving(true)
    setError('')
    try {
      await updateVendor(vendor.id, {
        store_name:      form.store_name,
        store_slug:      slugify(form.store_slug),
        phone:           form.phone || null,
        wilaya:          form.wilaya || null,
        description:     form.description || null,
        logo_url:        form.logo_url || null,
        banner_url:      form.banner_url || null,
        accent_color:    form.accent_color || null,
        seo_title:       form.seo_title || null,
        seo_description: form.seo_description || null,
      })
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
    <div className="flex min-h-screen bg-gray-50" dir="ltr">
      <SellerSidebar storeName={vendor.store_name} slug={vendor.store_slug} onLogout={signOut} />
      <main className="flex-1 ml-60 p-8 max-w-3xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Store Settings</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your store profile and details</p>
          </div>
          <Link
            href={`/store/${vendor.store_slug}`}
            target="_blank"
            className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Voir ma boutique
          </Link>
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bannière URL <span className="text-gray-400 font-normal">(image large, 1200×300px recommandé)</span></label>
              <input type="url" value={form.banner_url}
                onChange={(e) => setForm({ ...form, banner_url: e.target.value })}
                placeholder="https://example.com/banner.jpg"
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
