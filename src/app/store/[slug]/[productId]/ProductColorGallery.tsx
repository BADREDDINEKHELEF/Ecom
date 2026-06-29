'use client'

import { useState } from 'react'
import ProductGallery from './ProductGallery'
import type { ColorVariant } from '@/types'

interface Props {
  mainImages: string[]
  colorVariants: ColorVariant[]
  name: string
}

export default function ProductColorGallery({ mainImages, colorVariants, name }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const hasVariants = colorVariants.length > 0

  const currentImages: string[] = (() => {
    if (!selected) return mainImages
    const cv = colorVariants.find(v => v.name === selected)
    return cv && cv.images.length > 0 ? cv.images : mainImages
  })()

  const handleSelect = (colorName: string) => {
    const next = selected === colorName ? null : colorName
    setSelected(next)
    window.dispatchEvent(
      new CustomEvent('productColorChanged', { detail: { colorName: next } })
    )
  }

  return (
    <div>
      <ProductGallery images={currentImages} name={name} />

      {hasVariants && (
        <div className="mt-5 flex items-start gap-5">
          <div className="flex-shrink-0">
            <p className="text-[11px] font-black text-[#86868b] uppercase tracking-wider leading-none mb-1">Couleur</p>
            <p className="text-sm font-semibold text-[#1d1d1f] leading-tight min-h-[1.25rem]">
              {selected ?? <span className="text-[#86868b] font-normal">Choisir</span>}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {colorVariants.map(v => (
              <button
                key={v.name}
                type="button"
                title={v.name}
                aria-label={v.name}
                aria-pressed={selected === v.name}
                onClick={() => handleSelect(v.name)}
                className={`w-9 h-9 rounded-full transition-all duration-200 flex-shrink-0 ${
                  selected === v.name
                    ? 'ring-2 ring-offset-2 ring-[#1d1d1f] scale-110'
                    : 'ring-1 ring-black/10 hover:scale-105 hover:ring-black/30'
                }`}
                style={{ background: v.hex }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
