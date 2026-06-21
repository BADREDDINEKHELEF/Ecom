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
    // Fetch the order first to verify amount and detect replay
    const { data: order, error: orderErr } = await createAdminClient()
      .from('orders')
      .select('id, status, total, satim_order_id')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      logger.warn('[payment/callback] order not found', { orderId, satimId })
      return NextResponse.redirect(`${appUrl}/payment/failure?reason=order_not_found`)
    }

    // Replay attack guard: if satim_order_id is already set, this payment was processed
    if (order.satim_order_id && order.satim_order_id === satimId) {
      logger.warn('[payment/callback] duplicate callback — already processed', { orderId, satimId })
      // Already paid → redirect to success rather than re-processing
      return NextResponse.redirect(`${appUrl}/payment/success?orderId=${orderId}`)
    }

    const status = await satimGetOrderStatus(satimId)
    if (status.orderStatus !== 2) {
      await markOrderFailed(orderId)
      return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}&reason=not_paid`)
    }

    // Amount verification — Satim reports in centimes (DZD × 100)
    const expectedCentimes = Math.round(order.total * 100)
    if (status.amount !== expectedCentimes) {
      logger.error('[payment/callback] AMOUNT MISMATCH — possible tampering', {
        orderId, satimId,
        expected: expectedCentimes,
        received: status.amount,
      })
      // Do NOT fulfil the order if the amount does not match. Fail safe.
      return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}&reason=amount_mismatch`)
    }

    await satimConfirmOrder(satimId)
    await markOrderPaid(orderId, satimId)
    return NextResponse.redirect(`${appUrl}/payment/success?orderId=${orderId}`)
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
    .eq('status', 'pending_payment') // Idempotency guard — never cancel a confirmed/delivered order
  if (error) logger.error('[payment/callback] markOrderFailed failed', { orderId, error: error.message })
}
