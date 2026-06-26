'use client'

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
const PixelConfetti = dynamic(() => import('@/components/effects/PixelConfetti'), { ssr: false })
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CheckCircle, Truck, Banknote, CreditCard, Shield, Lock, MapPin, Loader2, Tag, X, Phone, Gift, Star } from 'lucide-react'
import PhoneInput from '@/components/checkout/PhoneInput'
import B2BInvoiceFields, { type B2BFields } from '@/components/checkout/B2BInvoiceFields'
import { useCartStore } from '@/lib/store/cartStore'
import { useT, useLang } from '@/lib/store/langStore'
import { formatPrice, COLOR_HEX } from '@/lib/utils'
import { getDeliveryInfo, ALL_WILAYAS } from '@/lib/data/wilayas'
import { getCommunesForWilaya } from '@/lib/data/communes'
import { useAbandonedCheckout } from '@/hooks/useAbandonedCheckout'
import { trackPurchase, trackInitiateCheckout } from '@/lib/analytics'
import { track } from '@/lib/analytics/track'

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

export default function CheckoutContent() {
  const { items, total, clearCart, cartStoreSlug } = useCartStore()
  const t = useT()
  const lang = useLang()
  const cartTotal = total()

  const [payment, setPayment] = useState<PaymentMethod>('cash')
  const [submitted, setSubmitted] = useState(false)
  const [confettiDone, setConfettiDone] = useState(false)
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', address: '', city: '', wilaya: '', notes: '',
  })
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const { save: saveAbandoned, markRecovered } = useAbandonedCheckout()

  const [b2b, setB2b] = useState<B2BFields>({ isB2B: false, companyName: '', nif: '', nis: '', rc: '' })
  const [customCommune, setCustomCommune] = useState('')

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

  const [liveDeliveryRates, setLiveDeliveryRates] = useState<{ home: number | null; desk: number | null }>({ home: null, desk: null })
  const [deliveryType, setDeliveryType] = useState<'home' | 'office' | 'stop_desk'>('home')
  const isStopDesk = deliveryType === 'stop_desk'
  const [deliveryFetching, setDeliveryFetching] = useState(false)
  const [isLiveRates, setIsLiveRates] = useState(false)

  useEffect(() => {
    fetch('/api/loyalty')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.balance > 0) setLoyaltyBalance(d.balance) })
      .catch(() => {})
    track('checkout_start', {})
    // Fire pixel InitiateCheckout once — uses closure values from mount
    const { items: cartItems, total: getTotal } = useCartStore.getState()
    trackInitiateCheckout({ total: getTotal(), numItems: cartItems.reduce((s, i) => s + i.quantity, 0) })
  }, [])

  // Fetch live delivery price from vendor's configured provider when wilaya changes
  useEffect(() => {
    if (!form.wilaya) {
      setLiveDeliveryRates({ home: null, desk: null })
      setDeliveryType('home')
      setIsLiveRates(false)
      return
    }
    setDeliveryFetching(true)
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ wilaya: form.wilaya })
        if (cartStoreSlug) params.set('storeSlug', cartStoreSlug)
        const res = await fetch(`/api/delivery/rates?${params}`)
        if (res.ok) {
          const data = await res.json()
          setLiveDeliveryRates({
            home: typeof data.homeDelivery === 'number' ? data.homeDelivery : null,
            desk: typeof data.deskDelivery === 'number' ? data.deskDelivery : null,
          })
          setIsLiveRates(data.live === true)
          if (typeof data.deskDelivery !== 'number') {
            setDeliveryType((prev) => prev === 'stop_desk' ? 'home' : prev)
          }
        } else {
          setLiveDeliveryRates({ home: null, desk: null })
          setDeliveryType((prev) => prev === 'stop_desk' ? 'home' : prev)
          setIsLiveRates(false)
        }
      } catch {
        setLiveDeliveryRates({ home: null, desk: null })
        setDeliveryType((prev) => prev === 'stop_desk' ? 'home' : prev)
        setIsLiveRates(false)
      } finally {
        setDeliveryFetching(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [form.wilaya, cartStoreSlug])

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
  // Live rate from provider API; falls back to static zone pricing
  const chosenLiveRate = isStopDesk ? liveDeliveryRates.desk : liveDeliveryRates.home
  const shippingCost = chosenLiveRate ?? (delivery.isFree ? 0 : delivery.cost)
  const orderTotal = Math.max(0, cartTotal - discountAmount - giftCardDeduction - pointsDeduction + shippingCost)

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
          already_used: 'Vous avez déjà utilisé ce code.',
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
        const deduction = Math.min(data.balance, Math.max(0, cartTotal - (promoResult?.discountAmount ?? 0)))
        setGiftCardResult({ id: data.id, code: giftCardInput.trim().toUpperCase(), balance: data.balance, deduction })
      } else {
        setGiftCardError(data.error ?? t.checkout.giftCardInvalid)
      }
    } catch {
      setGiftCardError(t.checkout.giftCardError)
    } finally {
      setGiftCardApplying(false)
    }
  }

  const validatePhone = (val: string) => {
    if (!val) { setPhoneError(''); return }
    const clean = val.replace(/\s+/g, '')
    if (!/^(213[5-7]|0[5-7])\d{8}$/.test(clean)) {
      setPhoneError(t.checkout.phoneInvalid)
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

    for (const { product, quantity } of items) {
      const moq = product.minOrderQuantity ?? 1
      if (quantity < moq) {
        setSaveError(t.checkout.moqError.replace('{name}', product.name).replace('{n}', String(moq)))
        setSaving(false)
        return
      }
    }

    const resolvedCity = form.city === '__autre__' ? customCommune : form.city

    if (!resolvedCity.trim()) {
      setSaveError(t.checkout.selectCommune)
      setSaving(false)
      return
    }

    // Read GA4 client_id from _ga cookie so the server-side Measurement Protocol hit
    // is attributed to the same browser session (fixes attribution when CAPI fires).
    const gaClientId = (() => {
      try {
        const m = document.cookie.match(/_ga=GA\d+\.\d+\.(\d+\.\d+)/)
        return m ? m[1] : null
      } catch { return null }
    })()

    const orderPayload = {
      fullName:       form.fullName,
      email:          form.email,
      phone:          form.phone,
      wilaya:         form.wilaya,
      city:           resolvedCity,
      address:        form.address,
      paymentMethod:  payment,
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
      gaClientId:     gaClientId ?? null,
      isStopDesk,
      deliveryType,
      items: items.map(({ product, quantity, selectedColor }) => ({
        productId:     product.id,
        productName:   product.name,
        productImage:  product.images?.[0] || '',
        quantity,
        unitPrice:     product.price,
        selectedColor: selectedColor || null,
      })),
    }

    const cartSnapshot = items.map(({ product, quantity }) => ({
      id: product.id, name: product.name, price: product.price, quantity,
    }))

    try {
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
        const resolvedOrderId = orderData.orderId ?? orderData.id
        if (!resolvedOrderId) { setSaveError(t.checkout.orderFailed); return }
        trackPurchase({ transactionId: resolvedOrderId, total: orderTotal, items: cartSnapshot })
        track('checkout_complete', { order_id: resolvedOrderId, total: orderTotal, payment_method: 'cash', wilaya: form?.wilaya })

        markRecovered()
        setSubmitted(true)
        clearCart()
        return
      }

      const res = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        if (res.status === 503) {
          setSaveError(t.checkout.onlinePaymentUnavailable)
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
        // Validate Satim URL is an absolute HTTPS URL before redirecting
        try {
          const parsed = new URL(data.formUrl)
          if (parsed.protocol !== 'https:') throw new Error('non-https')
          clearCart()
          window.location.href = data.formUrl
        } catch {
          setSaveError('Erreur lors de la redirection vers le paiement. Réessayez.')
        }
        return
      }

      if (data.method === 'baridimob' && data.qrCodeData) {
        clearCart()
        setBaridimobModal({ qrCodeData: data.qrCodeData, deepLink: data.deepLink, expiresAt: data.expiresAt })
        return
      }

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
    saveAbandoned({
      name: next.fullName,
      email: next.email,
      phone: next.phone,
      wilaya: next.wilaya,
      address: next.address,
      storeSlug: cartStoreSlug ?? undefined,
      cartSnapshot: items.map(({ product, quantity }) => ({ id: product.id, name: product.name, quantity, price: product.price })),
      cartTotal,
    })
  }

  if (baridimobModal) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CreditCard className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-xl font-black text-gray-900 mb-2">{t.checkout.payWithBaridimob}</h1>
        <p className="text-sm text-gray-500 mb-6">{t.checkout.baridimobScanDesc}</p>
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
            {t.checkout.openBaridimob}
          </a>
        )}
        <p className="text-xs text-gray-400">
          {t.checkout.baridimobExpires} {new Date(baridimobModal.expiresAt).toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ')}
        </p>
      </div>
    )
  }

  if (items.length === 0 && !submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 mb-6">{t.cart.empty}</p>
        <Link href={cartStoreSlug ? `/store/${cartStoreSlug}` : '/'} className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-700">
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
          <p><span className="font-semibold">{t.checkout.address}:</span> {form.address}, {form.city === '__autre__' ? customCommune : form.city}, {form.wilaya}{
            deliveryType === 'office' 
              ? ` (${t.checkout.officeDelivery})` 
              : isStopDesk 
                ? ` (${t.checkout.stopDesk})` 
                : ''
          }</p>
          <p><span className="font-semibold">{t.checkout.deliveryMethod}:</span> {
            deliveryType === 'office' 
              ? t.checkout.officeDelivery 
              : isStopDesk 
                ? t.checkout.stopDesk 
                : t.checkout.homeDelivery
          }</p>
          <p><span className="font-semibold">{t.checkout.payment}:</span> {
            payment === 'cash' ? t.checkout.cash :
            payment === 'edahabia' ? t.checkout.edahabia :
            payment === 'cib' ? t.checkout.cib :
            t.checkout.card
          }</p>
          <p><span className="font-semibold">Total:</span> {formatPrice(orderTotal)}</p>
          <p><span className="font-semibold">{t.checkout.estimatedDelivery}</span> {delivery.days}</p>
        </div>
        <Link href={cartStoreSlug ? `/store/${cartStoreSlug}` : '/'} className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-700 transition-colors">
          {t.cart.continueShopping}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
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

      <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-6 text-sm text-indigo-800">
        <Lock className="w-4 h-4 text-indigo-500 flex-shrink-0" />
        <span><strong>{t.checkout.guestOrder}</strong> — {t.checkout.guestOrderDesc}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
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
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.checkout.email}</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => f('email', e.target.value)}
                  placeholder="exemple@email.com"
                  autoComplete="email"
                  inputMode="email"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400"
                />
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
                  onChange={(e) => { setCustomCommune(''); setForm((prev) => ({ ...prev, wilaya: e.target.value, city: '' })) }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 bg-white">
                  <option value="">{t.checkout.selectWilaya}</option>
                  {ALL_WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.checkout.commune}</label>
                <select
                  required={form.city !== '__autre__'}
                  value={form.city === '__autre__' || !getCommunesForWilaya(form.wilaya).includes(form.city) && form.city ? '__autre__' : form.city}
                  onChange={(e) => {
                    if (e.target.value === '__autre__') {
                      setCustomCommune('')
                      f('city', '__autre__')
                    } else {
                      setCustomCommune('')
                      f('city', e.target.value)
                    }
                  }}
                  disabled={!form.wilaya}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 bg-white disabled:bg-gray-50 disabled:text-gray-400">
                  <option value="">{form.wilaya ? t.checkout.selectCommune : t.checkout.selectWilaya}</option>
                  {getCommunesForWilaya(form.wilaya).map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="__autre__">{t.checkout.otherCommune}</option>
                </select>
                {form.city === '__autre__' && (
                  <input
                    type="text"
                    required
                    value={customCommune}
                    onChange={(e) => { setCustomCommune(e.target.value); f('city', e.target.value || '__autre__') }}
                    placeholder={t.checkout.otherCommunePlaceholder}
                    className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400"
                  />
                )}
              </div>
              {form.wilaya && (
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-gray-700">{t.checkout.deliveryMethod}</label>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isLiveRates
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isLiveRates ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                      {isLiveRates ? t.checkout.liveRates : t.checkout.staticRates}
                    </span>
                  </div>
                  <div className={`grid grid-cols-1 ${liveDeliveryRates.desk !== null ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
                    <button
                      type="button"
                      onClick={() => setDeliveryType('home')}
                      className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all ${
                        deliveryType === 'home' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <span className={`text-sm font-bold ${deliveryType === 'home' ? 'text-indigo-700' : 'text-gray-900'}`}>
                        {t.checkout.homeDelivery}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {liveDeliveryRates.home !== null ? (
                          liveDeliveryRates.home === 0 ? t.cart.freeShipping : formatPrice(liveDeliveryRates.home)
                        ) : (
                          delivery.isFree ? t.cart.freeShipping : deliveryFetching ? '…' : formatPrice(delivery.cost)
                        )}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryType('office')}
                      className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all ${
                        deliveryType === 'office' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <span className={`text-sm font-bold ${deliveryType === 'office' ? 'text-indigo-700' : 'text-gray-900'}`}>
                        {t.checkout.officeDelivery}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        {liveDeliveryRates.home !== null ? (
                          liveDeliveryRates.home === 0 ? t.cart.freeShipping : formatPrice(liveDeliveryRates.home)
                        ) : (
                          delivery.isFree ? t.cart.freeShipping : deliveryFetching ? '…' : formatPrice(delivery.cost)
                        )}
                      </span>
                    </button>
                    {liveDeliveryRates.desk !== null && (
                      <button
                        type="button"
                        onClick={() => setDeliveryType('stop_desk')}
                        className={`flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all ${
                          deliveryType === 'stop_desk' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <span className={`text-sm font-bold ${deliveryType === 'stop_desk' ? 'text-indigo-700' : 'text-gray-900'}`}>
                          {t.checkout.stopDesk}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          {liveDeliveryRates.desk !== null ? (
                            liveDeliveryRates.desk === 0 ? t.cart.freeShipping : formatPrice(liveDeliveryRates.desk)
                          ) : (
                            delivery.isFree ? t.cart.freeShipping : deliveryFetching ? '…' : formatPrice(delivery.cost)
                          )}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {isStopDesk && (
                <div className="sm:col-span-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs font-semibold text-amber-800">{t.checkout.stopDeskInfo}</p>
                </div>
              )}

              {form.wilaya && (
                <div className="sm:col-span-2 bg-indigo-50 rounded-xl px-4 py-3 flex items-center gap-3">
                  <Truck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-semibold text-indigo-800">{t.checkout.estimatedDelivery} </span>
                    <span className="text-indigo-700">{delivery.days}</span>
                    {shippingCost === 0 ? (
                      <span className="ml-2 text-green-600 font-bold">— {t.cart.freeShipping}!</span>
                    ) : deliveryFetching ? (
                      <span className="ml-2 text-gray-400">…</span>
                    ) : (
                      <span className="ml-2 text-gray-600">— {formatPrice(shippingCost)}</span>
                    )}
                  </div>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {t.checkout.address}
                  {deliveryType === 'office' && <span className="text-gray-400 font-normal text-xs ml-2">({t.checkout.officeDelivery})</span>}
                  {isStopDesk && <span className="text-gray-400 font-normal text-xs ml-2">({t.checkout.addressStopDesk})</span>}
                </label>
                <input type="text" value={form.address} onChange={(e) => f('address', e.target.value)}
                  placeholder={
                    isStopDesk 
                      ? t.checkout.addressStopDeskPlaceholder 
                      : deliveryType === 'office' 
                        ? t.checkout.addressOfficePlaceholder 
                        : t.checkout.addressHomePlaceholder
                  }
                  autoComplete={isStopDesk ? 'off' : 'street-address'}
                  inputMode="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400" />
                {isStopDesk && (
                  <p className="text-xs text-indigo-500 mt-1.5 flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    {t.checkout.stopDeskInfo}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {t.checkout.deliveryNotes} <span className="text-gray-400 font-normal">{t.checkout.deliveryNotesOptional}</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => f('notes', e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder={t.checkout.deliveryNotesPlaceholder}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                />
              </div>
            </div>
          </div>

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
                { id: 'baridimob' as PaymentMethod, label: 'BaridiMob',          desc: t.checkout.baridimobDesc,  recommended: false },
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

        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-5 shadow-sm sticky top-24">
            <h2 className="font-bold text-gray-900 mb-4">{t.checkout.orderSummary}</h2>

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

            {!giftCardResult ? (
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={giftCardInput}
                    onChange={(e) => { setGiftCardInput(e.target.value.toUpperCase()); setGiftCardError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleApplyGiftCard()}
                    placeholder={t.checkout.giftCardPlaceholder}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
                  />
                  <button
                    type="button"
                    onClick={handleApplyGiftCard}
                    disabled={giftCardApplying || !giftCardInput.trim()}
                    className="flex items-center gap-1.5 bg-gray-900 text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {giftCardApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                    {t.checkout.apply}
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
                    <p className="text-xs text-purple-600">{t.checkout.giftCardDeducted.replace('{n}', giftCardResult.deduction.toLocaleString('fr-DZ'))}</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setGiftCardResult(null); setGiftCardInput('') }} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

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
                      <p className="text-xs font-bold text-gray-800">{t.checkout.useMyPoints}</p>
                      <p className="text-xs text-gray-500">{t.checkout.pointsAvailable.replace('{n}', String(loyaltyBalance)).replace('{da}', String(loyaltyBalance))}</p>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors ${usePoints ? 'bg-amber-400' : 'bg-gray-200'} relative`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all ${usePoints ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                </button>
                {usePoints && pointsDeduction > 0 && (
                  <p className="text-xs text-amber-600 mt-1 pl-1 font-semibold">{t.checkout.pointsDeducted.replace('{n}', String(pointsDeduction))}</p>
                )}
              </div>
            )}

            <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
              {items.map(({ product, quantity, selectedColor }) => {
                const variant = selectedColor ? (product.colorVariants ?? []).find(v => v.name === selectedColor) : null
                const colorIdx = !variant && selectedColor ? (product.imageColors ?? []).indexOf(selectedColor) : -1
                const displayImg = variant?.images?.[0] ?? (colorIdx !== -1 ? product.images[colorIdx] : product.images?.[0])
                return (
                <div key={`${product.id}-${selectedColor ?? ''}`} className="flex items-center gap-3">
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {displayImg && <Image src={displayImg} alt={product.name} fill className="object-cover" sizes="56px" />}
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{product.name}</p>
                    {selectedColor && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-2.5 h-2.5 rounded-full border border-gray-200 flex-shrink-0"
                          style={{ background: COLOR_HEX[selectedColor] ?? '#9CA3AF' }} />
                        <span className="text-[10px] text-gray-500">{selectedColor}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-bold text-gray-900">{formatPrice(product.price * quantity)}</p>
                </div>
                )
              })}
            </div>
            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{t.cart.subtotal}</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{t.cart.shipping}</span>
                <span className={form.wilaya && shippingCost === 0 ? 'text-green-600 font-bold' : ''}>
                  {!form.wilaya ? '—' : deliveryFetching ? '…' : (shippingCost === 0 ? t.cart.freeShipping : formatPrice(shippingCost))}
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
                  <span>{t.checkout.giftCard}</span>
                  <span>-{formatPrice(giftCardDeduction)}</span>
                </div>
              )}
              {pointsDeduction > 0 && (
                <div className="flex justify-between text-amber-600 font-semibold">
                  <span>{t.checkout.loyaltyPoints}</span>
                  <span>-{formatPrice(pointsDeduction)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-gray-900 border-t pt-2 text-base">
                <span>{t.cart.total}</span>
                <span>{formatPrice(Math.max(0, orderTotal))}</span>
              </div>
            </div>
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
