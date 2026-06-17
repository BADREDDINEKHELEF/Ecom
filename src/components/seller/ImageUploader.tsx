'use client'

import {
  useState, useRef, useCallback, useEffect,
  type DragEvent, type ChangeEvent,
} from 'react'
import { ImagePlus, X, Loader2, AlertCircle, GripVertical, CheckCircle2 } from 'lucide-react'

// ── Types ───────────────────────────────────────────────────────────────────

interface ImageItem {
  id:         string
  previewUrl: string
  finalUrl:   string | null
  uploading:  boolean
  error?:     string
  color?:     string
}

interface PendingItem {
  id:         string
  file:       File
  previewUrl: string
  color:      string
}

interface Props {
  value:             string[]
  onChange:          (urls: string[]) => void
  colors?:           string[]
  onColorsChange?:   (colors: string[]) => void
  maxImages?:        number
}

const COLOR_PRESETS = [
  { label: 'Blanc',   hex: '#F9FAFB', border: true  },
  { label: 'Noir',    hex: '#111827', border: false  },
  { label: 'Gris',    hex: '#9CA3AF', border: false  },
  { label: 'Beige',   hex: '#D4B896', border: false  },
  { label: 'Marron',  hex: '#92400E', border: false  },
  { label: 'Rouge',   hex: '#EF4444', border: false  },
  { label: 'Rose',    hex: '#EC4899', border: false  },
  { label: 'Orange',  hex: '#F97316', border: false  },
  { label: 'Jaune',   hex: '#EAB308', border: false  },
  { label: 'Vert',    hex: '#22C55E', border: false  },
  { label: 'Bleu',    hex: '#3B82F6', border: false  },
  { label: 'Violet',  hex: '#8B5CF6', border: false  },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

async function compressToWebP(file: File, maxPx = 1400, quality = 0.85): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new window.Image()
    const blobUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(blobUrl)
      try {
        const ratio = Math.min(maxPx / img.naturalWidth, maxPx / img.naturalHeight, 1)
        const w = Math.round(img.naturalWidth  * ratio)
        const h = Math.round(img.naturalHeight * ratio)
        const canvas = document.createElement('canvas')
        canvas.width  = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        canvas.toBlob(
          (blob) => resolve(blob ?? file),
          'image/webp',
          quality,
        )
      } catch {
        resolve(file)
      }
    }
    img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve(file) }
    img.src = blobUrl
  })
}

function isAllowedImage(type: string) { return type.startsWith('image/') || type === '' }
const MAX_MB = 10

// ── Component ────────────────────────────────────────────────────────────────

export default function ImageUploader({ value, onChange, colors, onColorsChange, maxImages = 8 }: Props) {
  const [items, setItems] = useState<ImageItem[]>(() =>
    value.map((url, i) => ({ id: uid(), previewUrl: url, finalUrl: url, uploading: false, color: colors?.[i] ?? '' }))
  )
  const [isDragOver,    setIsDragOver]    = useState(false)
  const [dropTarget,    setDropTarget]    = useState<number | null>(null)
  const [pendingItems,  setPendingItems]  = useState<PendingItem[]>([])
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const dragItemIdx   = useRef<number | null>(null)

  const syncParent = useCallback((next: ImageItem[]) => {
    const uploaded = next.filter(i => i.finalUrl)
    onChange(uploaded.map(i => i.finalUrl!))
    if (onColorsChange) onColorsChange(uploaded.map(i => i.color ?? ''))
  }, [onChange, onColorsChange])

  const prevValue = useRef(value)
  useEffect(() => {
    if (prevValue.current === value) return
    prevValue.current = value
    setItems((prev) => {
      if (prev.some((i) => i.uploading)) return prev
      return value.map((url) => ({ id: uid(), previewUrl: url, finalUrl: url, uploading: false }))
    })
  }, [value])

  // ── Upload a single file ─────────────────────────────────────────────────

  const uploadOne = useCallback(async (itemId: string, file: File) => {
    try {
      const compressed = await compressToWebP(file)
      const fd = new FormData()
      fd.append('file', new File([compressed], file.name, { type: 'image/webp' }))

      const res = await fetch('/api/seller/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Échec de l\'upload')
      }
      const { url } = await res.json() as { url: string }

      setItems((prev) => {
        const next = prev.map((it) =>
          it.id === itemId ? { ...it, finalUrl: url, uploading: false } : it
        )
        syncParent(next)
        return next
      })
    } catch (err) {
      setItems((prev) => prev.map((it) =>
        it.id === itemId
          ? { ...it, uploading: false, error: err instanceof Error ? err.message : 'Erreur' }
          : it
      ))
    }
  }, [syncParent])

  // ── Add confirmed files (with their chosen colors) ────────────────────────

  const addFiles = useCallback((files: File[], initialColors?: string[]) => {
    setItems((prev) => {
      const available = maxImages - prev.length
      const toAdd     = files.slice(0, Math.max(0, available))
      if (!toAdd.length) return prev

      const newItems: ImageItem[] = toAdd.map((f, i) => ({
        id:         uid(),
        previewUrl: URL.createObjectURL(f),
        finalUrl:   null,
        uploading:  true,
        color:      initialColors?.[i] ?? '',
      }))
      const next = [...prev, ...newItems]
      toAdd.forEach((f, i) => uploadOne(newItems[i].id, f))
      return next
    })
  }, [maxImages, uploadOne])

  // ── Handle incoming files: show color picker first if enabled ────────────

  const handleFilesSelected = useCallback((files: File[]) => {
    const valid = files.filter(
      f => isAllowedImage(f.type) && f.size <= MAX_MB * 1024 * 1024
    )
    if (!valid.length) return

    if (onColorsChange) {
      // Show color-picker modal before uploading
      setPendingItems(valid.map(f => ({
        id:         uid(),
        file:       f,
        previewUrl: URL.createObjectURL(f),
        color:      '',
      })))
    } else {
      addFiles(valid)
    }
  }, [onColorsChange, addFiles])

  const setPendingColor = (id: string, color: string) => {
    setPendingItems(prev =>
      prev.map(p => p.id === id ? { ...p, color: p.color === color ? '' : color } : p)
    )
  }

  const confirmPending = () => {
    const files  = pendingItems.map(p => p.file)
    const cols   = pendingItems.map(p => p.color)
    pendingItems.forEach(p => URL.revokeObjectURL(p.previewUrl))
    setPendingItems([])
    addFiles(files, cols)
  }

  const cancelPending = () => {
    pendingItems.forEach(p => URL.revokeObjectURL(p.previewUrl))
    setPendingItems([])
  }

  // Clean up pending blob URLs on unmount
  useEffect(() => {
    return () => { pendingItems.forEach(p => URL.revokeObjectURL(p.previewUrl)) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Drop zone handlers ───────────────────────────────────────────────────

  const handleZoneDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }

  const handleZoneDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFilesSelected(Array.from(e.dataTransfer.files))
  }

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFilesSelected(Array.from(e.target.files))
    e.target.value = ''
  }

  // ── Item drag-to-reorder ─────────────────────────────────────────────────

  const handleItemDragStart = (e: DragEvent<HTMLDivElement>, idx: number) => {
    dragItemIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleItemDragOver = (e: DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(idx)
  }

  const handleItemDrop = (e: DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault()
    setDropTarget(null)
    const from = dragItemIdx.current
    dragItemIdx.current = null
    if (from === null || from === idx) return
    setItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(idx, 0, moved)
      syncParent(next)
      return next
    })
  }

  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id)
      syncParent(next)
      return next
    })
  }

  const retryItem = (id: string) => removeItem(id)

  const canAdd    = items.length < maxImages
  const uploading = items.some((i) => i.uploading)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
    <div className="space-y-3">

      {/* ── Drop zone ── */}
      {canAdd && (
        <div
          onDragOver={handleZoneDragOver}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleZoneDrop}
          onClick={() => fileInputRef.current?.click()}
          className={[
            'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed',
            'cursor-pointer transition-all duration-200 select-none p-8',
            isDragOver
              ? 'border-emerald-400 bg-emerald-50/80 scale-[1.01]'
              : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50/60',
          ].join(' ')}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="sr-only"
            aria-label="Sélectionner des images"
          />

          <div className={[
            'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200',
            isDragOver ? 'bg-emerald-100' : 'bg-gray-100',
          ].join(' ')}>
            <ImagePlus className={`w-7 h-7 transition-colors ${isDragOver ? 'text-emerald-600' : 'text-gray-400'}`} />
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">
              {isDragOver ? 'Déposez les images ici' : 'Glissez-déposez ou cliquez pour ajouter'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              JPG · PNG · WebP · GIF &nbsp;·&nbsp; Max {MAX_MB} Mo &nbsp;·&nbsp; {items.length}/{maxImages} photos
            </p>
          </div>
        </div>
      )}

      {/* ── Thumbnail grid ── */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map((item, idx) => (
            <div
              key={item.id}
              draggable={!item.uploading}
              onDragStart={(e) => handleItemDragStart(e, idx)}
              onDragOver={(e) => handleItemDragOver(e, idx)}
              onDrop={(e) => handleItemDrop(e, idx)}
              onDragEnd={() => { dragItemIdx.current = null; setDropTarget(null) }}
              className={[
                'relative aspect-square rounded-xl overflow-hidden bg-gray-100 group',
                'transition-all duration-150',
                !item.uploading ? 'cursor-grab active:cursor-grabbing' : 'cursor-wait',
                dropTarget === idx && dragItemIdx.current !== idx
                  ? 'ring-2 ring-emerald-400 ring-offset-1 scale-[0.96]'
                  : '',
              ].join(' ')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" draggable={false} />

              {idx === 0 && !item.uploading && !item.error && (
                <span className="absolute bottom-1.5 left-1.5 text-[9px] font-black tracking-wider bg-black/60 backdrop-blur-sm text-white px-1.5 py-0.5 rounded-md uppercase">
                  Principale
                </span>
              )}

              {item.uploading && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1.5">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                  <span className="text-[10px] text-white/80 font-medium">Upload…</span>
                </div>
              )}

              {item.error && (
                <div
                  role="button"
                  onClick={() => retryItem(item.id)}
                  className="absolute inset-0 bg-red-500/85 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1 cursor-pointer"
                  title="Cliquer pour supprimer"
                >
                  <AlertCircle className="w-5 h-5 text-white" />
                  <span className="text-[9px] text-white font-bold px-1 text-center leading-tight">{item.error}</span>
                  <span className="text-[9px] text-white/70">Cliquer pour retirer</span>
                </div>
              )}

              {!item.uploading && !item.error && item.finalUrl && (
                <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-black/10 transition-colors duration-150" />
              )}

              {!item.uploading && !item.error && (
                <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-4 h-4 text-white drop-shadow" />
                </div>
              )}

              {!item.uploading && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}
                  className={[
                    'absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center',
                    'bg-black/50 hover:bg-red-500 text-white transition-all duration-150',
                    'opacity-0 group-hover:opacity-100',
                  ].join(' ')}
                  aria-label="Supprimer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}

              {/* Color badge */}
              {item.color && !item.uploading && !item.error && (
                <div
                  className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full border-2 border-white shadow"
                  style={{ background: COLOR_PRESETS.find(c => c.label === item.color)?.hex ?? '#9CA3AF' }}
                  title={item.color}
                />
              )}
            </div>
          ))}

          {canAdd && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 flex items-center justify-center transition-all duration-150 group"
              aria-label="Ajouter plus d'images"
            >
              <ImagePlus className="w-6 h-6 text-gray-300 group-hover:text-emerald-500 transition-colors" />
            </button>
          )}
        </div>
      )}

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between text-xs text-gray-400 px-0.5">
        {uploading ? (
          <span className="flex items-center gap-1.5 text-amber-600 font-medium">
            <Loader2 className="w-3 h-3 animate-spin" /> Upload en cours…
          </span>
        ) : items.length > 0 ? (
          <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <CheckCircle2 className="w-3 h-3" /> {items.filter(i => i.finalUrl).length} image{items.filter(i => i.finalUrl).length !== 1 ? 's' : ''} prête{items.filter(i => i.finalUrl).length !== 1 ? 's' : ''}
          </span>
        ) : (
          <span>Aucune image ajoutée</span>
        )}
        <span>Glissez pour réorganiser</span>
      </div>
    </div>

    {/* ── Color-picker modal (appears before upload) ── */}
    {pendingItems.length > 0 && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="px-5 pt-5 pb-3">
            <p className="font-bold text-gray-900 text-base">Choisir une couleur</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {(() => {
                const available = maxImages - items.length
                const willAdd = Math.min(pendingItems.length, available)
                return willAdd < pendingItems.length
                  ? `${pendingItems.length - willAdd} photo(s) ignorée(s) — seulement ${willAdd} slot(s) disponible(s)`
                  : 'Associez une couleur à chaque photo (optionnel)'
              })()}
            </p>
          </div>

          {/* Image list */}
          <div className="px-5 space-y-4 max-h-[55vh] overflow-y-auto pb-1">
            {pendingItems.map((p) => (
              <div key={p.id} className="flex gap-3 items-start">
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.previewUrl}
                  alt=""
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                />

                {/* Color swatches */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c.label}
                      type="button"
                      title={c.label}
                      onClick={() => setPendingColor(p.id, c.label)}
                      className={[
                        'w-6 h-6 rounded-full transition-all duration-150 flex-shrink-0',
                        c.border ? 'border border-gray-300' : '',
                        p.color === c.label
                          ? 'ring-2 ring-offset-2 ring-gray-700 scale-110'
                          : 'hover:scale-110',
                      ].join(' ')}
                      style={{ background: c.hex }}
                    />
                  ))}
                  {/* Selected label */}
                  {p.color && (
                    <span className="self-center text-xs font-medium text-gray-500">{p.color}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-5 py-4 border-t border-gray-100 mt-3">
            <button
              type="button"
              onClick={cancelPending}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirmPending}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-colors"
            >
              Ajouter {pendingItems.length > 1 ? `(${pendingItems.length})` : ''}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
