'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

interface Props {
  images: string[]
  name: string
}

export default function ProductGallery({ images, name }: Props) {
  const [active, setActive]   = useState(0)
  const [zoomed, setZoomed]   = useState(false)

  const prev = () => setActive(i => Math.max(0, i - 1))
  const next = () => setActive(i => Math.min(images.length - 1, i + 1))

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-3xl flex items-center justify-center">
        <span className="text-6xl opacity-30">📦</span>
      </div>
    )
  }

  return (
    <>
      {/* Main image */}
      <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden bg-gray-50 aspect-square sm:aspect-[4/3] lg:aspect-square shadow-sm">
        <Image
          src={images[active]}
          alt={name}
          fill
          className="object-cover transition-all duration-500"
          sizes="(max-width: 768px) 100vw, 55vw"
          priority
        />

        {/* Zoom button */}
        <button
          onClick={() => setZoomed(true)}
          className="absolute top-3 right-3 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
          aria-label="Agrandir"
        >
          <ZoomIn className="w-4 h-4 text-gray-700" />
        </button>

        {/* Prev / Next */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              disabled={active === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md disabled:opacity-30 hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-800" />
            </button>
            <button
              onClick={next}
              disabled={active === images.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md disabled:opacity-30 hover:bg-white transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-800" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail row */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                i === active
                  ? 'border-indigo-500 shadow-lg scale-105'
                  : 'border-transparent opacity-55 hover:opacity-100'
              }`}
            >
              <Image src={img} alt="" width={64} height={64} className="object-cover w-full h-full" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {zoomed && (
        <div
          className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            onClick={() => setZoomed(false)}
            className="absolute top-5 right-5 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors text-xl font-bold"
          >
            ×
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev() }}
                disabled={active === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next() }}
                disabled={active === images.length - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/20"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="relative w-full max-w-2xl aspect-square" onClick={e => e.stopPropagation()}>
            <Image
              src={images[active]}
              alt={name}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
        </div>
      )}
    </>
  )
}
