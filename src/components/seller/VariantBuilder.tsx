'use client'

import { useEffect, useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { ProductVariant } from '@/types'

interface VariantOption {
  name:   string
  values: string[]
}

interface Props {
  basePrice: number
  variants:  ProductVariant[]
  onChange:  (variants: ProductVariant[]) => void
}

const PRESET_OPTIONS = [
  { name: 'Taille',  values: ['XS','S','M','L','XL','XXL'] },
  { name: 'Pointure', values: ['36','37','38','39','40','41','42','43','44'] },
  { name: 'Couleur', values: ['Blanc','Noir','Rouge','Bleu','Vert','Jaune','Rose','Gris'] },
]

function genId() {
  return crypto.randomUUID()
}

function cartesian(arrays: string[][]): string[][] {
  return arrays.reduce<string[][]>(
    (acc, cur) => acc.flatMap((x) => cur.map((y) => [...x, y])),
    [[]]
  )
}

export default function VariantBuilder({ basePrice, variants, onChange }: Props) {
  const [options, setOptions]       = useState<VariantOption[]>([])
  const [collapsed, setCollapsed]   = useState(false)

  // Derive option definitions from existing variants so editing a product
  // restores its variant matrix configuration.
  useEffect(() => {
    if (!variants.length) {
      setOptions([])
      return
    }
    const derived = new Map<string, Set<string>>()
    for (const v of variants) {
      for (const [key, value] of Object.entries(v.options)) {
        if (!derived.has(key)) derived.set(key, new Set())
        derived.get(key)!.add(value)
      }
    }
    setOptions(Array.from(derived.entries()).map(([name, values]) => ({ name, values: Array.from(values) })))
  }, [variants])

  const addOption = () => setOptions([...options, { name: '', values: [] }])

  const updateOptionName = (i: number, name: string) => {
    const next = [...options]
    next[i] = { ...next[i], name }
    setOptions(next)
  }

  const addValue = (optIdx: number, val: string) => {
    if (!val.trim()) return
    const next = [...options]
    if (!next[optIdx].values.includes(val.trim())) {
      next[optIdx] = { ...next[optIdx], values: [...next[optIdx].values, val.trim()] }
    }
    setOptions(next)
  }

  const removeValue = (optIdx: number, val: string) => {
    const next = [...options]
    next[optIdx] = { ...next[optIdx], values: next[optIdx].values.filter((v) => v !== val) }
    setOptions(next)
  }

  const removeOption = (i: number) => setOptions(options.filter((_, idx) => idx !== i))

  const generateMatrix = () => {
    const validOptions = options.filter((o) => o.name && o.values.length > 0)
    if (!validOptions.length) return

    const combinations = cartesian(validOptions.map((o) => o.values))
    const newVariants: ProductVariant[] = combinations.map((combo) => {
      const optionMap: Record<string, string> = {}
      validOptions.forEach((opt, i) => { optionMap[opt.name] = combo[i] })

      // Preserve existing variant if options match
      const existing = variants.find((v) =>
        Object.entries(optionMap).every(([k, val]) => v.options[k] === val)
      )
      if (existing) return existing

      return {
        id:      genId(),
        options: optionMap,
        price:   basePrice,
        stock:   0,
        sku:     Object.values(optionMap).join('-').toUpperCase(),
      }
    })
    onChange(newVariants)
  }

  const clampNumber = (n: number, min = 0) => (Number.isFinite(n) ? Math.max(min, n) : 0)

  const updateVariant = (id: string, field: keyof ProductVariant, value: string | number) => {
    onChange(variants.map((v) => {
      if (v.id !== id) return v
      if (field === 'price')  return { ...v, price: clampNumber(Number(value)) }
      if (field === 'stock')  return { ...v, stock: clampNumber(Number(value)) }
      if (field === 'sku')    return { ...v, sku: String(value).trim() }
      return { ...v, [field]: value }
    }))
  }

  const bulkSetPrice = (price: number) => onChange(variants.map((v) => ({ ...v, price: clampNumber(price) })))
  const bulkSetStock = (stock: number) => onChange(variants.map((v) => ({ ...v, stock: clampNumber(stock) })))

  if (variants.length > 0 && collapsed) {
    return (
      <div className="border border-gray-200 rounded-xl p-4">
        <button onClick={() => setCollapsed(false)}
          className="w-full flex items-center justify-between text-sm font-semibold text-gray-700">
          <span>{variants.length} variantes configurées</span>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Option builders */}
      {options.map((opt, i) => (
        <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input type="text" value={opt.name} onChange={(e) => updateOptionName(i, e.target.value)}
              placeholder="Nom de l'option (ex: Taille)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-400" />
            <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Presets for this option */}
          {PRESET_OPTIONS.find((p) => p.name.toLowerCase() === opt.name.toLowerCase()) && (
            <div className="flex flex-wrap gap-1.5">
              {PRESET_OPTIONS.find((p) => p.name.toLowerCase() === opt.name.toLowerCase())!.values.map((v) => (
                <button key={v} type="button"
                  onClick={() => opt.values.includes(v) ? removeValue(i, v) : addValue(i, v)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    opt.values.includes(v)
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}>{v}</button>
              ))}
            </div>
          )}

          {/* Current values */}
          <div className="flex flex-wrap gap-1.5">
            {opt.values.map((v) => (
              <span key={v} className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                {v}
                <button onClick={() => removeValue(i, v)} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Add custom value */}
          <AddValueInput onAdd={(v) => addValue(i, v)} />
        </div>
      ))}

      <div className="flex gap-2">
        <button type="button" onClick={addOption}
          className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 border border-dashed border-emerald-300 rounded-xl px-4 py-2.5 hover:bg-emerald-50 transition-colors">
          <Plus className="w-4 h-4" /> Ajouter une option
        </button>
        {options.some((o) => o.name && o.values.length > 0) && (
          <button type="button" onClick={generateMatrix}
            className="flex items-center gap-1.5 text-sm font-bold bg-emerald-600 text-white rounded-xl px-4 py-2.5 hover:bg-emerald-700 transition-colors">
            Générer les variantes →
          </button>
        )}
      </div>

      {/* Variant matrix */}
      {variants.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-700">{variants.length} variantes</p>
            <div className="flex gap-3 text-xs">
              <BulkFill label="Prix uniforme" onApply={(v) => bulkSetPrice(Number(v))} suffix="DA" />
              <BulkFill label="Stock uniforme" onApply={(v) => bulkSetStock(Number(v))} suffix="unités" />
              {variants.length > 0 && (
                <button type="button" onClick={() => { onChange([]); setCollapsed(false) }}
                  className="text-red-500 hover:underline font-semibold">Supprimer tout</button>
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-2.5 bg-gray-50"
              style={{ gridTemplateColumns: `1fr repeat(${Object.keys(variants[0]?.options ?? {}).length}, minmax(0,1fr)) 100px 80px 100px` }}>
              {Object.keys(variants[0]?.options ?? {}).map((k) => <span key={k}>{k}</span>)}
              <span>Prix (DA)</span>
              <span>Stock</span>
              <span>SKU</span>
            </div>
            <div className="divide-y divide-gray-50">
              {variants.map((v) => (
                <div key={v.id} className="grid items-center gap-2 px-4 py-2.5 hover:bg-gray-50"
                  style={{ gridTemplateColumns: `1fr repeat(${Object.keys(v.options).length}, minmax(0,1fr)) 100px 80px 100px` }}>
                  {Object.values(v.options).map((val, i) => (
                    <span key={i} className="text-sm font-semibold text-gray-800 truncate">{val}</span>
                  ))}
                  <input type="number" min="0" value={v.price || ''}
                    onChange={(e) => updateVariant(v.id, 'price', Number(e.target.value))}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-emerald-400 w-full" />
                  <input type="number" min="0" value={v.stock}
                    onChange={(e) => updateVariant(v.id, 'stock', Number(e.target.value))}
                    className={`border rounded-lg px-2 py-1.5 text-sm focus:outline-none w-full ${
                      v.stock === 0 ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 focus:border-emerald-400'
                    }`} />
                  <input type="text" value={v.sku}
                    onChange={(e) => updateVariant(v.id, 'sku', e.target.value)}
                    placeholder="auto"
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-400 w-full font-mono text-gray-500" />
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Stock total: {variants.reduce((s, v) => s + v.stock, 0)} unités ·{' '}
            Prix: {formatPrice(Math.min(...variants.map((v) => v.price)))} – {formatPrice(Math.max(...variants.map((v) => v.price)))}
          </p>
          <button type="button" onClick={() => setCollapsed(true)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <ChevronUp className="w-3.5 h-3.5" /> Réduire
          </button>
        </div>
      )}
    </div>
  )
}

function AddValueInput({ onAdd }: { onAdd: (v: string) => void }) {
  const [val, setVal] = useState('')
  return (
    <div className="flex gap-2">
      <input type="text" value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(val); setVal('') } }}
        placeholder="Valeur personnalisée…"
        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-400" />
      <button type="button" onClick={() => { onAdd(val); setVal('') }}
        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-2">Ajouter</button>
    </div>
  )
}

function BulkFill({ label, onApply, suffix }: { label: string; onApply: (v: string) => void; suffix: string }) {
  const [val, setVal] = useState('')
  const [open, setOpen] = useState(false)
  if (!open) return (
    <button type="button" onClick={() => setOpen(true)} className="text-indigo-600 hover:underline font-semibold">{label}</button>
  )
  return (
    <div className="flex items-center gap-1">
      <input type="number" value={val} onChange={(e) => setVal(e.target.value)} autoFocus
        className="w-20 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-400" />
      <span className="text-gray-400">{suffix}</span>
      <button type="button" onClick={() => { onApply(val); setOpen(false); setVal('') }}
        className="text-emerald-600 font-bold">OK</button>
      <button type="button" onClick={() => setOpen(false)} className="text-gray-400">✕</button>
    </div>
  )
}
