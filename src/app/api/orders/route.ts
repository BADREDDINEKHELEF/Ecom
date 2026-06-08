import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createOrder } from '@/lib/supabase/orders'
import { checkCheckoutRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { notifyOrderConfirmed } from '@/lib/notifications/whatsapp'
import { logger } from '@/lib/logger'

const OrderItemSchema = z.object({
  productId:    z.string().min(1),
  productName:  z.string().min(1).max(500),
  productImage: z.string().max(1000).default(''),
  quantity:     z.number().int().min(1).max(100),
  vendorId:     z.string().uuid().nullable().optional(),
})

const CreateOrderSchema = z.object({
  fullName:      z.string().min(2).max(200),
  phone:         z.string().regex(/^(213[5-7]|0[5-7])\d{8}$/, 'Invalid Algerian phone number'),
  wilaya:        z.string().min(1).max(100),
  city:          z.string().min(1).max(200),
  address:       z.string().min(5).max(500),
  paymentMethod: z.enum(['cash', 'card', 'edahabia', 'cib', 'baridimob']),
  shippingCost:  z.number().min(0).max(10000),
  promoCodeId:   z.string().uuid().optional().nullable(),
  discountAmount: z.number().min(0).max(1_000_000).optional().default(0),
  items:         z.array(OrderItemSchema).min(1).max(50),
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
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const { promoCodeId: rawPromoCodeId, ...rest } = parsed.data
  const input = {
    ...rest,
    phone: normalizePhone(parsed.data.phone),
    promoCodeId: rawPromoCodeId ?? undefined,
  }

  try {
    const { id: orderId, total } = await createOrder(input)

    // Fire WhatsApp notification — non-blocking, never fails the order
    notifyOrderConfirmed({
      phone:     input.phone,
      fullName:  input.fullName,
      orderId,
      total,
      wilaya:    input.wilaya,
      itemCount: input.items.length,
    }).catch((err) => logger.error('[WhatsApp] notification failed', { error: err instanceof Error ? err.message : String(err) }))

    return NextResponse.json({ orderId }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Order creation failed'
    logger.error('[POST /api/orders]', { error: message })

    // Surface stock/product errors to the user as 409
    if (message.includes('stock') || message.includes('not found')) {
      return NextResponse.json({ error: message }, { status: 409 })
    }

    return NextResponse.json({ error: 'Une erreur est survenue. Réessayez.' }, { status: 500 })
  }
}
