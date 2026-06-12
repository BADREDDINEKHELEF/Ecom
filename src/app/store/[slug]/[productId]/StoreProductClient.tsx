'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, CheckCircle, Minus, Plus } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { formatPrice } from '@/lib/utils'

interface Props {
  product: {
    id: string
    name: string
    price: number
    image: string
    stock: number
    nicheId: string
  }
  accent: string
  vendorWhatsApp?: string | null
  storeName: string
}

const WA_SVG = (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

const WA_SVG_SM = (
  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
)

export default function StoreProductClient({ product, accent, vendorWhatsApp, storeName }: Props) {
  const addItem = useCartStore(s => s.addItem)
  const [qty,     setQty]     = useState(1)
  const [added,   setAdded]   = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleAdd = () => {
    addItem({
      id:      product.id,
      name:    product.name,
      price:   product.price,
      images:  [product.image],
      nicheId: product.nicheId,
    } as Parameters<typeof addItem>[0], qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  const buildWaHref = () => {
    if (!vendorWhatsApp) return null
    const number = vendorWhatsApp.replace(/\D/g, '')
    const total  = formatPrice(product.price * qty)
    const msg = encodeURIComponent(
      `🛍️ *COMMANDE — ${storeName}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *Produit:* ${product.name}\n` +
      `🔢 *Quantité:* ${qty}\n` +
      `💰 *Total:* ${total}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💵 Paiement à la livraison\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Merci de confirmer :\n` +
      `• Wilaya + adresse complète\n` +
      `• Nom complet\n` +
      `• Numéro de téléphone`,
    )
    return `https://wa.me/${number}?text=${msg}`
  }

  if (product.stock === 0) {
    return (
      <button
        disabled
        className="w-full py-4 rounded-2xl text-sm font-bold bg-[#f5f5f7] text-[#86868b] cursor-not-allowed tracking-wide"
      >
        Rupture de stock
      </button>
    )
  }

  const waHref = buildWaHref()

  return (
    <>
      {/* Quantity — clean Apple-style */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-[#1d1d1f]">Quantité</span>
        <div className="flex items-center bg-[#f5f5f7] rounded-2xl overflow-hidden">
          <button
            onClick={() => setQty(q => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center text-[#1d1d1f] hover:bg-[#e8e8ed] transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-10 text-center text-sm font-bold text-[#1d1d1f] tabular-nums">{qty}</span>
          <button
            onClick={() => setQty(q => Math.min(product.stock, q + 1))}
            className="w-10 h-10 flex items-center justify-center text-[#1d1d1f] hover:bg-[#e8e8ed] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {qty > 1 && (
          <span className="text-sm text-[#86868b] font-medium tabular-nums">
            = {formatPrice(product.price * qty)}
          </span>
        )}
      </div>

      {/* WhatsApp — PRIMARY, Apple-style large button */}
      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-white bg-[#25D366] hover:bg-[#20c35a] active:scale-[.98] transition-all duration-200 shadow-lg shadow-green-600/20 text-[15px]"
        >
          {WA_SVG}
          Commander via WhatsApp
        </a>
      )}

      {/* Add to cart — secondary, smaller */}
      <button
        onClick={handleAdd}
        style={added ? {} : { background: accent }}
        className={`w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-200 active:scale-[.98] ${
          added ? 'bg-emerald-500' : 'hover:opacity-90'
        }`}
      >
        {added ? (
          <><CheckCircle className="w-4 h-4" /> Ajouté au panier</>
        ) : (
          <><ShoppingCart className="w-4 h-4" /> Ajouter au panier</>
        )}
      </button>

      {/* ── Mobile sticky bottom bar — slides up on scroll ──────────── */}
      <div
        className={`fixed bottom-0 inset-x-0 z-50 lg:hidden transition-transform duration-300 ease-out ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Frosted glass bar */}
        <div className="bg-white/90 backdrop-blur-xl border-t border-black/[0.08] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-4 py-3 flex items-center gap-3">
          <div className="flex-shrink-0 min-w-0">
            <p className="text-base font-black text-[#1d1d1f] tabular-nums leading-tight">
              {formatPrice(product.price * qty)}
            </p>
            {qty > 1 && (
              <p className="text-[10px] text-[#86868b]">×{qty}</p>
            )}
          </div>

          <div className="flex-1 flex gap-2">
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white font-black py-3.5 rounded-2xl text-sm shadow-md shadow-green-600/20 active:scale-[.98] transition-all"
              >
                {WA_SVG_SM} Commander
              </a>
            ) : (
              <button
                onClick={handleAdd}
                style={{ background: accent }}
                className="flex-1 flex items-center justify-center gap-2 text-white font-black py-3.5 rounded-2xl text-sm active:scale-[.98] transition-all"
              >
                <ShoppingCart className="w-4 h-4" />
                {added ? 'Ajouté ✓' : 'Ajouter'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
