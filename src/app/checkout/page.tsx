'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
const PixelConfetti = dynamic(() => import('@/components/effects/PixelConfetti'), { ssr: false })
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CheckCircle, Truck, Banknote, CreditCard, Shield, Lock, MapPin, Loader2, Tag, X, Phone, Gift, Star } from 'lucide-react'
import PhoneInput from '@/components/checkout/PhoneInput'
import B2BInvoiceFields, { type B2BFields } from '@/components/checkout/B2BInvoiceFields'
import { useCartStore } from '@/lib/store/cartStore'
import { useT, useLang } from '@/lib/store/langStore'
import { formatPrice } from '@/lib/utils'
import { getDeliveryInfo, ALL_WILAYAS } from '@/lib/data/wilayas'
import { getCommunesForWilaya } from '@/lib/data/communes'
// createOrder is now called via /api/orders (server-side, not client-side)
import { useAbandonedCheckout } from '@/hooks/useAbandonedCheckout'
import { trackPurchase } from '@/lib/analytics'
import { track } from '@/lib/analytics/track'

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

type PaymentMethod = 'cash' | 'card' | 'edahabia' | 'cib' | 'baridimob'

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
  baridimob: (
    <svg viewBox="0 0 40 24" className="w-8 h-5">
      <rect width="40" height="24" rx="4" fill="#d97706" />
      <text x="3" y="17" fontSize="9" fontWeight="bold" fill="white">Baridi</text>
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
  const [confettiDone, setConfettiDone] = useState(false)
  const [form, setForm] = useState({
    fullName: '', phone: '', address: '', city: '', wilaya: '', notes: '',
  })
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const { save: saveAbandoned, markRecovered } = useAbandonedCheckout()

  const [b2b, setB2b] = useState<B2BFields>({ isB2B: false, companyName: '', nif: '', nis: '', rc: '' })

  const [baridimobModal, setBaridimobModal] = useState<{ qrCodeData: string; deepLink: string; expiresAt: string } | null>(null)
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!baridimobModal?.qrCodeData) { setQrImageUrl(null); return }
    let cancelled = false
    import('qrcode').then((QRCode) =>
      QRCode.toDataURL(baridimobModal.qrCodeData, { width: 280, margin: 2, color: { dark: '#1a1a1a', light: '#fffbeb' } })
    ).then((url) => { if (!cancelled) setQrImageUrl(url) })
      .catch(() => { if (!cancelled) setQrImageUrl(null) })
    return () => { cancelled = true }
  }, [baridimobModal?.qrCodeData])

  const [promoInput, setPromoInput] = useState('')
  const [promoApplying, setPromoApplying] = useState(false)
  const [promoResult, setPromoResult] = useState<{
    id: string; discountType: 'percentage' | 'fixed'; discountValue: number; discountAmount: number; code: string
  } | null>(null)
  const [promoError, setPromoError] = useState('')

  const [giftCardInput, setGiftCardInput] = useState('')
  const [giftCardApplying, setGiftCardApplying] = useState(false)
  const [giftCardResult, setGiftCardResult] = useState<{ id: string; code: string; balance: number; deduction: number } | null>(null)
  const [giftCardError, setGiftCardError] = useState('')

  const [loyaltyBalance, setLoyaltyBalance] = useState<number | null>(null)
  const [usePoints, setUsePoints] = useState(false)

  useEffect(() => {
    fetch('/api/loyalty')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.balance > 0) setLoyaltyBalance(d.balance) })
      .catch(() => {})
    track('checkout_start', {})
  }, [])

  const handleLocate = () => {
    if (!navigator.geolocation) { setLocError(t.checkout.locationFailed); return }
    setLocating(true)
    setLocError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords
          const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`)
          if (!res.ok) throw new Error('geocode failed')
          const data = await res.json()
          setForm((prev) => ({
            ...prev,
            ...(data.street && { address: data.street }),
            ...(data.city   && { city: data.city }),
            ...(matchWilaya(data.state) && { wilaya: matchWilaya(data.state) }),
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

  const discountAmount = promoResult?.discountAmount ?? 0
  const giftCardDeduction = giftCardResult?.deduction ?? 0
  const pointsDeduction = (usePoints && loyaltyBalance) ? Math.min(loyaltyBalance, Math.max(0, cartTotal - discountAmount - giftCardDeduction)) : 0
  const orderTotal = Math.max(0, cartTotal - discountAmount - giftCardDeduction - pointsDeduction + delivery.cost)

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return
    setPromoApplying(true)
    setPromoError('')
    setPromoResult(null)
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput.trim(), orderTotal: cartTotal }),
      })
      const data = await res.json()
      if (data.valid) {
        setPromoResult({
          id: data.promo.id,
          discountType: data.promo.discount_type,
          discountValue: data.promo.discount_value,
          discountAmount: data.discountAmount,
          code: data.promo.code,
        })
      } else {
        const msgMap: Record<string, string> = {
          invalid: t.checkout.promoInvalid,
          expired: t.checkout.promoExpired,
          maxed: t.checkout.promoMaxed,
          min_order: t.checkout.promoMinOrder,
        }
        setPromoError(msgMap[data.message] ?? t.checkout.promoInvalid)
      }
    } catch {
      setPromoError(t.checkout.promoInvalid)
    } finally {
      setPromoApplying(false)
    }
  }

  const handleApplyGiftCard = async () => {
    if (!giftCardInput.trim()) return
    setGiftCardApplying(true)
    setGiftCardError('')
    setGiftCardResult(null)
    try {
      const res = await fetch('/api/gift-cards/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCardInput.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        const deduction = Math.min(data.balance, cartTotal)
        setGiftCardResult({ id: data.id, code: giftCardInput.trim().toUpperCase(), balance: data.balance, deduction })
      } else {
        setGiftCardError(data.error ?? 'Code cadeau invalide')
      }
    } catch {
      setGiftCardError('Erreur lors de la vérification')
    } finally {
      setGiftCardApplying(false)
    }
  }

  const validatePhone = (val: string) => {
    if (!val) { setPhoneError(''); return }
    const clean = val.replace(/\s+/g, '')
    if (!/^(213[5-7]|0[5-7])\d{8}$/.test(clean)) {
      setPhoneError('Numéro invalide — commencez par 05, 06, 07 ou 213 (format international)')
    } else {
      setPhoneError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    if (phoneError) return
    setSaving(true)
    setSaveError('')

    // MOQ validation
    for (const { product, quantity } of items) {
      const moq = product.minOrderQuantity ?? 1
      if (quantity < moq) {
        setSaveError(`Quantité minimale pour "${product.name}" : ${moq} unités`)
        setSaving(false)
        return
      }
    }

    const orderPayload = {
      fullName:       form.fullName,
      phone:          form.phone,
      wilaya:         form.wilaya,
      city:           form.city,
      address:        form.address,
      paymentMethod:  payment,
      shippingCost:   delivery.cost,
      promoCodeId:    promoResult?.id ?? null,
      discountAmount: discountAmount || 0,
      giftCardCode:   giftCardResult?.code ?? null,
      giftCardDeduction: giftCardDeduction || 0,
      pointsRedeemed: pointsDeduction || 0,
      notes:          form.notes.trim() || null,
      isB2B:          b2b.isB2B || undefined,
      companyName:    b2b.isB2B ? b2b.companyName || null : null,
      nif:            b2b.isB2B ? b2b.nif || null : null,
      nis:            b2b.isB2B ? b2b.nis || null : null,
      rc:             b2b.isB2B ? b2b.rc  || null : null,
      items: items.map(({ product, quantity }) => ({
        productId:    product.id,
        productName:  product.name,
        productImage: product.images?.[0] || '',
        quantity,
      })),
    }

    // Snapshot cart before any clearCart() call
    const cartSnapshot = items.map(({ product, quantity }) => ({
      id: product.id, name: product.name, price: product.price, quantity,
    }))

    try {
      // Cash on Delivery — existing fast path
      if (payment === 'cash') {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          setSaveError(res.status === 409 ? (errData.error ?? t.checkout.orderFailed) : t.checkout.orderFailed)
          return
        }
        const orderData = await res.json().catch(() => ({}))
        trackPurchase({ transactionId: orderData.id ?? `cod_${Date.now()}`, total: orderTotal, items: cartSnapshot })
        track('checkout_complete', { order_id: orderData.id, total: orderTotal, payment_method: 'cash', wilaya: form?.wilaya })

        markRecovered()
        setSubmitted(true)
        clearCart()
        return
      }

      // Online payment — Satim (CIB/Edahabia/Card) or BaridiMob
      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        if (res.status === 503) {
          setSaveError('Le paiement en ligne n\'est pas encore disponible. Veuillez choisir le paiement à la livraison.')
        } else if (res.status === 409) {
          setSaveError(errData.error ?? t.checkout.orderFailed)
        } else {
          setSaveError(t.checkout.orderFailed)
        }
        return
      }

      const data = await res.json()
      markRecovered()

      if (data.method === 'satim' && data.formUrl) {
        clearCart()
        window.location.href = data.formUrl
        return
      }

      if (data.method === 'baridimob' && data.qrCodeData) {
        clearCart()
        setBaridimobModal({ qrCodeData: data.qrCodeData, deepLink: data.deepLink, expiresAt: data.expiresAt })
        return
      }

      // Fallback
      setSubmitted(true)
      clearCart()
    } catch {
      setSaveError(t.checkout.orderFailed)
    } finally {
      setSaving(false)
    }
  }

  const f = (key: keyof typeof form, val: string) => {
    const next = { ...form, [key]: val }
    setForm(next)
    // Auto-save on every field change for abandoned checkout recovery
    saveAbandoned({
      name: next.fullName,
      phone: next.phone,
      wilaya: next.wilaya,
      address: next.address,
      cartSnapshot: items.map(({ product, quantity }) => ({ id: product.id, name: product.name, quantity, price: product.price })),
      cartTotal,
    })
  }

  // BaridiMob modal
  if (baridimobModal) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CreditCard className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-xl font-black text-gray-900 mb-2">Payer avec BaridiMob</h1>
        <p className="text-sm text-gray-500 mb-6">Ouvrez votre application BaridiMob et scannez le code ou cliquez sur le lien ci-dessous.</p>
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-6 flex items-center justify-center">
          {qrImageUrl
            ? <img src={qrImageUrl} alt="QR Code BaridiMob" width={280} height={280} className="rounded-xl" />
            : <p className="text-xs font-mono text-amber-800 break-all select-all">{baridimobModal.qrCodeData}</p>
          }
        </div>
        {baridimobModal.deepLink && (
          <a
            href={baridimobModal.deepLink}
            className="inline-flex items-center justify-center gap-2 bg-amber-500 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-amber-600 transition-colors mb-4 w-full"
          >
            Ouvrir BaridiMob
          </a>
        )}
        <p className="text-xs text-gray-400">
          Expire le {new Date(baridimobModal.expiresAt).toLocaleString('fr-DZ')}
        </p>
      </div>
    )
  }

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
        <PixelConfetti trigger={!confettiDone} onComplete={() => setConfettiDone(true)} message="تبارك الله! طلبك تأكد" />
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-4">{t.checkout.confirmed}</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 mb-6 text-left">
          <Phone className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-800">{t.checkout.confirmCall}</p>
        </div>
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

      <div className="flex items-center gap-3 mb-5">
        <Link href="/cart" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-2xl font-black text-gray-900">{t.checkout.title}</h1>
      </div>

      {/* Guest checkout notice */}
      <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-6 text-sm text-indigo-800">
        <Lock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
        <span><strong>Commande invité</strong> — Aucun compte requis. Rapide &amp; sécurisé.</span>
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
                  autoComplete="name"
                  inputMode="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
              </div>
              <div>
                <PhoneInput
                  value={form.phone}
                  onChange={(v) => { f('phone', v); validatePhone(v) }}
                  onBlur={() => validatePhone(form.phone)}
                  error={phoneError || undefined}
                  label={t.checkout.phone}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.checkout.wilaya}</label>
                <select required value={form.wilaya}
                  onChange={(e) => setForm((prev) => ({ ...prev, wilaya: e.target.value, city: '' }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 bg-white">
                  <option value="">{t.checkout.selectWilaya}</option>
                  {ALL_WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.checkout.commune}</label>
                <select required value={form.city} onChange={(e) => f('city', e.target.value)}
                  disabled={!form.wilaya}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 bg-white disabled:bg-gray-50 disabled:text-gray-400">
                  <option value="">{form.wilaya ? t.checkout.selectCommune : t.checkout.selectWilaya}</option>
                  {getCommunesForWilaya(form.wilaya).map((c) => <option key={c} value={c}>{c}</option>)}
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
                  autoComplete="street-address"
                  inputMode="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Instructions de livraison <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => f('notes', e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Ex: Sonner 2 fois, code portail 1234, laisser à la réception…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                />
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
                { id: 'cash'      as PaymentMethod, label: t.checkout.cash,      desc: t.checkout.cashDesc,      recommended: true  },
                { id: 'edahabia'  as PaymentMethod, label: t.checkout.edahabia,  desc: t.checkout.edahabiaDesc,  recommended: false },
                { id: 'cib'       as PaymentMethod, label: t.checkout.cib,       desc: t.checkout.cibDesc,       recommended: false },
                { id: 'baridimob' as PaymentMethod, label: 'BaridiMob',          desc: 'Paiement mobile Algeria Post',  recommended: false },
                { id: 'card'      as PaymentMethod, label: t.checkout.card,      desc: t.checkout.cardDesc,      recommended: false },
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

          {/* B2B Invoice */}
          <B2BInvoiceFields value={b2b} onChange={setB2b} />

          {saveError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 mb-2">
              {saveError}
            </div>
          )}
          <button
            type="submit"
            disabled={saving || !!phoneError}
            className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all text-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
            {saving ? '...' : `${t.checkout.placeOrder} — ${formatPrice(orderTotal)}`}
          </button>
        </form>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-5 shadow-sm sticky top-24">
            <h2 className="font-bold text-gray-900 mb-4">{t.checkout.orderSummary}</h2>

            {/* Promo Code */}
            {!promoResult ? (
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                    placeholder={t.checkout.promoPlaceholder}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={promoApplying || !promoInput.trim()}
                    className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {promoApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
                    {t.checkout.apply}
                  </button>
                </div>
                {promoError && <p className="text-xs text-red-500 mt-1.5">{promoError}</p>}
              </div>
            ) : (
              <div className="mb-4 flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-xs font-bold text-green-800">{promoResult.code}</p>
                    <p className="text-xs text-green-600">{t.checkout.promoApplied}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setPromoResult(null); setPromoInput('') }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Gift Card */}
            {!giftCardResult ? (
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={giftCardInput}
                    onChange={(e) => { setGiftCardInput(e.target.value.toUpperCase()); setGiftCardError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyGiftCard()}
                    placeholder="Code cadeau"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={handleApplyGiftCard}
                    disabled={giftCardApplying || !giftCardInput.trim()}
                    className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {giftCardApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                    Appliquer
                  </button>
                </div>
                {giftCardError && <p className="text-xs text-red-500 mt-1.5">{giftCardError}</p>}
              </div>
            ) : (
              <div className="mb-4 flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-xs font-bold text-purple-800">{giftCardResult.code}</p>
                    <p className="text-xs text-purple-600">-{giftCardResult.deduction.toLocaleString('fr-DZ')} DA appliqués</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setGiftCardResult(null); setGiftCardInput('') }} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Loyalty Points */}
            {loyaltyBalance !== null && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setUsePoints(!usePoints)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-colors ${usePoints ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <Star className={`w-4 h-4 ${usePoints ? 'text-amber-500' : 'text-gray-400'}`} />
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-800">Utiliser mes points</p>
                      <p className="text-xs text-gray-500">{loyaltyBalance} points disponibles ({loyaltyBalance} DA)</p>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors ${usePoints ? 'bg-amber-400' : 'bg-gray-200'} relative`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${usePoints ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </button>
                {usePoints && pointsDeduction > 0 && (
                  <p className="text-xs text-amber-600 mt-1 pl-1 font-semibold">-{pointsDeduction} DA déduits de votre commande</p>
                )}
              </div>
            )}

            <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
              {items.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {product.images?.[0] && <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="56px" />}
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
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 font-semibold">
                  <span>{t.checkout.discount}</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              {giftCardDeduction > 0 && (
                <div className="flex justify-between text-purple-600 font-semibold">
                  <span>Carte cadeau</span>
                  <span>-{formatPrice(giftCardDeduction)}</span>
                </div>
              )}
              {pointsDeduction > 0 && (
                <div className="flex justify-between text-amber-600 font-semibold">
                  <span>Points fidélité</span>
                  <span>-{formatPrice(pointsDeduction)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-gray-900 border-t pt-2 text-base">
                <span>{t.cart.total}</span>
                <span>{formatPrice(Math.max(0, orderTotal))}</span>
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
