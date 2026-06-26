'use client'

import { useState, useCallback } from 'react'

interface Props {
  min: number
  max: number
  value: [number, number]
  onChange: (range: [number, number]) => void
  step?: number
}

export default function PriceRangeSlider({ min, max, value, onChange, step = 500 }: Props) {
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null)

  const pct = (v: number) => ((v - min) / (max - min)) * 100

  const clamp = useCallback((v: number) => Math.max(min, Math.min(max, Math.round(v / step) * step)), [min, max, step])

  const handleMin = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = clamp(Number(e.target.value))
    if (next <= value[1]) onChange([next, value[1]])
  }, [value, onChange, clamp])

  const handleMax = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = clamp(Number(e.target.value))
    if (next >= value[0]) onChange([value[0], next])
  }, [value, onChange, clamp])

  return (
    <div className="px-2">
      <div className="flex justify-between text-xs font-semibold text-gray-700 mb-3">
        <span>{value[0].toLocaleString('fr-DZ')} DA</span>
        <span>{value[1].toLocaleString('fr-DZ')} DA</span>
      </div>
      <div className="relative h-5 flex items-center">
        {/* Track */}
        <div className="absolute left-0 right-0 h-1.5 bg-gray-200 rounded-full" />
        {/* Active fill */}
        <div
          className="absolute h-1.5 bg-indigo-600 rounded-full"
          style={{ left: `${pct(value[0])}%`, right: `${100 - pct(value[1])}%` }}
        />
        {/* Min thumb */}
        <input
          type="range" min={min} max={max} step={step} value={value[0]}
          onChange={handleMin}
          onMouseDown={() => setDragging('min')}
          onMouseUp={() => setDragging(null)}
          className="absolute w-full h-1.5 opacity-0 cursor-pointer"
          style={{ zIndex: dragging === 'min' || value[0] > max - step ? 3 : 2 }}
        />
        {/* Max thumb */}
        <input
          type="range" min={min} max={max} step={step} value={value[1]}
          onChange={handleMax}
          onMouseDown={() => setDragging('max')}
          onMouseUp={() => setDragging(null)}
          className="absolute w-full h-1.5 opacity-0 cursor-pointer"
          style={{ zIndex: dragging === 'max' ? 3 : 1 }}
        />
        {/* Visible thumbs */}
        <div className="absolute w-4 h-4 bg-white border-2 border-indigo-600 rounded-full shadow pointer-events-none" style={{ left: `calc(${pct(value[0])}% - 8px)` }} />
        <div className="absolute w-4 h-4 bg-white border-2 border-indigo-600 rounded-full shadow pointer-events-none" style={{ left: `calc(${pct(value[1])}% - 8px)` }} />
      </div>
    </div>
  )
}
