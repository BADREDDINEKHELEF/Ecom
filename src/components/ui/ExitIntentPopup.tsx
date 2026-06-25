'use client'

import { useEffect, useState } from 'react'
import { X, Tag, Truck } from 'lucide-react'

const PROMO_CODE = 'BIENVENUE10'
const SESSION_KEY = 'exit_popup_dismissed'

export default function ExitIntentPopup() {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(SESSION_KEY)) return

    let triggered = false

    const handleMouseLeave = (e: MouseEvent) => {
      if (triggered || e.clientY > 10) return
      triggered = true
      setVisible(true)
    }

    // Fallback: show after 45s if user never moved mouse to top
    const timer = setTimeout(() => {
      if (!triggered && !sessionStorage.getItem(SESSION_KEY)) {
        triggered = true
        setVisible(true)
      }
    }, 45_000)

    document.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave)
      clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1')
    setVisible(false)
  }

  const copy = async () => {
    await navigator.clipboard.writeText(PROMO_CODE).catch(() => null)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <div className="px-8 pt-8 pb-7 text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Tag className="w-8 h-8 text-indigo-600" />
          </div>

          <h2 className="text-2xl font-black text-gray-900 mb-2">
            Attendez! 🎁
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Obtenez <strong className="text-gray-900">10% de réduction</strong> sur votre première commande. Livraison gratuite sur toute l&apos;Algérie.
          </p>

          <div className="bg-gray-50 border-2 border-dashed border-indigo-300 rounded-2xl px-5 py-4 mb-4">
            <p className="text-xs text-gray-500 mb-1">Votre code promo</p>
            <p className="text-2xl font-black text-indigo-600 tracking-widest">{PROMO_CODE}</p>
          </div>

          <button
            onClick={copy}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {copied ? '✓ Code copié!' : 'Copier le code'}
          </button>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <Truck className="w-3.5 h-3.5" />
            Livraison partout en Algérie · Paiement à la livraison
          </div>

          <button onClick={dismiss} className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Non merci, continuer sans réduction
          </button>
        </div>
      </div>
    </div>
  )
}
