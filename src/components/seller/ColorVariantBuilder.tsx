'use client'

import { useState } from 'react'
import { Plus, Trash2, Palette } from 'lucide-react'
import type { ColorVariant } from '@/types'

interface Props {
  variants: ColorVariant[]
  onChange: (variants: ColorVariant[]) => void
}

const PRESET_COLORS = [
  { name: 'Noir',         hex: '#1d1d1f' },
  { name: 'Blanc',        hex: '#f5f5f7' },
  { name: 'Rouge',        hex: '#ef4444' },
  { name: 'Bleu',         hex: '#3b82f6' },
  { name: 'Vert',         hex: '#22c55e' },
  { name: 'Jaune',        hex: '#eab308' },
  { name: 'Orange',       hex: '#f97316' },
  { name: 'Violet',       hex: '#8b5cf6' },
  { name: 'Rose',         hex: '#ec4899' },
  { name: 'Gris',         hex: '#9ca3af' },
  { name: 'Marron',       hex: '#92400e' },
  { name: 'Beige',        hex: '#d4a76a' },
]

function addVariant(variants: ColorVariant[], preset: { name: string; hex: string }): ColorVariant[] {
  if (variants.some(v => v.name === preset.name)) return variants
  return [...variants, { name: preset.name, hex: preset.hex, images: [] }]
}

export default function ColorVariantBuilder({ variants, onChange }: Props) {
  const [customName, setCustomName] = useState('')
  const [customHex,  setCustomHex]  = useState('#6366f1')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const remove = (i: number) => {
    const next = variants.filter((_, idx) => idx !== i)
    onChange(next)
    if (expandedIdx === i) setExpandedIdx(null)
  }

  const updateImages = (i: number, raw: string) => {
    const images = raw.split('\n').map(s => s.trim()).filter(Boolean)
    const next = variants.map((v, idx) => idx === i ? { ...v, images } : v)
    onChange(next)
  }

  const addCustom = () => {
    if (!customName.trim()) return
    onChange(addVariant(variants, { name: customName.trim(), hex: customHex }))
    setCustomName('')
    setCustomHex('#6366f1')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-purple-600 flex-shrink-0" />
        <p className="text-sm font-bold text-gray-900">Variantes de couleur</p>
        <span className="text-xs text-gray-400">— chaque couleur a ses propres photos</span>
      </div>

      {/* Preset swatches */}
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Couleurs rapides</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(p => {
            const active = variants.some(v => v.name === p.name)
            return (
              <button
                key={p.name}
                type="button"
                title={p.name}
                onClick={() => active ? remove(variants.findIndex(v => v.name === p.name)) : onChange(addVariant(variants, p))}
                className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0"
                  style={{ background: p.hex }}
                />
                {p.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom color */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={customHex}
          onChange={e => setCustomHex(e.target.value)}
          className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5"
        />
        <input
          type="text"
          value={customName}
          onChange={e => setCustomName(e.target.value)}
          placeholder="Nom personnalisé (ex: Bleu nuit)"
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customName.trim()}
          className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-bold px-3 py-2 rounded-xl disabled:opacity-40 hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </button>
      </div>

      {/* Variant list with image URLs */}
      {variants.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Photos par couleur</p>
          {variants.map((v, i) => (
            <div key={v.name} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <span
                  className="w-6 h-6 rounded-full border border-black/10 flex-shrink-0"
                  style={{ background: v.hex }}
                />
                <span className="text-sm font-semibold text-gray-900 flex-1">{v.name}</span>
                <span className="text-xs text-gray-400">{v.images.length} photo{v.images.length !== 1 ? 's' : ''}</span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); remove(i) }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </button>

              {expandedIdx === i && (
                <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 mt-3">
                    URLs des photos — une par ligne
                  </label>
                  <textarea
                    value={v.images.join('\n')}
                    onChange={e => updateImages(i, e.target.value)}
                    rows={4}
                    placeholder={"https://exemple.com/rouge-1.jpg\nhttps://exemple.com/rouge-2.jpg"}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-emerald-400 resize-none bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    Laissez vide pour afficher les photos principales du produit.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
