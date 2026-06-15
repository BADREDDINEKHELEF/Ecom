import { NextRequest, NextResponse } from 'next/server'
import { satimGetOrderStatus, satimConfirmOrder } from '@/lib/payment/satim'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  // Rate-limit payment callbacks: 20 per minute per IP (prevents callback flooding/replay attacks)
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'payment_callback')
  if (!rl.allowed) {
    logger.warn('[payment/callback] rate limit exceeded', { ip })
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const result  = searchParams.get('result')   // 'success' | 'fail'
  const orderId = searchParams.get('orderId')   // our internal order ID (orderNumber we sent to Satim)
  const satimId = searchParams.get('mdOrder')   // Satim's own reference

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')}`

  if (!orderId) {
    return NextResponse.redirect(`${appUrl}/payment/failure?reason=missing_order`)
  }

  if (result === 'fail' || result === 'failure') {
    await markOrderFailed(orderId)
    return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}`)
  }

  // Server-side verification is mandatory — never trust client-supplied result param alone.
  // An attacker could craft ?result=success&orderId=<anything> to mark orders as paid.
  // We require a valid mdOrder (Satim reference) and confirm it server-side.
  if (!satimId) {
    logger.warn('[payment/callback] No mdOrder param — possible tamper attempt', { orderId })
    await markOrderFailed(orderId)
    return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}&reason=no_reference`)
  }

  try {
    const status = await satimGetOrderStatus(satimId)
    if (status.orderStatus === 2) {
      await satimConfirmOrder(satimId)
      await markOrderPaid(orderId, satimId)
      return NextResponse.redirect(`${appUrl}/payment/success?orderId=${orderId}`)
    }
    // Satim returned a non-success status — payment not completed
    await markOrderFailed(orderId)
    return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}&reason=not_paid`)
  } catch (err) {
    logger.error('[payment/callback] Satim verification failed', { error: err instanceof Error ? err.message : String(err) })
    // Do NOT mark as paid when we cannot verify. Fail safe.
    return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}&reason=verification_error`)
  }
}

async function markOrderPaid(orderId: string, satimOrderId?: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      ...(satimOrderId ? { satim_order_id: satimOrderId } : {}),
    })
    .eq('id', orderId)
    .eq('status', 'pending_payment') // Only mark paid if still awaiting payment (idempotency guard)
  if (error) logger.error('[payment/callback] markOrderPaid failed', { orderId, error: error.message })
}

async function markOrderFailed(orderId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', payment_status: 'failed' })
    .eq('id', orderId)
  if (error) logger.error('[payment/callback] markOrderFailed failed', { orderId, error: error.message })
}
