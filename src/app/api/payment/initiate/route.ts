import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { satimRegisterOrder, satimConfigured } from '@/lib/payment/satim'
import { baridimobInitiatePayment, baridimobConfigured } from '@/lib/payment/baridimob'
import { createOrder } from '@/lib/supabase/orders'
import { sendOrderConfirmationEmail } from '@/lib/notifications/email'
import { notifyOrderConfirmed } from '@/lib/notifications/whatsapp'
import { getClientIp } from '@/lib/utils/ip'
import { checkCheckoutRateLimit } from '@/lib/auth/rateLimit'
import { logger } from '@/lib/logger'

const OrderItemSchema = z.object({
  productId:    z.string().min(1),
  productName:  z.string().min(1).max(500),
  productImage: z.string().max(1000).default(''),
  quantity:     z.number().int().min(1).max(100),
  vendorId:     z.string().uuid().nullable().optional(),
})

const InitiateSchema = z.object({
  paymentMethod:    z.enum(['edahabia', 'cib', 'card', 'baridimob']),
  fullName:         z.string().min(2).max(200),
  phone:            z.string().regex(/^(213[5-7]|0[5-7])\d{8}$/, 'Invalid Algerian phone number'),
  email:            z.string().email().max(320).optional().nullable(),
  wilaya:           z.string().min(1).max(100),
  city:             z.string().min(1).max(200).refine((v) => v !== '__autre__', { message: 'Invalid commune value' }),
  address:          z.string().min(5).max(500),
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
  gaClientId:       z.string().max(100).optional().nullable(),
  isStopDesk:       z.boolean().optional().default(false),
  items:            z.array(OrderItemSchema).min(1).max(50),
  selectedColor:    z.string().max(100).nullable().optional(),
})

function normalizePhone(p: string) {
  return p.replace(/[\s\-().+]/g, '')
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkCheckoutRateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = InitiateSchema.safeParse(body)
  if (!parsed.success) {
    const details = process.env.NODE_ENV === 'development' ? parsed.error.issues : undefined
    return NextResponse.json({ error: 'Validation failed', ...(details && { details }) }, { status: 400 })
  }

  const {
    paymentMethod,
    promoCodeId,
    email: rawEmail,
    giftCardCode: rawGiftCardCode,
    giftCardDeduction,
    pointsRedeemed,
    isB2B,
    companyName,
    nif,
    nis,
    rc,
    isStopDesk,
    ...rest
  } = parsed.data
  const phone = normalizePhone(rest.phone)
  const buyerEmail = rawEmail ?? null

  // Verify gateway config BEFORE creating an order — avoids orphaned orders
  // that consume stock and increment promo uses when the gateway is unavailable.
  if (paymentMethod === 'baridimob') {
    if (!baridimobConfigured()) {
      return NextResponse.json({ error: 'BaridiMob not configured' }, { status: 503 })
    }
  } else if (!satimConfigured()) {
    return NextResponse.json({ error: 'Online payment not configured' }, { status: 503 })
  }

  try {
    const { id: orderId, total } = await createOrder({
      ...rest,
      phone,
      paymentMethod,
      promoCodeId: promoCodeId ?? undefined,
      giftCardCode: rawGiftCardCode?.trim().toUpperCase() || undefined,
      giftCardDeduction: giftCardDeduction || 0,
      pointsRedeemed,
      isB2B: isB2B ?? false,
      companyName: companyName ?? null,
      nif: nif ?? null,
      nis: nis ?? null,
      rc: rc ?? null,
      isStopDesk: isStopDesk ?? false,
      email:    buyerEmail,
      status: 'pending_payment',
    })

    // Use the server-computed total (DZD) returned by createOrder — never trust client amounts.
    // Satim expects centimes (DZD × 100).
    // NEXT_PUBLIC_APP_URL must be set — never fall back to the Host header, which is
    // user-controlled and could redirect Satim's callback to an attacker's server.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      logger.error('[POST /api/payment/initiate] NEXT_PUBLIC_APP_URL env var is not set')
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 503 })
    }
    const orderAmountCentimes = Math.round(total * 100)

    // Non-blocking notifications
    if (buyerEmail) {
      sendOrderConfirmationEmail({
        to: buyerEmail,
        fullName: rest.fullName,
        orderId,
        total,
        wilaya: rest.wilaya,
        itemCount: rest.items.length,
        isStopDesk,
      }).catch((err) => logger.error('[email initiate] confirmation failed', { error: err instanceof Error ? err.message : String(err) }))
    }
    notifyOrderConfirmed({
      phone: rest.phone,
      fullName: rest.fullName,
      orderId,
      total,
      wilaya: rest.wilaya,
      itemCount: rest.items.length,
    }).catch((err) => logger.error('[WhatsApp initiate] notification failed', { error: err instanceof Error ? err.message : String(err) }))

    if (paymentMethod === 'baridimob') {
      const bmResult = await baridimobInitiatePayment({
        orderNumber: orderId,
        amountDZD:   total,
        description: `Commande StoreDz #${orderId.slice(0, 8)}`,
        callbackUrl: `${appUrl}/api/payment/callback`,
      })
      return NextResponse.json({ orderId, qrCodeData: bmResult.qrCodeData, deepLink: bmResult.deepLink, expiresAt: bmResult.expiresAt, method: 'baridimob' }, { status: 201 })
    }

    // CIB / Edahabia / Card → Satim
    const satimResult = await satimRegisterOrder({
      orderNumber:    orderId,
      amountCentimes: orderAmountCentimes,
      description:    `Commande StoreDz #${orderId.slice(0, 8)}`,
      returnUrl:      `${appUrl}/api/payment/callback?result=success&orderId=${orderId}`,
      failUrl:        `${appUrl}/api/payment/callback?result=fail&orderId=${orderId}`,
      language:       'fr',
    })

    return NextResponse.json({ orderId, formUrl: satimResult.formUrl, satimOrderId: satimResult.satimOrderId, method: 'satim' }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Payment initiation failed'
    logger.error('[POST /api/payment/initiate]', { error: msg })
    if (msg.includes('stock') || msg.includes('Insufficient')) {
      return NextResponse.json({ error: 'One or more items are out of stock. Please update your cart.' }, { status: 409 })
    }
    if (msg.includes('not found') || msg.includes('not available') || msg.includes('no longer')) {
      return NextResponse.json({ error: 'One or more items are no longer available.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 })
  }
}
