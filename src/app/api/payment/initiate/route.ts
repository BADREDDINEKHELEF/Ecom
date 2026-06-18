import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { satimRegisterOrder, satimConfigured } from '@/lib/payment/satim'
import { baridimobInitiatePayment, baridimobConfigured } from '@/lib/payment/baridimob'
import { createOrder } from '@/lib/supabase/orders'
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
  paymentMethod: z.enum(['edahabia', 'cib', 'card', 'baridimob']),
  fullName:      z.string().min(2).max(200),
  phone:         z.string().regex(/^(213[5-7]|0[5-7])\d{8}$/, 'Invalid Algerian phone number'),
  wilaya:        z.string().min(1).max(100),
  city:          z.string().min(1).max(200).refine((v) => v !== '__autre__', { message: 'Invalid commune value' }),
  address:       z.string().min(5).max(500),
  shippingCost:  z.number().min(0).max(10000),
  promoCodeId:   z.string().uuid().optional().nullable(),
  discountAmount: z.number().min(0).default(0),
  items:         z.array(OrderItemSchema).min(1).max(50),
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
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 })
  }

  const { paymentMethod, promoCodeId, ...rest } = parsed.data
  const phone = normalizePhone(rest.phone)

  try {
    const { id: orderId, total } = await createOrder({
      ...rest,
      phone,
      paymentMethod,
      promoCodeId: promoCodeId ?? undefined,
      status: 'pending_payment',
    })

    // Use the server-computed total (DZD) returned by createOrder — never trust client amounts.
    // Satim expects centimes (DZD × 100).
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')}`
    const orderAmountCentimes = Math.round(total * 100)

    if (paymentMethod === 'baridimob') {
      if (!baridimobConfigured()) {
        return NextResponse.json({ error: 'BaridiMob not configured' }, { status: 503 })
      }
      const bmResult = await baridimobInitiatePayment({
        orderNumber: orderId,
        amountDZD:   total,
        description: `Commande ShopDZ #${orderId.slice(0, 8)}`,
        callbackUrl: `${appUrl}/api/payment/callback`,
      })
      return NextResponse.json({ orderId, qrCodeData: bmResult.qrCodeData, deepLink: bmResult.deepLink, expiresAt: bmResult.expiresAt, method: 'baridimob' }, { status: 201 })
    }

    // CIB / Edahabia / Card → Satim
    if (!satimConfigured()) {
      return NextResponse.json({ error: 'Online payment not configured' }, { status: 503 })
    }

    const satimResult = await satimRegisterOrder({
      orderNumber:    orderId,
      amountCentimes: orderAmountCentimes,
      description:    `Commande ShopDZ #${orderId.slice(0, 8)}`,
      returnUrl:      `${appUrl}/api/payment/callback?result=success&orderId=${orderId}`,
      failUrl:        `${appUrl}/api/payment/callback?result=fail&orderId=${orderId}`,
      language:       'fr',
    })

    return NextResponse.json({ orderId, formUrl: satimResult.formUrl, satimOrderId: satimResult.satimOrderId, method: 'satim' }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Payment initiation failed'
    logger.error('[POST /api/payment/initiate]', { error: msg })
    if (msg.includes('stock') || msg.includes('not found')) {
      return NextResponse.json({ error: msg }, { status: 409 })
    }
    return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 })
  }
}
