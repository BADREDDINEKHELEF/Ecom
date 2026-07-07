'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { CheckCircle, Home, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { trackPurchase } from '@/lib/analytics'
import { trackPurchase as trackMetaPurchase } from '@/lib/meta/events'
import VendorAnalyticsScripts from '@/components/analytics/VendorAnalyticsScripts'

interface OrderDetails {
  id: string
  total: number
  email: string | null
  phone: string
  items: Array<{ id: string; name: string; price: number; quantity: number }>
  vendorId: string | null
}

interface VendorPixelConfig {
  metaPixelId: string | null
  gtagId: string | null
  tiktokPixelId: string | null
  pixelId: string | null
  metaEnabled: boolean
  metaTestEventCode: string | null
}

function SuccessContent() {
  const params = useSearchParams()
  const orderId = params.get('orderId')
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [vendorPixelConfig, setVendorPixelConfig] = useState<VendorPixelConfig | null>(null)
  const trackedRef = useRef(false)

  useEffect(() => {
    if (!orderId) return
    const supabase = createClient()

    async function fetchOrderData() {
      try {
        // 1. Fetch order details
        const { data: orderData } = await supabase
          .from('orders')
          .select('id, total, email, phone, vendor_id')
          .eq('id', orderId)
          .maybeSingle()

        if (!orderData) return

        // 2. Fetch order items
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('product_id, product_name, product_price, quantity')
          .eq('order_id', orderId)

        const formattedItems = (itemsData ?? []).map(i => ({
          id: i.product_id,
          name: i.product_name,
          price: Number(i.product_price),
          quantity: Number(i.quantity)
        }))

        setOrderDetails({
          id: orderData.id,
          total: Number(orderData.total),
          email: orderData.email,
          phone: orderData.phone,
          items: formattedItems,
          vendorId: orderData.vendor_id,
        })

        // 3. Fetch vendor pixel if vendor exists
        if (orderData.vendor_id) {
          const { data: vendorData } = await supabase
            .from('vendors')
            .select('meta_pixel_id, gtag_id, tiktok_pixel_id, pixel_id, meta_enabled, meta_test_event_code')
            .eq('id', orderData.vendor_id)
            .maybeSingle()

          if (vendorData) {
            setVendorPixelConfig({
              metaPixelId: vendorData.meta_pixel_id,
              gtagId: vendorData.gtag_id,
              tiktokPixelId: vendorData.tiktok_pixel_id,
              pixelId: vendorData.pixel_id,
              metaEnabled: vendorData.meta_enabled !== false,
              metaTestEventCode: vendorData.meta_test_event_code,
            })
          }
        }
      } catch {}
    }

    void fetchOrderData()
  }, [orderId])

  useEffect(() => {
    if (!orderDetails || trackedRef.current) return
    trackedRef.current = true

    // Fire standard analytics (GA4, TikTok, and first-party pixel)
    trackPurchase({
      transactionId: orderDetails.id,
      total: orderDetails.total,
      items: orderDetails.items,
      email: orderDetails.email,
      phone: orderDetails.phone,
    })

    // Fire Platform Meta Pixel Purchase
    const platformMetaId = process.env.NEXT_PUBLIC_META_PIXEL_ID
    if (platformMetaId) {
      trackMetaPurchase(
        {
          storeId: '__platform__',
          storeSlug: '',
          pixelId: platformMetaId,
          accessToken: null,
          testEventCode: null,
          datasetId: null,
          enabled: true,
        },
        {
          value: orderDetails.total,
          currency: 'DZD',
          content_ids: orderDetails.items.map(i => i.id),
          content_type: 'product',
          num_items: orderDetails.items.reduce((s, i) => s + i.quantity, 0),
          contents: orderDetails.items.map(i => ({ id: i.id, quantity: i.quantity, price: i.price })),
          transactionId: orderDetails.id,
        },
        { em: orderDetails.email, ph: orderDetails.phone }
      )
    }

    // Fire Vendor Meta Pixel Purchase
    if (vendorPixelConfig?.metaPixelId && vendorPixelConfig.metaEnabled) {
      trackMetaPurchase(
        {
          storeId: orderDetails.vendorId ?? '',
          storeSlug: '',
          pixelId: vendorPixelConfig.metaPixelId,
          accessToken: null,
          testEventCode: vendorPixelConfig.metaTestEventCode,
          datasetId: null,
          enabled: true,
        },
        {
          value: orderDetails.total,
          currency: 'DZD',
          content_ids: orderDetails.items.map(i => i.id),
          content_type: 'product',
          num_items: orderDetails.items.reduce((s, i) => s + i.quantity, 0),
          contents: orderDetails.items.map(i => ({ id: i.id, quantity: i.quantity, price: i.price })),
          transactionId: orderDetails.id,
        },
        { em: orderDetails.email, ph: orderDetails.phone }
      )
    }
  }, [orderDetails, vendorPixelConfig])

  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>
      <h1 className="text-2xl font-black text-gray-900 mb-3">Paiement réussi !</h1>
      <p className="text-gray-500 mb-2">Votre paiement a été confirmé et votre commande est en cours de traitement.</p>
      {orderId && (
        <p className="text-sm text-gray-400 mb-8">Référence : <span className="font-mono font-bold text-gray-600">{orderId.slice(0, 8).toUpperCase()}</span></p>
      )}
      <div className="bg-gray-50 rounded-2xl p-5 mb-8 text-left space-y-2 text-sm text-gray-600">
        <p className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" /> Paiement confirmé</p>
        <p className="flex items-center gap-2"><Package className="w-4 h-4 text-indigo-500 flex-shrink-0" /> Votre commande sera préparée sous 24h</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {orderId && (
          <Link href="/orders" className="inline-flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors">
            <Package className="w-4 h-4" /> Mes commandes
          </Link>
        )}
        <Link href="/" className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">
          <Home className="w-4 h-4" /> Retour à l&apos;accueil
        </Link>
      </div>
      {vendorPixelConfig && (
        <VendorAnalyticsScripts
          metaPixelId={vendorPixelConfig.metaPixelId}
          gtagId={vendorPixelConfig.gtagId}
          tiktokPixelId={vendorPixelConfig.tiktokPixelId}
          pixelId={vendorPixelConfig.pixelId}
        />
      )}
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  )
}
