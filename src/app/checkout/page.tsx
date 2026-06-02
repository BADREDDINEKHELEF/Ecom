'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CheckCircle, Truck, Banknote, CreditCard, Shield, Lock, MapPin, Loader2 } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { useT, useLang } from '@/lib/store/langStore'
import { formatPrice } from '@/lib/utils'
import { getDeliveryInfo, ALL_WILAYAS } from '@/lib/data/wilayas'

// Strip accents + "wilaya de/d'" prefix so Nominatim state names match our list
function normalizeW(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/^wilaya\s+(d[e']?\s+)?/i, '')
    .trim()
}

function matchWilaya(state: string): string {
  if (!state) return ''
  const norm = normalizeW(state)
  return (
    ALL_WILAYAS.find((w) => normalizeW(w) === norm) ??
    ALL_WILAYAS.find((w) => { const wn = normalizeW(w); return wn.includes(norm) || norm.includes(wn) }) ??
    ''
  )
}

type PaymentMethod = 'cash' | 'card' | 'edahabia' | 'cib'

const PAYMENT_ICONS: Record<PaymentMethod, React.ReactNode> = {
  cash:      <Banknote className="w-5 h-5" />,
  card:      <CreditCard className="w-5 h-5" />,
  edahabia: (
    <svg viewBox="0 0 40 24" className="w-8 h-5 fill-current text-amber-500">
      <rect width="40" height="24" rx="4" className="fill-amber-100" />
      <text x="4" y="17" fontSize="10" fontWeight="bold" fill="#d97706">Edaha</text>
    </svg>
  ),
  cib: (
    <svg viewBox="0 0 40 24" className="w-8 h-5">
      <rect width="40" height="24" rx="4" fill="#1e3a8a" />
      <text x="6" y="17" fontSize="11" fontWeight="bold" fill="white">CIB</text>
    </svg>
  ),
}

export default function CheckoutPage() {
  const { items, total, clearCart } = useCartStore()
  const t = useT()
  const lang = useLang()
  const cartTotal = total()

  const [payment, setPayment] = useState<PaymentMethod>('cash')
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    fullName: '', phone: '', address: '', city: '', wilaya: '',
  })
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')

  const handleLocate = () => {
    if (!navigator.geolocation) { setLocError(t.checkout.locationFailed); return }
    setLocating(true)
    setLocError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`,
            { headers: { 'Accept-Language': 'fr' } }
          )
          const data = await res.json()
          const addr = data.address ?? {}
          const street = [addr.house_number, addr.road].filter(Boolean).join(' ')
          const city   = addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? ''
          const state  = addr.state ?? addr.county ?? ''
          setForm((prev) => ({
            ...prev,
            ...(street  && { address: street }),
            ...(city    && { city }),
            ...(matchWilaya(state) && { wilaya: matchWilaya(state) }),
          }))
        } catch {
          setLocError(t.checkout.locationFailed)
        } finally {
          setLocating(false)
        }
      },
      () => { setLocError(t.checkout.locationDenied); setLocating(false) },
      { timeout: 10000, enableHighAccuracy: false }
    )
  }

  const delivery = useMemo(
    () => getDeliveryInfo(form.wilaya, cartTotal, lang === 'ar' ? 'ar' : lang === 'fr' ? 'fr' : 'en'),
    [form.wilaya, cartTotal, lang]
  )

  const orderTotal = cartTotal + delivery.cost

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    clearCart()
  }

  const f = (key: keyof typeof form, val: string) => setForm({ ...form, [key]: val })

  if (items.length === 0 && !submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 mb-6">{t.cart.empty}</p>
        <Link href="/" className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-700">
          <ArrowLeft className="w-4 h-4" /> {t.cart.continueShopping}
        </Link>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">{t.checkout.confirmed}</h1>
        <p className="text-gray-500 mb-8">
          {t.checkout.confirmedMsg.replace('{phone}', form.phone)}
        </p>
        <div className="bg-gray-50 rounded-2xl p-5 text-left mb-8 space-y-2 text-sm text-gray-700">
          <p><span className="font-semibold">{t.checkout.fullName}:</span> {form.fullName}</p>
          <p><span className="font-semibold">{t.checkout.phone}:</span> {form.phone}</p>
          <p><span className="font-semibold">{t.checkout.address}:</span> {form.address}, {form.city}, {form.wilaya}</p>
          <p><span className="font-semibold">{t.checkout.payment}:</span> {
            payment === 'cash' ? t.checkout.cash :
            payment === 'edahabia' ? t.checkout.edahabia :
            payment === 'cib' ? t.checkout.cib :
            t.checkout.card
          }</p>
          <p><span className="font-semibold">Total:</span> {formatPrice(orderTotal)}</p>
          <p><span className="font-semibold">{t.checkout.estimatedDelivery}</span> {delivery.days}</p>
        </div>
        <Link href="/" className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-700 transition-colors">
          {t.cart.continueShopping}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* COD Trust Banner */}
      <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-3 mb-6 flex items-center gap-3">
        <Shield className="w-5 h-5 text-green-600 flex-shrink-0" />
        <p className="text-green-800 text-sm font-semibold">
          {t.trust.cod} — <span className="font-normal text-green-700">{t.trust.codText}</span>
        </p>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <Link href="/cart" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-black text-gray-900">{t.checkout.title}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Delivery Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-600" />
                <h2 className="font-bold text-gray-900">{t.checkout.shippingInfo}</h2>
              </div>
              <button
                type="button"
                onClick={handleLocate}
                disabled={locating}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-colors"
              >
                {locating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <MapPin className="w-3.5 h-3.5" />}
                {locating ? t.checkout.detecting : t.checkout.detectLocation}
              </button>
            </div>
            {locError && (
              <p className="text-xs text-red-500 -mt-3 mb-4">{locError}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.checkout.fullName}</label>
                <input required type="text" value={form.fullName} onChange={(e) => f('fullName', e.target.value)}
                  placeholder="Mohammed Amiri"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.checkout.phone}</label>
                <input required type="tel" value={form.phone} onChange={(e) => f('phone', e.target.value)}
                  placeholder="0555 00 00 00"
                  pattern="(05|06|07)[0-9]{8}"
                  title="Numéro algérien: 05xx, 06xx ou 07xx"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.checkout.city}</label>
                <input required type="text" value={form.city} onChange={(e) => f('city', e.target.value)}
                  placeholder="Alger"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.checkout.wilaya}</label>
                <select required value={form.wilaya} onChange={(e) => f('wilaya', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 bg-white">
                  <option value="">{t.checkout.selectWilaya}</option>
                  {ALL_WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              {/* Delivery estimate shown once wilaya selected */}
              {form.wilaya && (
                <div className="sm:col-span-2 bg-indigo-50 rounded-xl px-4 py-3 flex items-center gap-3">
                  <Truck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-semibold text-indigo-800">{t.checkout.estimatedDelivery} </span>
                    <span className="text-indigo-700">{delivery.days}</span>
                    {delivery.isFree ? (
                      <span className="ml-2 text-green-600 font-bold">— {t.cart.freeShipping}!</span>
                    ) : (
                      <span className="ml-2 text-gray-600">— {formatPrice(delivery.cost)}</span>
                    )}
                  </div>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.checkout.address}</label>
                <input required type="text" value={form.address} onChange={(e) => f('address', e.target.value)}
                  placeholder="123 Rue Didouche Mourad"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Lock className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-gray-900">{t.checkout.payment}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: 'cash'     as PaymentMethod, label: t.checkout.cash,     desc: t.checkout.cashDesc,     recommended: true  },
                { id: 'edahabia' as PaymentMethod, label: t.checkout.edahabia, desc: t.checkout.edahabiaDesc, recommended: false },
                { id: 'cib'      as PaymentMethod, label: t.checkout.cib,      desc: t.checkout.cibDesc,      recommended: false },
                { id: 'card'     as PaymentMethod, label: t.checkout.card,     desc: t.checkout.cardDesc,     recommended: false },
              ]).map(({ id, label, desc, recommended }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPayment(id)}
                  className={`flex flex-col gap-2 p-4 rounded-xl border-2 text-left transition-colors relative ${
                    payment === id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {recommended && (
                    <span className="absolute -top-2 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      ✓
                    </span>
                  )}
                  <div className={payment === id ? 'text-indigo-600' : 'text-gray-500'}>
                    {PAYMENT_ICONS[id]}
                  </div>
                  <p className={`text-sm font-bold ${payment === id ? 'text-indigo-700' : 'text-gray-900'}`}>{label}</p>
                  <p className="text-xs text-gray-500 leading-tight">{desc}</p>
                </button>
              ))}
            </div>
            {payment === 'cash' && (
              <div className="mt-4 bg-green-50 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-green-700">
                <Shield className="w-4 h-4 flex-shrink-0" />
                <span>{t.trust.cod} — {t.trust.codText}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all text-lg flex items-center justify-center gap-2"
          >
            <Lock className="w-5 h-5" />
            {t.checkout.placeOrder} — {formatPrice(orderTotal)}
          </button>
        </form>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-5 shadow-sm sticky top-24">
            <h2 className="font-bold text-gray-900 mb-4">{t.checkout.orderSummary}</h2>
            <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="56px" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{product.name}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900">{formatPrice(product.price * quantity)}</p>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t.cart.subtotal}</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{t.cart.shipping}</span>
                <span className={delivery.isFree ? 'text-green-600 font-bold' : ''}>
                  {delivery.isFree ? t.cart.freeShipping : form.wilaya ? formatPrice(delivery.cost) : '—'}
                </span>
              </div>
              {!form.wilaya && (
                <p className="text-xs text-gray-400">{t.checkout.selectWilaya}</p>
              )}
              <div className="flex justify-between font-black text-gray-900 border-t pt-2 text-base">
                <span>{t.cart.total}</span>
                <span>{formatPrice(orderTotal)}</span>
              </div>
            </div>
            {/* Trust micro-badges */}
            <div className="mt-4 pt-4 border-t space-y-2">
              {[
                { icon: '🔒', text: t.trust.secure + ' — ' + t.trust.secureText },
                { icon: '🚚', text: t.trust.delivery + ' — ' + t.trust.deliveryText },
                { icon: '↩️', text: t.trust.returns + ' — ' + t.trust.returnsText },
              ].map(({ icon, text }) => (
                <div key={icon} className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{icon}</span> {text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
