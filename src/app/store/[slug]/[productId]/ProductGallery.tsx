'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react'

interface Props {
  images: string[]
  name: string
}

export default function ProductGallery({ images, name }: Props) {
  const [active, setActive] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [broken, setBroken] = useState<Set<number>>(new Set())
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const prev = () => setActive(i => Math.max(0, i - 1))
  const next = () => setActive(i => Math.min(images.length - 1, i + 1))
  const markBroken = (i: number) => setBroken(prev => new Set(prev).add(i))

  // Move focus to close button when lightbox opens; handle Escape to close
  useEffect(() => {
    if (!zoomed) return
    closeButtonRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomed(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [zoomed])

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-[#f5f5f7] rounded-3xl flex items-center justify-center">
        <span className="text-6xl opacity-20">📦</span>
      </div>
    )
  }

  return (
    <>
      {/* Main image */}
      <div
        className="relative aspect-square sm:aspect-[4/3] lg:aspect-square overflow-hidden bg-[#f5f5f7] rounded-2xl lg:rounded-3xl cursor-zoom-in"
        onClick={() => setZoomed(true)}
      >
        <Image
          src={images[active]}
          alt={name}
          fill
          className="object-cover transition-all duration-500"
          sizes="(max-width: 768px) 100vw, 55vw"
          priority
          onError={() => markBroken(active)}
        />
        {broken.has(active) && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f7]">
            <span className="text-6xl opacity-20">📦</span>
          </div>
        )}

        {/* Zoom hint */}
        <div className="absolute top-3 right-3 w-8 h-8 bg-white/70 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <ZoomIn className="w-4 h-4 text-[#1d1d1f]" />
        </div>

        {/* Prev / Next */}
        {images.length > 1 && (
          <>
            <button
              aria-label="Image précédente"
              onClick={e => { e.stopPropagation(); prev() }}
              disabled={active === 0}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm disabled:opacity-0 hover:bg-white transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4 text-[#1d1d1f]" />
            </button>
            <button
              aria-label="Image suivante"
              onClick={e => { e.stopPropagation(); next() }}
              disabled={active === images.length - 1}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm disabled:opacity-0 hover:bg-white transition-all duration-200"
            >
              <ChevronRight className="w-4 h-4 text-[#1d1d1f]" />
            </button>

            {/* Pill dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setActive(i) }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden bg-[#f5f5f7] transition-all duration-200 ${
                i === active
                  ? 'ring-2 ring-[#1d1d1f] ring-offset-1'
                  : 'opacity-50 hover:opacity-80'
              }`}
            >
              <Image src={img} alt={`${name} — photo ${i + 1}`} width={72} height={72} className="object-cover w-full h-full" onError={() => markBroken(i)} />
              {broken.has(i) && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f7]">
                  <span className="text-2xl opacity-20">📦</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Galerie d'images"
          className="fixed inset-0 z-[999] bg-black/96 flex items-center justify-center"
          onClick={() => setZoomed(false)}
        >
          {/* Close */}
          <button
            ref={closeButtonRef}
            aria-label="Fermer"
            onClick={() => setZoomed(false)}
            className="absolute top-5 right-5 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {images.length > 1 && (
            <>
              <button
                aria-label="Image précédente"
                onClick={e => { e.stopPropagation(); prev() }}
                disabled={active === 0}
                className="absolute left-5 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center disabled:opacity-20 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                aria-label="Image suivante"
                onClick={e => { e.stopPropagation(); next() }}
                disabled={active === images.length - 1}
                className="absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center disabled:opacity-20 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </>
          )}

          <div
            className="relative w-full max-w-xl sm:max-w-2xl aspect-square px-4"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={images[active]}
              alt={name}
              fill
              className="object-contain"
              sizes="90vw"
              onError={() => markBroken(active)}
            />
            {broken.has(active) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl opacity-20">📦</span>
              </div>
            )}
          </div>

          {/* Counter */}
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm tabular-nums">
            {active + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  )
}
