import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createOrder } from '@/lib/supabase/orders'
import { createAdminClient } from '@/lib/supabase/admin'
import { createRouteClient } from '@/lib/supabase/server'
import { checkCheckoutRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { notifyOrderConfirmed } from '@/lib/notifications/whatsapp'
import { sendOrderConfirmationEmail } from '@/lib/notifications/email'
import { createSellerNotification } from '@/lib/notifications/seller'
import { awardPoints, redeemPoints } from '@/lib/loyalty'
import { firePurchaseCAPI } from '@/lib/analytics/server'
import { logger } from '@/lib/logger'

const OrderItemSchema = z.object({
  productId:     z.string().min(1),
  productName:   z.string().min(1).max(500),
  productImage:  z.string().max(1000).default(''),
  quantity:      z.number().int().min(1).max(100),
  vendorId:      z.string().uuid().nullable().optional(),
  selectedColor: z.string().max(100).nullable().optional(),
})

const CreateOrderSchema = z.object({
  fullName:      z.string().min(2).max(200),
  phone:         z.string().regex(/^(213[5-7]|0[5-7])\d{8}$/, 'Invalid Algerian phone number'),
  email:         z.string().email().max(320).optional().nullable(),
  wilaya:        z.string().min(1).max(100),
  city:          z.string().min(1).max(200).refine((v) => v !== '__autre__', { message: 'Invalid commune value' }),
  address:       z.string().min(5).max(500),
  paymentMethod: z.enum(['cash', 'card', 'edahabia', 'cib', 'baridimob']),
  shippingCost:  z.number().min(0).max(10000),
  promoCodeId:      z.string().uuid().optional().nullable(),
  discountAmount:   z.number().min(0).max(1_000_000).optional().default(0),
  giftCardCode:     z.string().max(100).optional().nullable(),
  giftCardDeduction: z.number().min(0).max(1_000_000).optional().default(0),
  pointsRedeemed:   z.number().int().min(0).max(1_000_000).optional().default(0),
  notes:            z.string().max(500).optional().nullable(),
  isB2B:            z.boolean().optional().default(false),
  companyName:      z.string().max(300).optional().nullable(),
  nif:              z.string().max(50).optional().nullable(),
  nis:              z.string().max(50).optional().nullable(),
  rc:               z.string().max(50).optional().nullable(),
  items:            z.array(OrderItemSchema).min(1).max(50),
})

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().+]/g, '')
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkCheckoutRateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop de commandes. Veuillez patienter quelques minutes.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CreateOrderSchema.safeParse(body)
  if (!parsed.success) {
    // Never expose Zod internals to clients in production
    const details = process.env.NODE_ENV === 'development' ? parsed.error.issues : undefined
    return NextResponse.json({ error: 'Invalid order data', ...(details && { details }) }, { status: 400 })
  }

  const {
    promoCodeId: rawPromoCodeId,
    notes: rawNotes,
    email: rawEmail,
    giftCardCode: rawGiftCardCode,
    giftCardDeduction,
    pointsRedeemed,
    isB2B,
    companyName,
    nif,
    nis,
    rc,
    ...rest
  } = parsed.data
  const input = {
    ...rest,
    phone: normalizePhone(parsed.data.phone),
    promoCodeId: rawPromoCodeId ?? undefined,
    notes: rawNotes ?? null,
    isB2B: isB2B ?? false,
    companyName: companyName ?? null,
    nif: nif ?? null,
    nis: nis ?? null,
    rc: rc ?? null,
    giftCardDeduction,
    pointsRedeemed,
  }
  const buyerEmail = rawEmail ?? null
  const giftCardCode = rawGiftCardCode?.trim().toUpperCase() || null

  try {
    const { id: orderId, total } = await createOrder(input)

    // Redeem gift card balance (non-blocking — order already committed)
    if (giftCardCode && giftCardDeduction > 0) {
      fetch(`${req.nextUrl.origin}/api/gift-cards/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: giftCardCode, amount: giftCardDeduction }),
      }).catch((err) => logger.error('[gift-card] redeem failed', { error: err instanceof Error ? err.message : String(err) }))
    }

    // Redeem loyalty points (non-blocking)
    if (pointsRedeemed > 0) {
      const routeClient = createRouteClient(req)
      routeClient.auth.getUser()
        .then(({ data: { user } }) => {
          if (user) return redeemPoints(user.id, pointsRedeemed)
        })
        .catch((err) => logger.error('[loyalty] redeem failed', { error: err instanceof Error ? err.message : String(err) }))
    }

    // Fire WhatsApp notification — non-blocking, never fails the order
    notifyOrderConfirmed({
      phone:     input.phone,
      fullName:  input.fullName,
      orderId,
      total,
      wilaya:    input.wilaya,
      itemCount: input.items.length,
    }).catch((err) => logger.error('[WhatsApp] notification failed', { error: err instanceof Error ? err.message : String(err) }))

    // Fire email confirmation if buyer provided email
    if (buyerEmail) {
      sendOrderConfirmationEmail({
        to:        buyerEmail,
        fullName:  input.fullName,
        orderId,
        total,
        wilaya:    input.wilaya,
        itemCount: input.items.length,
      }).catch((err) => logger.error('[email] order confirmation failed', { error: err instanceof Error ? err.message : String(err) }))
    }

    // Notify sellers + fire vendor-level CAPI (non-blocking)
    ;(async () => {
      try {
        const supabase = createAdminClient()
        const { data: itemRows } = await supabase
          .from('order_items')
          .select('vendor_id')
          .eq('order_id', orderId)
          .not('vendor_id', 'is', null)
        const vendorIds = [...new Set((itemRows ?? []).map((r: { vendor_id: string }) => r.vendor_id).filter(Boolean))]

        // Seller in-app notifications
        await Promise.all(
          vendorIds.map((vid) =>
            createSellerNotification({
              vendorId: vid,
              type:     'new_order',
              title:    'Nouvelle commande reçue',
              body:     `Commande #${orderId.slice(0, 8).toUpperCase()} — ${total.toLocaleString('fr-DZ')} DA`,
              link:     '/seller/orders',
            })
          )
        )

        // Vendor-level CAPI — fire for each vendor that has pixel + CAPI token set
        if (vendorIds.length > 0) {
          const { data: vendors } = await supabase
            .from('vendors')
            .select('meta_pixel_id, meta_capi_token, tiktok_pixel_id, tiktok_capi_token, gtag_id, gtag_api_secret')
            .in('id', vendorIds)
          const capiItems = input.items.map(i => ({ id: i.productId, name: i.productName, price: 0, quantity: i.quantity }))
          await Promise.all(
            (vendors ?? []).map((v: Record<string, string | null>) =>
              firePurchaseCAPI({
                metaPixelId:     v.meta_pixel_id,
                metaCAPIToken:   v.meta_capi_token,
                tiktokPixelId:   v.tiktok_pixel_id,
                tiktokCAPIToken: v.tiktok_capi_token,
                gtagId:          v.gtag_id,
                gtagApiSecret:   v.gtag_api_secret,
                orderId, total, items: capiItems,
                email: buyerEmail, phone: input.phone,
                clientIp: ip,
                clientUserAgent: req.headers.get('user-agent') ?? undefined,
              })
            )
          )
        }
      } catch (err) {
        logger.error('[seller notification + CAPI] failed', { error: err instanceof Error ? err.message : String(err) })
      }
    })()

    // Platform-level CAPI (non-blocking)
    ;(async () => {
      const capiItems = input.items.map(i => ({ id: i.productId, name: i.productName, price: 0, quantity: i.quantity }))
      await firePurchaseCAPI({
        metaPixelId:     process.env.NEXT_PUBLIC_META_PIXEL_ID,
        metaCAPIToken:   process.env.META_CAPI_TOKEN,
        tiktokPixelId:   process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,
        tiktokCAPIToken: process.env.TIKTOK_CAPI_TOKEN,
        gtagId:          process.env.NEXT_PUBLIC_GTAG_ID,
        gtagApiSecret:   process.env.GTAG_API_SECRET,
        orderId, total, items: capiItems,
        email: buyerEmail, phone: input.phone,
        clientIp: ip,
        clientUserAgent: req.headers.get('user-agent') ?? undefined,
      })
    })().catch((err) => logger.error('[platform CAPI] failed', { error: err instanceof Error ? err.message : String(err) }))

    // Award loyalty points for this order (non-blocking)
    createRouteClient(req).auth.getUser()
      .then(({ data: { user } }) => {
        if (user) return awardPoints(user.id, orderId, total)
      })
      .catch((err) => logger.error('[loyalty] award failed', { error: err instanceof Error ? err.message : String(err) }))

    return NextResponse.json({ orderId }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Order creation failed'
    logger.error('[POST /api/orders]', { error: message })

    // Map internal errors to safe client-facing messages (no internal detail leakage)
    if (message.includes('stock') || message.includes('Insufficient')) {
      return NextResponse.json({ error: 'One or more items are out of stock. Please update your cart.' }, { status: 409 })
    }
    if (message.includes('not found') || message.includes('not available') || message.includes('no longer')) {
      return NextResponse.json({ error: 'One or more items are no longer available.' }, { status: 409 })
    }
    if (message.includes('validate products') || message.includes('Product not found')) {
      return NextResponse.json({ error: 'Could not validate your cart. Please refresh and try again.' }, { status: 409 })
    }

    return NextResponse.json({ error: 'Une erreur est survenue. Réessayez.' }, { status: 500 })
  }
}
