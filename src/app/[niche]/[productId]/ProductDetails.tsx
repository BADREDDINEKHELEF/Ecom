'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useMemo } from 'react'
import { ArrowRight, Minus, Plus, ShoppingCart, Star, Package, Shield, CheckCircle, Users, Loader2 } from 'lucide-react'
import { useCartStore } from '@/lib/store/cartStore'
import { useT } from '@/lib/store/langStore'
import { formatPrice, discount } from '@/lib/utils'
import type { Product } from '@/types'
import type { Niche } from '@/types'
import Badge from '@/components/ui/Badge'
import StarRating from '@/components/ui/StarRating'
import ProductCard from '@/components/shop/ProductCard'
import WhatsAppButton from '@/components/ui/WhatsAppButton'
import WilayaDeliveryEstimate from '@/components/ui/WilayaDeliveryEstimate'
import RecentlyViewed, { trackRecentlyViewed } from '@/components/ui/RecentlyViewed'
import StockAlertButton from '@/components/ui/StockAlertButton'
import ProductQA from '@/components/shop/ProductQA'
import type { Review } from '@/lib/supabase/queries'

interface Props {
  product: Product
  niche: Niche
  related: Product[]
}

export default function ProductDetails({ product, niche, related }: Props) {
  const addItem = useCartStore((s) => s.addItem)
  const t = useT()
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [added, setAdded] = useState(false)

  const [zoomed, setZoomed] = useState(false)
  const [zoomOrigin, setZoomOrigin] = useState('center center')

  const viewingNow = useMemo(() => {
    const hash = product.id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0)
    return 3 + (hash % 14)
  }, [product.id])

  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewForm, setReviewForm] = useState({ author_name: '', rating: 5, comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    // Track this product as recently viewed
    trackRecentlyViewed({
      id: product.id,
      nicheId: product.nicheId,
      name: product.name,
      price: product.price,
      image: product.images[0] ?? '',
    })

    fetch(`/api/reviews/${product.id}`)
      .then((r) => r.json())
      .then((data) => setReviews(Array.isArray(data) ? data : []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false))
  }, [product.id])

  const handleReviewSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!reviewForm.author_name.trim() || !reviewForm.comment.trim()) return
    setSubmitting(true)
    setReviewError('')
    try {
      const res = await fetch(`/api/reviews/${product.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm),
      })
      if (!res.ok) throw new Error('failed')
      const newReview: Review = {
        id: crypto.randomUUID(),
        product_id: product.id,
        author_name: reviewForm.author_name,
        phone: null,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        is_verified: false,
        created_at: new Date().toISOString(),
      }
      setReviews((prev) => [newReview, ...prev])
      setReviewSubmitted(true)
      setReviewForm({ author_name: '', rating: 5, comment: '' })
    } catch {
      setReviewError(t.product.reviewSubmitted)
    } finally {
      setSubmitting(false)
    }
  }

  const hasDiscount = product.comparePrice && product.comparePrice > product.price
  const discountPct = hasDiscount ? discount(product.price, product.comparePrice!) : 0
  const nicheId = niche.id

  const whatsappMessage = `مرحباً، أريد طلب: ${product.name} (x${quantity}) — ${formatPrice(product.price * quantity)}`

  const buildWhatsAppOrder = () => {
    const ref = `DZ-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    return encodeURIComponent(
      `🛍️ *COMMANDE CASBAH STORE*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📦 *Produit:* ${product.name}\n` +
      `🔢 *Quantité:* ${quantity}\n` +
      `💰 *Prix unitaire:* ${formatPrice(product.price)}\n` +
      `💵 *Total:* ${formatPrice(product.price * quantity)}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `💳 Paiement: Cash à la livraison\n` +
      `🔖 Réf: ${ref}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Pour finaliser, merci d'indiquer:\n` +
      `• Wilaya + Adresse complète\n` +
      `• Nom complet\n` +
      `• Numéro de téléphone`
    )
  }

  const handleAddToCart = () => {
    addItem(product, quantity)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 md:pb-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-8 flex items-center gap-2 flex-wrap">
        <Link href="/" className="hover:text-gray-800 transition-colors">Home</Link>
        <ArrowRight className="w-3 h-3" />
        <Link href={`/${nicheId}`} className="hover:text-gray-800 transition-colors">{niche.name}</Link>
        <ArrowRight className="w-3 h-3" />
        <Link href={`/${nicheId}?category=${encodeURIComponent(product.category)}`} className="hover:text-gray-800 transition-colors">
          {product.category}
        </Link>
        <ArrowRight className="w-3 h-3" />
        <span className="text-gray-800 font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Product Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10 mb-16">
        {/* Images */}
        <div className="space-y-3">
          <div
            className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 cursor-zoom-in select-none hidden md:block"
            onMouseEnter={() => setZoomed(true)}
            onMouseLeave={() => setZoomed(false)}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              const x = (((e.clientX - r.left) / r.width) * 100).toFixed(1)
              const y = (((e.clientY - r.top) / r.height) * 100).toFixed(1)
              setZoomOrigin(`${x}% ${y}%`)
            }}
          >
            <Image
              src={product.images[selectedImage]}
              alt={product.name}
              fill
              className={`object-cover transition-transform duration-150 ${zoomed ? 'scale-[2]' : 'scale-100'}`}
              style={{ transformOrigin: zoomOrigin }}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            {product.isNew && (
              <div className="absolute top-4 left-4">
                <Badge variant="new">{t.common.new}</Badge>
              </div>
            )}
            {hasDiscount && (
              <div className="absolute top-4 right-4">
                <Badge variant="sale">-{discountPct}% OFF</Badge>
              </div>
            )}
          </div>
          {/* Mobile image — no zoom */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 md:hidden">
            <Image
              src={product.images[selectedImage]}
              alt={product.name}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            {product.isNew && (
              <div className="absolute top-4 left-4"><Badge variant="new">{t.common.new}</Badge></div>
            )}
            {hasDiscount && (
              <div className="absolute top-4 right-4"><Badge variant="sale">-{discountPct}% OFF</Badge></div>
            )}
          </div>

          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-colors ${
                    selectedImage === i ? 'border-indigo-600' : 'border-transparent'
                  }`}
                >
                  <Image src={img} alt={`View ${i + 1}`} fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col gap-5">
          <div>
            <Link
              href={`/${nicheId}?category=${encodeURIComponent(product.category)}`}
              className="text-sm font-semibold text-indigo-600 hover:underline"
            >
              {product.category}
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 mt-2 leading-tight">
              {product.name}
            </h1>
          </div>

          <StarRating rating={product.rating} reviewCount={product.reviewCount} size="md" />

          {/* Price */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl sm:text-3xl font-black text-gray-900">{formatPrice(product.price)}</span>
            {hasDiscount && (
              <>
                <span className="text-lg text-gray-400 line-through">{formatPrice(product.comparePrice!)}</span>
                <span className="bg-red-100 text-red-600 text-sm font-bold px-2.5 py-0.5 rounded-lg">
                  -{discountPct}% OFF
                </span>
              </>
            )}
          </div>

          {/* Description */}
          <p className="text-gray-600 leading-relaxed">{product.description}</p>

          {/* Viewing now */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <Users className="w-3.5 h-3.5" />
            <span>{(t.product.peopleViewing ?? '{n} people viewing this right now').replace('{n}', String(viewingNow))}</span>
          </div>

          {/* Stock */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className={`w-4 h-4 ${product.stock > 0 ? 'text-green-600' : 'text-red-400'}`} />
              {product.stock > 0 ? (
                <span className="text-sm text-green-600 font-medium">
                  {product.stock <= 5
                    ? `⚡ Seulement ${product.stock} en stock — dépêchez-vous !`
                    : product.stock <= 15
                    ? `Seulement ${product.stock} en stock`
                    : t.common.inStock}
                </span>
              ) : (
                <span className="text-sm text-red-500 font-medium">{t.product.outOfStock}</span>
              )}
            </div>
            {product.stock === 0 && <StockAlertButton productId={product.id} />}
          </div>

          {/* Quantity + Add to Cart */}
          {product.stock > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-3 font-bold min-w-[3rem] text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-4 py-3 hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-white transition-all ${
                    added ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {added ? t.product.added : t.product.addToCart}
                </button>
              </div>

              {/* WhatsApp standard order button */}
              <WhatsAppButton variant="inline" message={whatsappMessage} />
            </div>
          )}

          {/* ── SPECIAL: 1-tap WhatsApp order ───────────────────────────── */}
          {product.stock > 0 && (
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '213555000000'}?text=${buildWhatsAppOrder()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-2xl px-5 py-4 transition-all active:scale-95 shadow-md shadow-green-200"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm sm:text-base leading-tight">Commander via WhatsApp</p>
                <p className="text-xs text-green-100 mt-0.5 hidden sm:block">Message pré-rempli · Réf. unique · Réponse rapide</p>
              </div>
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 opacity-70"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>
            </a>
          )}

          {/* COD Trust Badge */}
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-green-800">{t.trust.cod}</p>
              <p className="text-xs text-green-700">{t.trust.codText}</p>
            </div>
          </div>

          {/* Wilaya delivery estimate with hyperlocal social proof */}
          <WilayaDeliveryEstimate productPrice={product.price} productId={product.id} />

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">{t.common.tags}:</span>
              {product.tags.map((tag) => (
                <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-gray-900">{t.product.reviews}</h2>
          {reviews.length > 0 && (
            <span className="text-sm text-gray-500">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>
          )}
        </div>

        {/* Review List */}
        {reviewsLoading ? (
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-200 rounded w-24" />
                    <div className="h-2 bg-gray-100 rounded w-16" />
                  </div>
                </div>
                <div className="flex gap-1 mb-2.5">
                  {[...Array(5)].map((_, j) => <div key={j} className="w-4 h-4 bg-gray-200 rounded" />)}
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 bg-gray-100 rounded w-full" />
                  <div className="h-2 bg-gray-100 rounded w-4/5" />
                  <div className="h-2 bg-gray-100 rounded w-3/5" />
                </div>
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">{t.product.noReviews}</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-600 font-bold text-sm">{review.author_name[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900 text-sm block leading-tight">{review.author_name}</span>
                      {review.is_verified && (
                        <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                          <CheckCircle className="w-3 h-3" /> {t.product.verifiedBuyer}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 fill-current ${i < review.rating ? 'text-amber-400' : 'text-gray-200'}`} />
                  ))}
                </div>
                <p className="text-sm text-gray-600">{review.comment}</p>
              </div>
            ))}
          </div>
        )}

        {/* Review Form */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-5">{t.product.writeReview}</h3>
          {reviewSubmitted ? (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> {t.product.reviewSubmitted}
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.product.reviewName}</label>
                <input
                  required
                  type="text"
                  value={reviewForm.author_name}
                  onChange={(e) => setReviewForm({ ...reviewForm, author_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="transition-transform hover:scale-110"
                    >
                      <Star className={`w-7 h-7 fill-current ${star <= reviewForm.rating ? 'text-amber-400' : 'text-gray-200'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">{t.product.reviewComment}</label>
                <textarea
                  required
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  rows={3}
                  maxLength={1000}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 resize-none"
                />
              </div>
              {reviewError && <p className="text-xs text-red-500">{reviewError}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.product.submitReview}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Product Q&A */}
      <ProductQA productId={product.id} />

      {/* Related Products */}
      {related.length > 0 && (
        <section>
          <h2 className="text-xl font-black text-gray-900 mb-6">{t.product.relatedTitle}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Viewed */}
      <RecentlyViewed excludeId={product.id} />

      {/* Mobile sticky CTA bar */}
      {product.stock > 0 && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <button
            onClick={handleAddToCart}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white transition-all text-sm ${
              added ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            {added ? t.product.added : `${t.product.addToCart} — ${formatPrice(product.price * quantity)}`}
          </button>
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '213555000000'}?text=${encodeURIComponent(whatsappMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl transition-colors text-sm"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WA
          </a>
        </div>
      )}
    </div>
  )
}
