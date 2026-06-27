import { NextRequest, NextResponse } from 'next/server'
import { satimGetOrderStatus, satimConfirmOrder } from '@/lib/payment/satim'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'
import { sendOrderConfirmationEmail } from '@/lib/notifications/email'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'payment_callback')
  if (!rl.allowed) {
    logger.warn('[payment/callback] rate limit exceeded', { ip })
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const result  = searchParams.get('result')
  const orderId = searchParams.get('orderId')
  const satimId = searchParams.get('mdOrder')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')}`

  if (!orderId) {
    return NextResponse.redirect(`${appUrl}/payment/failure?reason=missing_order`)
  }

  if (result === 'fail' || result === 'failure') {
    await markOrderFailed(orderId)
    return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}`)
  }

  if (!satimId) {
    logger.warn('[payment/callback] No mdOrder param — possible tamper attempt', { orderId })
    await markOrderFailed(orderId)
    return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}&reason=no_reference`)
  }

  try {
    const { data: order, error: orderErr } = await createAdminClient()
      .from('orders')
      .select('id, status, total, satim_order_id, email, full_name, wilaya, is_stopdesk, stop_desk_cause')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      logger.warn('[payment/callback] order not found', { orderId, satimId })
      return NextResponse.redirect(`${appUrl}/payment/failure?reason=order_not_found`)
    }

    if (order.satim_order_id && order.satim_order_id === satimId) {
      logger.warn('[payment/callback] duplicate callback — already processed', { orderId, satimId })
      return NextResponse.redirect(`${appUrl}/payment/success?orderId=${orderId}`)
    }

    const status = await satimGetOrderStatus(satimId)
    if (status.orderStatus !== 2) {
      await markOrderFailed(orderId)
      return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}&reason=not_paid`)
    }

    const expectedCentimes = Math.round(order.total * 100)
    if (status.amount !== expectedCentimes) {
      logger.error('[payment/callback] AMOUNT MISMATCH — possible tampering', {
        orderId, satimId,
        expected: expectedCentimes,
        received: status.amount,
      })
      return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}&reason=amount_mismatch`)
    }

    await satimConfirmOrder(satimId)
    await markOrderPaid(orderId, satimId)

    if (order.email) {
      const { count } = await createAdminClient()
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId)

      sendOrderConfirmationEmail({
        to: order.email,
        fullName: order.full_name,
        orderId,
        total: order.total,
        wilaya: order.wilaya,
        itemCount: count ?? 0,
        isStopDesk: order.is_stopdesk ?? false,
        stopDeskCause: (order as typeof order & { stop_desk_cause?: string | null }).stop_desk_cause ?? null,
      }).catch((err) => logger.error('[email callback] confirmation failed', { error: err instanceof Error ? err.message : String(err) }))
    }

    return NextResponse.redirect(`${appUrl}/payment/success?orderId=${orderId}`)
  } catch (err) {
    logger.error('[payment/callback] Satim verification failed', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}&reason=verification_error`)
  }
}

async function markOrderPaid(orderId: string, satimOrderId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      satim_order_id: satimOrderId,
    })
    .eq('id', orderId)
    .eq('status', 'pending_payment')
  if (error) logger.error('[payment/callback] markOrderPaid failed', { orderId, error: error.message })
}

async function markOrderFailed(orderId: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', payment_status: 'failed' })
    .eq('id', orderId)
    .eq('status', 'pending_payment')
  if (error) logger.error('[payment/callback] markOrderFailed failed', { orderId, error: error.message })
}
