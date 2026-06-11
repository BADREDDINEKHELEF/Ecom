'use client'

import { useRef, useState } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'

interface Props {
  value: string
  onChange: (url: string) => void
  size?: number
}

export default function LogoUploader({ value, onChange, size = 96 }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Image uniquement'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Max 5 Mo'); return }
    setError('')
    setUploading(true)
    try {
      const compressed = await compressSquare(file, 400)
      const fd = new FormData()
      fd.append('file', new File([compressed], file.name, { type: 'image/webp' }))
      const res = await fetch('/api/seller/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json() as { url: string }
      onChange(url)
    } catch {
      setError('Échec de l\'upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Preview circle */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-200 hover:border-emerald-400 transition-colors group"
        style={{ width: size, height: size }}
        aria-label="Changer le logo"
      >
        {uploading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          </div>
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400 group-hover:text-emerald-500 transition-colors">
            <ImagePlus className="w-6 h-6" />
            <span className="text-[10px] font-semibold">Logo</span>
          </div>
        )}

        {/* Edit overlay on hover */}
        {value && !uploading && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <ImagePlus className="w-5 h-5 text-white" />
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = '' }}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-700">Logo de la boutique</p>
        <p className="text-xs text-gray-400 mt-0.5">JPG, PNG ou WebP · Max 5 Mo · Carré recommandé</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-2 transition-colors"
          >
            <X className="w-3 h-3" /> Supprimer le logo
          </button>
        )}
      </div>
    </div>
  )
}

async function compressSquare(file: File, maxPx: number): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new window.Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(blobUrl)
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight, maxPx)
        const canvas = document.createElement('canvas')
        canvas.width = side
        canvas.height = side
        const ctx = canvas.getContext('2d')!
        const sx = (img.naturalWidth - Math.min(img.naturalWidth, img.naturalHeight)) / 2
        const sy = (img.naturalHeight - Math.min(img.naturalWidth, img.naturalHeight)) / 2
        const s = Math.min(img.naturalWidth, img.naturalHeight)
        ctx.drawImage(img, sx, sy, s, s, 0, 0, side, side)
        canvas.toBlob((blob) => resolve(blob ?? file), 'image/webp', 0.9)
      } catch {
        resolve(file)
      }
    }
    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file) }
    img.src = blobUrl
  })
}
