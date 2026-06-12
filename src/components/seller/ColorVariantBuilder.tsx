'use client'

import { useState } from 'react'
import { Plus, Trash2, Palette, ChevronDown } from 'lucide-react'
import type { ColorVariant } from '@/types'
import ImageUploader from './ImageUploader'

interface Props {
  variants: ColorVariant[]
  onChange: (variants: ColorVariant[]) => void
}

const PRESET_COLORS = [
  { name: 'Noir',    hex: '#1d1d1f' },
  { name: 'Blanc',   hex: '#f5f5f7' },
  { name: 'Rouge',   hex: '#ef4444' },
  { name: 'Bleu',    hex: '#3b82f6' },
  { name: 'Vert',    hex: '#22c55e' },
  { name: 'Jaune',   hex: '#eab308' },
  { name: 'Orange',  hex: '#f97316' },
  { name: 'Violet',  hex: '#8b5cf6' },
  { name: 'Rose',    hex: '#ec4899' },
  { name: 'Gris',    hex: '#9ca3af' },
  { name: 'Marron',  hex: '#92400e' },
  { name: 'Beige',   hex: '#d4a76a' },
]

export default function ColorVariantBuilder({ variants, onChange }: Props) {
  const [customName, setCustomName] = useState('')
  const [customHex,  setCustomHex]  = useState('#6366f1')
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const isActive = (name: string) => variants.some(v => v.name === name)

  const addPreset = (p: { name: string; hex: string }) => {
    if (isActive(p.name)) return
    const next = [...variants, { name: p.name, hex: p.hex, images: [] }]
    onChange(next)
    setExpandedIdx(next.length - 1)
  }

  const removeVariant = (i: number) => {
    onChange(variants.filter((_, idx) => idx !== i))
    if (expandedIdx === i) setExpandedIdx(null)
    else if (expandedIdx !== null && expandedIdx > i) setExpandedIdx(expandedIdx - 1)
  }

  const updateImages = (i: number, urls: string[]) => {
    onChange(variants.map((v, idx) => idx === i ? { ...v, images: urls } : v))
  }

  const addCustom = () => {
    if (!customName.trim()) return
    const name = customName.trim()
    if (isActive(name)) return
    const next = [...variants, { name, hex: customHex, images: [] }]
    onChange(next)
    setExpandedIdx(next.length - 1)
    setCustomName('')
    setCustomHex('#6366f1')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-purple-600 flex-shrink-0" />
        <p className="text-sm font-bold text-gray-900">Variantes de couleur</p>
        <span className="text-xs text-gray-400">— photos différentes par couleur</span>
      </div>

      {/* Quick presets */}
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Couleurs rapides</p>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(p => {
            const active = isActive(p.name)
            return (
              <button
                key={p.name}
                type="button"
                title={p.name}
                onClick={() => active ? removeVariant(variants.findIndex(v => v.name === p.name)) : addPreset(p)}
                className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-700 hover:border-gray-400'
                }`}
              >
                <span className="w-4 h-4 rounded-full border border-black/10 flex-shrink-0" style={{ background: p.hex }} />
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
          className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"
        />
        <input
          type="text"
          value={customName}
          onChange={e => setCustomName(e.target.value)}
          placeholder="Couleur personnalisée (ex: Bleu nuit)"
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-400"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customName.trim()}
          className="flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-bold px-3 py-2 rounded-xl disabled:opacity-40 hover:bg-emerald-700 transition-colors flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </button>
      </div>

      {/* Variant list — each expands to its own ImageUploader */}
      {variants.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Photos par couleur</p>
          {variants.map((v, i) => (
            <div key={`${v.name}-${i}`} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Header row */}
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
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {v.images.length} photo{v.images.length !== 1 ? 's' : ''}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                    expandedIdx === i ? 'rotate-180' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeVariant(i) }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </button>

              {/* Expanded — full ImageUploader */}
              {expandedIdx === i && (
                <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-3 mb-3">
                    Photos — {v.name}
                  </p>
                  <ImageUploader
                    key={`color-uploader-${v.name}-${i}`}
                    value={v.images}
                    onChange={urls => updateImages(i, urls)}
                    maxImages={6}
                  />
                  <p className="text-[10px] text-gray-400 mt-2">
                    Si vide, les photos principales du produit seront affichées.
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
