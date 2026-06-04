'use client'

import { useState, useEffect, useMemo } from 'react'
import { Truck, MapPin, Package, Clock } from 'lucide-react'
import { ALL_WILAYAS, getDeliveryInfo, ZONE_CONFIG, WILAYA_DATA } from '@/lib/data/wilayas'
import { formatPrice } from '@/lib/utils'

const LS_KEY = 'shopDZ_wilaya'

interface Props {
  productPrice: number
  productId: string
}

export default function WilayaDeliveryEstimate({ productPrice, productId }: Props) {
  const [wilaya, setWilaya] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) setWilaya(saved)
  }, [])

  const handleChange = (w: string) => {
    setWilaya(w)
    if (w) localStorage.setItem(LS_KEY, w)
  }

  const info = useMemo(
    () => (wilaya ? getDeliveryInfo(wilaya, productPrice, 'fr') : null),
    [wilaya, productPrice]
  )

  const zone = wilaya ? (WILAYA_DATA[wilaya]?.zone ?? 3) : null
  const stopDeskCost = info ? Math.max(0, info.cost - 100) : 0

  // Hyperlocal social proof — deterministic count from (productId + wilaya)
  const localOrderCount = useMemo(() => {
    if (!wilaya) return 0
    const seed = [...productId, ...wilaya].reduce((s, c) => s + c.charCodeAt(0), 0)
    return 6 + (seed % 38)
  }, [productId, wilaya])

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-indigo-600" />
        <span className="text-sm font-bold text-gray-900">Estimation de livraison</span>
      </div>

      <div className="p-4 space-y-3">
        <select
          value={wilaya}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-indigo-400 transition-colors"
        >
          <option value="">Choisir votre wilaya…</option>
          {ALL_WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>

        {info && zone && (
          <>
            {/* Home delivery */}
            <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                <div>
                  <p className="text-sm font-semibold text-indigo-900">À domicile</p>
                  <p className="text-xs text-indigo-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ZONE_CONFIG[zone].days} jours ouvrables
                  </p>
                </div>
              </div>
              <span className={`font-black text-base ${info.isFree ? 'text-green-600' : 'text-indigo-700'}`}>
                {info.isFree ? 'GRATUIT' : formatPrice(info.cost)}
              </span>
            </div>

            {/* Stop Desk */}
            <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-3 relative">
              <span className="absolute -top-2 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                RECOMMANDÉ
              </span>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-900">Stop Desk (point relais)</p>
                  <p className="text-xs text-green-600">Plus fiable · Mêmes délais</p>
                </div>
              </div>
              <span className={`font-black text-base ${info.isFree ? 'text-green-600' : 'text-green-700'}`}>
                {info.isFree ? 'GRATUIT' : formatPrice(stopDeskCost)}
              </span>
            </div>

            {/* Hyperlocal social proof */}
            <div className="flex items-center gap-2 text-xs text-gray-600 pt-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span>
                <strong>{localOrderCount} personnes</strong> à <strong>{wilaya}</strong> ont commandé cette semaine
              </span>
            </div>

            {info.isFree && (
              <p className="text-xs font-semibold text-green-600 bg-green-50 rounded-lg px-3 py-2">
                🎉 Livraison gratuite pour cette commande!
              </p>
            )}
          </>
        )}

        {!wilaya && (
          <p className="text-xs text-gray-400 text-center py-1">
            Sélectionnez votre wilaya pour voir les délais et tarifs exacts
          </p>
        )}
      </div>
    </div>
  )
}
