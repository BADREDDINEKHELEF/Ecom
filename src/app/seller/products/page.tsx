'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Plus, Edit2, Trash2, X, Check, Loader2, Search, Package, Layers, Menu, Upload, ImagePlus, Tag, FileText, ChevronDown, Sparkles } from 'lucide-react'
import CsvImportModal from '@/components/seller/CsvImportModal'
import ImageUploader from '@/components/seller/ImageUploader'
import { useSellerAuth } from '@/lib/seller/useSellerAuth'
import { getVendorProducts } from '@/lib/supabase/queries'
import { upsertProduct, deleteProduct, updateProductExtras, checkVendorProductLimit } from '@/lib/supabase/mutations'
import { formatPrice } from '@/lib/utils'
import { niches } from '@/lib/data/niches'
import { useT, useRTL } from '@/lib/store/langStore'
import SellerSidebar from '@/components/seller/SellerSidebar'
import VariantBuilder, { type ProductVariant } from '@/components/seller/VariantBuilder'
import type { Product, ColorVariant } from '@/types'

const EMPTY_FORM = {
  id: '', nicheId: 'cars', category: '', name: '', description: '',
  price: 0, comparePrice: 0, stock: 1, tags: '', images: [] as string[], imageColors: [] as string[],
  isNew: false, isFeatured: false, hasVariants: false,
  condition: 'new' as 'new' | 'used' | 'refurbished',
  metaTitle: '', metaDescription: '',
  isPreOrder: false, preOrderDate: '',
  minOrderQuantity: 1,
  isBundle: false,
}

export default function SellerProductsPage() {
  const { vendor, loading, signOut } = useSellerAuth()
  const searchParams = useSearchParams()
  const t = useT()
  const isRTL = useRTL()
  const sp = t.sellerProducts
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProds, setLoadingProds] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1')
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [formError, setFormError] = useState('')
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const COLOR_HEX: Record<string, string> = {
    Blanc: '#F9FAFB', Noir: '#111827', Gris: '#9CA3AF', Beige: '#D4B896',
    Marron: '#92400E', Rouge: '#EF4444', Rose: '#EC4899', Orange: '#F97316',
    Jaune: '#EAB308', Vert: '#22C55E', Bleu: '#3B82F6', Violet: '#8B5CF6',
  }

  // Auto-derive color variants from the imageColors parallel array
  const colorVariants = useMemo<ColorVariant[]>(() => {
    const result: ColorVariant[] = []
    for (let i = 0; i < form.images.length; i++) {
      const color = (form.imageColors ?? [])[i]
      if (!color) continue
      const existing = result.find(v => v.name === color)
      if (existing) {
        existing.images.push(form.images[i])
      } else {
        result.push({ name: color, hex: COLOR_HEX[color] ?? '#9CA3AF', images: [form.images[i]] })
      }
    }
    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.images, form.imageColors])

  const load = useCallback(async () => {
    if (!vendor) return
    setLoadingProds(true)
    const prods = await getVendorProducts(vendor.id)
    setProducts(prods)
    setLoadingProds(false)
  }, [vendor])

  useEffect(() => { load() }, [load])

  const openEdit = (p: Product) => {
    setEditing(p)
    // Populate imageColors from DB; if empty but colorVariants exist, reverse-map them
    let imageColors = p.imageColors?.filter(Boolean).length ? (p.imageColors ?? []) : []
    if (!imageColors.filter(Boolean).length && (p.colorVariants?.length ?? 0) > 0) {
      const colorByUrl = new Map<string, string>()
      for (const v of p.colorVariants ?? []) {
        for (const img of v.images) colorByUrl.set(img, v.name)
      }
      imageColors = p.images.map(url => colorByUrl.get(url) ?? '')
    }
    setForm({
      id: p.id, nicheId: p.nicheId, category: p.category, name: p.name,
      description: p.description, price: p.price, comparePrice: p.comparePrice || 0,
      stock: p.stock, tags: p.tags.join(', '), images: p.images, imageColors,
      isNew: p.isNew ?? false, isFeatured: p.isFeatured ?? false, hasVariants: false,
      condition: p.condition ?? 'new',
      metaTitle: p.metaTitle ?? '',
      metaDescription: p.metaDescription ?? '',
      isPreOrder: p.isPreOrder ?? false,
      preOrderDate: p.preOrderDate ? p.preOrderDate.slice(0, 10) : '',
      minOrderQuantity: p.minOrderQuantity ?? 1,
      isBundle: p.isBundle ?? false,
    })
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); setFormError(''); setVariants([]) }

  const handleSave = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!vendor) return
    if (!form.name || form.price <= 0) { setFormError('Name and price are required'); return }
    setSaving(true)
    setFormError('')
    try {
      // Enforce subscription product limit for new products only
      if (!editing) {
        const limitCheck = await checkVendorProductLimit(vendor.id)
        if (!limitCheck.allowed) {
          const limitMsg = limitCheck.limit !== null
            ? `Limite atteinte : ${limitCheck.count}/${limitCheck.limit} produits. Passez à un plan supérieur pour ajouter plus de produits.`
            : 'Limite de produits atteinte. Veuillez contacter le support.'
          setFormError(limitMsg)
          setSaving(false)
          return
        }
      }

      const productId = editing?.id || `v-${vendor.id.slice(0, 8)}-${Date.now()}`
      await upsertProduct({
        id: productId,
        nicheId: form.nicheId,
        category: form.category || form.nicheId,
        name: form.name,
        description: form.description,
        price: form.price,
        comparePrice: form.comparePrice || undefined,
        images: form.images,
        imageColors: form.imageColors.filter(Boolean).length ? form.imageColors : undefined,
        stock: form.stock,
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
        isNew: form.isNew,
        isFeatured: form.isFeatured,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(({ vendor_id: vendor.id } as any)),
      })
      await updateProductExtras(productId, {
        vendor_id:          vendor.id,
        condition:          form.condition,
        meta_title:         form.metaTitle || null,
        meta_description:   form.metaDescription || null,
        is_pre_order:       form.isPreOrder,
        pre_order_date:     form.preOrderDate || null,
        min_order_quantity: form.minOrderQuantity || 1,
        is_bundle:          form.isBundle,
        variants:           form.hasVariants ? (variants.length > 0 ? variants : null) : null,
        color_variants:     colorVariants.length > 0 ? colorVariants : null,
      })
      await load()
      closeForm()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(sp.deleteConfirm)) return
    await deleteProduct(id)
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  )

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">{sp.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{sp.count.replace('{n}', String(products.length))}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
              <Upload className="w-4 h-4" /> CSV
            </button>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors text-sm">
              <Plus className="w-4 h-4" /> {sp.addBtn}
            </button>
          </div>
        </div>

        {/* Product Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
            {/* Form header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-black text-gray-900 text-base leading-tight">{editing ? sp.editTitle : sp.newTitle}</h2>
                  <p className="text-xs text-gray-400">Complétez en moins d&apos;une minute</p>
                </div>
              </div>
              <button onClick={closeForm} aria-label={sp.cancelBtn} type="button"
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="divide-y divide-gray-50">

              {/* ── Section 1: Photos & Colors ── */}
              <div className="px-6 py-5">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ImagePlus className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">Photos du produit</p>
                    <p className="text-xs text-gray-400">Ajoutez vos photos · sélectionnez une couleur pour chaque photo · max 8</p>
                  </div>
                </div>
                <ImageUploader
                  key={editing?.id ?? 'new'}
                  value={form.images}
                  onChange={(urls) => setForm((prev) => ({ ...prev, images: urls }))}
                  colors={form.imageColors}
                  onColorsChange={(c) => setForm((prev) => ({ ...prev, imageColors: c }))}
                  maxImages={8}
                />
              </div>

              {/* ── Section 3: Essential info ── */}
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <p className="font-bold text-gray-900 text-sm">Informations essentielles</p>
                </div>

                {/* Title — underline style, big and clear */}
                <div>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nom du produit…"
                    className="w-full border-0 border-b-2 border-gray-100 focus:border-emerald-400 px-0 py-2 text-xl font-bold text-gray-900 placeholder:text-gray-300 focus:outline-none bg-transparent transition-colors"
                  />
                </div>

                {/* Price / Compare / Stock in one row */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Prix (DA) *</label>
                    <input
                      required type="number" min="1" value={form.price || ''}
                      onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-base font-bold focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Ancien prix</label>
                    <input
                      type="number" min="0" value={form.comparePrice || ''}
                      onChange={(e) => setForm({ ...form, comparePrice: Number(e.target.value) })}
                      placeholder="—"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Stock</label>
                    <input
                      type="number" min="0" value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Niche + Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{sp.nicheLabel}</label>
                    <select
                      value={form.nicheId}
                      onChange={(e) => setForm({ ...form, nicheId: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-400 transition-colors"
                    >
                      {niches.map((n) => <option key={n.id} value={n.id}>{n.emoji} {n.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{sp.categoryLabel}</label>
                    <input
                      type="text" value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      placeholder={sp.categoryPH}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* ── Section 3: Description ── */}
              <div className="px-6 py-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm leading-tight">
                      Description <span className="font-normal text-gray-400">(optionnel)</span>
                    </p>
                    <p className="text-xs text-gray-400">Astuce : utilisez une ligne par caractéristique</p>
                  </div>
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder={sp.descriptionPH}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-400 resize-none transition-colors"
                />
              </div>

              {/* ── More options (accordion) ── */}
              <div className="px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors w-full"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                  <span>Plus d&apos;options</span>
                  {!showAdvanced && (
                    <span className="text-xs font-normal text-gray-400 ml-1">état · SEO · tags · MOQ…</span>
                  )}
                </button>

                {showAdvanced && (
                  <div className="mt-5 space-y-5">

                    {/* Flags row */}
                    <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                      {[
                        { key: 'isNew',      label: sp.markNew },
                        { key: 'isFeatured', label: sp.markFeatured },
                        { key: 'isPreOrder', label: 'Pré-commande' },
                        { key: 'isBundle',   label: 'Pack / bundle' },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={form[key as keyof typeof form] as boolean}
                            onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm font-medium text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>

                    {/* Pre-order date */}
                    {form.isPreOrder && (
                      <div className="max-w-xs">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Date de disponibilité</label>
                        <input type="date" value={form.preOrderDate}
                          onChange={(e) => setForm({ ...form, preOrderDate: e.target.value })}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
                      </div>
                    )}

                    {/* Condition + MOQ */}
                    <div className="grid grid-cols-2 gap-3 max-w-sm">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">État</label>
                        <select value={form.condition}
                          onChange={(e) => setForm({ ...form, condition: e.target.value as 'new' | 'used' | 'refurbished' })}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-400">
                          <option value="new">Neuf</option>
                          <option value="used">Occasion</option>
                          <option value="refurbished">Reconditionné</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Qté min. (MOQ)</label>
                        <input type="number" min="1" value={form.minOrderQuantity}
                          onChange={(e) => setForm({ ...form, minOrderQuantity: Number(e.target.value) })}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{sp.tagsLabel}</label>
                      <input type="text" value={form.tags}
                        onChange={(e) => setForm({ ...form, tags: e.target.value })}
                        placeholder={sp.tagsPH}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
                    </div>

                    {/* Size/price variants */}
                    <label className="flex items-center gap-3 cursor-pointer bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                      <input type="checkbox" checked={form.hasVariants}
                        onChange={(e) => setForm({ ...form, hasVariants: e.target.checked })}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <div>
                          <p className="text-sm font-bold text-gray-900">Ce produit a des variantes de taille / prix</p>
                          <p className="text-xs text-gray-500">Taille × Pointure… avec stock et prix individuels</p>
                        </div>
                      </div>
                    </label>
                    {form.hasVariants && (
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <VariantBuilder basePrice={form.price} variants={variants} onChange={setVariants} />
                      </div>
                    )}

                    {/* SEO */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Titre SEO</label>
                        <input type="text" maxLength={120} value={form.metaTitle}
                          onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                          placeholder="Titre affiché dans Google"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Description SEO</label>
                        <input type="text" maxLength={200} value={form.metaDescription}
                          onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                          placeholder="Courte description Google"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-400" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Submit bar ── */}
              <div className="px-6 py-4 bg-gray-50 flex items-center gap-3">
                {formError && <p className="flex-1 text-sm text-red-500">{formError}</p>}
                <div className="flex gap-3 ml-auto">
                  <button type="button" onClick={closeForm}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-white transition-colors text-gray-600">
                    {sp.cancelBtn}
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-700 active:scale-95 disabled:opacity-60 transition-all text-sm shadow-sm shadow-emerald-200">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {editing ? sp.saveBtn : '🚀 ' + sp.addBtn}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={sp.searchPH}
            className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 bg-white" />
        </div>

        {/* Products list */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loadingProds ? (
            <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" /> {sp.loading}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">{products.length === 0 ? sp.noProductsYet : sp.noResults}</p>
              {products.length === 0 && (
                <button onClick={() => setShowForm(true)}
                  className="mt-3 text-emerald-600 font-bold text-sm hover:underline">{sp.addFirstProduct}</button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filtered.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-4">
                    {p.images[0] ? (
                      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="56px" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0 flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate text-sm">{p.name}</p>
                      <p className="text-xs text-gray-500 truncate">{p.category}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-bold text-gray-900 text-sm">{formatPrice(p.price)}</span>
                        <span className={`text-xs font-medium ${p.stock === 0 ? 'text-red-500' : p.stock < 5 ? 'text-amber-500' : 'text-green-600'}`}>
                          · {sp.colStock}: {p.stock}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {[sp.colProduct, sp.colCategory, sp.colPrice, sp.colStock, sp.colStatus, ''].map((h) => (
                        <th key={h} scope="col" className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            {p.images[0] ? (
                              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                <Image src={p.images[0]} alt={p.name} fill className="object-cover" sizes="40px" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                            )}
                            <span className="font-semibold text-gray-900 truncate max-w-[200px]">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">{p.category}</td>
                        <td className="px-5 py-3.5 font-bold text-gray-900">{formatPrice(p.price)}</td>
                        <td className="px-5 py-3.5">
                          <span className={`font-medium ${p.stock === 0 ? 'text-red-500' : p.stock < 5 ? 'text-amber-500' : 'text-green-600'}`}>
                            {p.stock}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-1 flex-wrap">
                            {p.isNew && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{sp.badgeNew}</span>}
                            {p.isFeatured && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">{sp.badgeFeatured}</span>}
                            {p.stock === 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">{sp.outOfStock}</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-2">
                            <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {showImport && (
          <CsvImportModal onClose={() => setShowImport(false)} onImported={load} />
        )}
      </main>
    </div>
  )
}
