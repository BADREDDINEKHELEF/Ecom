import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { satimGetOrderStatus, satimConfirmOrder } from '@/lib/payment/satim'
import { baridimobVerifyPayment, verifyBaridiMobWebhook } from '@/lib/payment/baridimob'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'
import { sendOrderConfirmationEmail } from '@/lib/notifications/email'
import { notifyOrderConfirmed } from '@/lib/notifications/whatsapp'
import { recordFinancialTransaction } from '@/lib/supabase/orders'
import { BaridiMobWebhookSchema } from '@/lib/validation/apiSchemas'
import { triggerConversionsApiOnSuccess } from '@/lib/analytics/server'

// ── Bug 6 fix: satimId format validator ──────────────────────────────────────
const SATIM_ID_RE = /^[0-9a-f-]{8,36}$/i
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Bug 3 fix: HMAC-SHA256 signature verification ────────────────────────────
function verifySatimSignature(req: NextRequest): boolean {
  const secret = process.env.SATIM_SHARED_SECRET
  if (!secret) {
    // Missing secret is a server misconfiguration. Never accept unsigned
    // callbacks — this would let anyone mark orders as paid.
    logger.error('[payment/callback] SATIM_SHARED_SECRET not set — rejecting callback')
    return false
  }
  const { searchParams } = new URL(req.url)
  const checksum = searchParams.get('checksum')
  if (!checksum) {
    logger.warn('[payment/callback] Missing checksum parameter')
    return false
  }
  // Rebuild canonical query string without the checksum parameter itself.
  const params = new URLSearchParams(searchParams)
  params.delete('checksum')
  // Sort keys for deterministic canonical form.
  const sortedParams = new URLSearchParams([...params.entries()].sort(([a], [b]) => a.localeCompare(b)))
  const canonical = sortedParams.toString()
  const expected = createHmac('sha256', secret).update(canonical).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(checksum, 'hex'))
  } catch {
    // timingSafeEqual throws if buffers differ in length.
    return false
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'payment_callback')
  if (!rl.allowed) {
    logger.warn('[payment/callback] rate limit exceeded', { ip })
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Bug 3 fix: validate HMAC signature before touching any state.
  if (!verifySatimSignature(req)) {
    if (!process.env.SATIM_SHARED_SECRET) {
      logger.error('[payment/callback] SATIM_SHARED_SECRET is not configured — rejecting callback', { ip })
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 })
    }
    logger.warn('[payment/callback] Invalid or missing HMAC signature — rejecting', { ip })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const { searchParams } = new URL(req.url)
  const result  = searchParams.get('result')
  const orderId = searchParams.get('orderId')
  const satimId = searchParams.get('mdOrder')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  if (!orderId) {
    return NextResponse.redirect(`${appUrl}/payment/failure?reason=missing_order`)
  }

  // Validate orderId format before any DB lookup or redirect construction.
  if (!UUID_RE.test(orderId)) {
    logger.warn('[payment/callback] orderId failed UUID validation', { orderId })
    return NextResponse.redirect(`${appUrl}/payment/failure?reason=invalid_order`)
  }

  // Bug 2 fix: removed the optimistic fail-on-parameter path.
  // The `result=fail` param is attacker-controlled; never mutate order state
  // based on it alone. We use it only as a hint (below) to skip success redirect.

  if (!satimId) {
    // No gateway reference — cannot verify with Satim. Redirect without mutating state.
    logger.warn('[payment/callback] No mdOrder param — cannot verify with Satim', { orderId })
    return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}&reason=no_reference`)
  }

  // Bug 6 fix: validate satimId format before using it in any external call.
  if (!SATIM_ID_RE.test(satimId)) {
    logger.warn('[payment/callback] satimId failed format validation', { orderId, satimId })
    return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}&reason=invalid_reference`)
  }

  try {
    const { data: order, error: orderErr } = await createAdminClient()
      .from('orders')
      .select('id, status, payment_status, total, payment_method, satim_order_id, email, phone, full_name, wilaya, is_stopdesk, stop_desk_cause, client_ip, client_user_agent')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      logger.warn('[payment/callback] order not found', { orderId, satimId })
      return NextResponse.redirect(`${appUrl}/payment/failure?reason=order_not_found`)
    }

    // Replay-attack guard: if this Satim order ID was already processed for this order, ack it.
    if (order.satim_order_id && order.satim_order_id === satimId) {
      logger.info('[payment/callback] Satim callback already processed', { orderId, satimId })
      return NextResponse.redirect(`${appUrl}/payment/success?orderId=${orderId}`)
    }

    // Bug 1 fix: true idempotency — only skip re-processing when the order is
    // already in a confirmed/paid terminal state, not merely when satim_order_id
    // matches (which can never be true on a first call anyway, and would bypass
    // amount/status verification on replays).
    if (order.status === 'confirmed' && order.payment_status === 'paid') {
      logger.info('[payment/callback] order already confirmed — idempotent redirect to success', { orderId })
      return NextResponse.redirect(`${appUrl}/payment/success?orderId=${orderId}`)
    }

    // Bug 4 fix: atomically claim the order before any external calls to prevent
    // TOCTOU races. If two callbacks arrive concurrently only one will succeed
    // this UPDATE; the other gets no row back and is treated as a duplicate.
    const { data: claimed, error: claimErr } = await createAdminClient()
      .from('orders')
      .update({ status: 'processing_payment' })
      .eq('id', orderId)
      .eq('status', 'pending_payment')
      .select('id')
      .single()

    if (claimErr || !claimed) {
      // Another concurrent callback already claimed this order.
      // Re-read the actual status before deciding where to redirect — the other
      // handler may have confirmed the payment, or it may have failed it.
      // Never redirect to /success based solely on a failed claim: the
      // concurrent handler might ultimately mark the order as failed.
      const { data: reread } = await createAdminClient()
        .from('orders')
        .select('status, payment_status')
        .eq('id', orderId)
        .single()
      if (reread?.status === 'confirmed' && reread?.payment_status === 'paid') {
        logger.info('[payment/callback] order already confirmed by concurrent handler', { orderId })
        return NextResponse.redirect(`${appUrl}/payment/success?orderId=${orderId}`)
      }
      logger.info('[payment/callback] concurrent claim — order not yet confirmed', { orderId, currentStatus: reread?.status })
      return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}&reason=processing`)
    }

    const status = await satimGetOrderStatus(satimId)
    if (status.orderStatus !== 2) {
      await markOrderFailed(orderId, order, 'Payment not paid per Satim')
      // Bug 2 fix: use `result` only as a display hint here, never as a trigger for state mutation.
      const reason = (result === 'fail' || result === 'failure') ? 'payment_declined' : 'not_paid'
      return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}&reason=${reason}`)
    }

    // Bug 5 fix: use a 1-centime tolerance to guard against IEEE-754 rounding
    // when converting DZD amounts to centimes. The root fix is to store
    // total_centimes as an integer at order creation; the tolerance is a
    // belt-and-suspenders guard until that migration lands.
    const expectedCentimes = Math.round(order.total * 100)
    if (status.amount !== expectedCentimes && Math.abs(status.amount - expectedCentimes) > 1) {
      logger.error('[payment/callback] AMOUNT MISMATCH — possible tampering', {
        orderId, satimId,
        expected: expectedCentimes,
        received: status.amount,
      })
      await markOrderFailed(orderId, order, 'Amount mismatch')
      return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}&reason=amount_mismatch`)
    }

    await satimConfirmOrder(satimId)
    await markOrderPaid(orderId, satimId, order)

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

    if (order.phone) {
      const { count: itemCount } = await createAdminClient()
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId)

      notifyOrderConfirmed({
        phone:     order.phone,
        fullName:  order.full_name,
        orderId,
        total:     order.total,
        wilaya:    order.wilaya ?? '',
        itemCount: itemCount ?? 0,
      }).catch((err) =>
        logger.error('[payment/callback] WhatsApp notification failed', {
          error: err instanceof Error ? err.message : String(err),
        }),
      )
    }

    // Trigger non-blocking server-side CAPI event tracking
    void triggerConversionsApiOnSuccess(orderId)

    return NextResponse.redirect(`${appUrl}/payment/success?orderId=${orderId}`)
  } catch (err) {
    logger.error('[payment/callback] Satim verification failed', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}&reason=verification_error`)
  }
}

async function markOrderPaid(
  orderId: string,
  gatewayRef: string,
  order: { total: number; payment_method?: string | null; status?: string | null; payment_status?: string | null }
) {
  const supabase = createAdminClient()
  // Bug 4 fix: match against 'processing_payment' because the atomic claim
  // already transitioned the order out of 'pending_payment'. The WHERE guard
  // still prevents accidental double-confirmation.
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      satim_order_id: gatewayRef,
    })
    .eq('id', orderId)
    .eq('status', 'processing_payment')
  if (error) {
    logger.error('[payment/callback] markOrderPaid failed', { orderId, error: error.message })
    throw new Error(`Failed to confirm order ${orderId}: ${error.message}`)
  }

  await recordFinancialTransaction({
    orderId,
    amount: order.total,
    statusBefore: order.status ?? undefined,
    statusAfter: 'confirmed',
    paymentStatusBefore: order.payment_status ?? undefined,
    paymentStatusAfter: 'paid',
    paymentMethod: order.payment_method,
    gatewayRef,
    reason: 'Payment confirmed via Satim callback',
  })
}

async function markOrderFailed(
  orderId: string,
  order?: { total: number; payment_method?: string | null; status?: string | null; payment_status?: string | null },
  reason = 'Payment failed'
) {
  const supabase = createAdminClient()
  // Bug 4 fix: match against 'processing_payment' because after the atomic claim
  // the order is no longer in 'pending_payment'. The IN filter prevents
  // cancelling an already-confirmed order if a failure path fires unexpectedly.
  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', payment_status: 'failed' })
    .eq('id', orderId)
    .in('status', ['pending_payment', 'processing_payment'])
  if (error) {
    logger.error('[payment/callback] markOrderFailed failed', { orderId, error: error.message })
    return
  }

  if (order) {
    await recordFinancialTransaction({
      orderId,
      amount: order.total,
      statusBefore: order.status ?? undefined,
      statusAfter: 'cancelled',
      paymentStatusBefore: order.payment_status ?? undefined,
      paymentStatusAfter: 'failed',
      paymentMethod: order.payment_method,
      reason,
    })
  }
}

// ── BaridiMob push webhook (POST) ────────────────────────────────────────────
// BaridiMob sends a POST to /api/payment/callback with a JSON body containing
// at minimum { payment_id, order_id }.  We authenticate via HMAC-SHA256 on the
// raw body before doing any state mutation.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'payment_callback')
  if (!rl.allowed) {
    logger.warn('[payment/callback/baridimob] rate limit exceeded', { ip })
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Read the raw body for HMAC verification (must happen before any .json() call).
  let rawBody: Buffer
  try {
    rawBody = Buffer.from(await req.arrayBuffer())
  } catch {
    logger.warn('[payment/callback/baridimob] failed to read request body')
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const signature = req.headers.get('x-baridimob-signature')
  if (!verifyBaridiMobWebhook(rawBody, signature)) {
    logger.warn('[payment/callback/baridimob] HMAC verification failed — rejecting webhook', { ip })
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let rawPayload: Record<string, unknown>
  try {
    rawPayload = JSON.parse(rawBody.toString('utf-8')) as Record<string, unknown>
  } catch {
    logger.warn('[payment/callback/baridimob] invalid JSON in webhook body')
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const parsedPayload = BaridiMobWebhookSchema.safeParse(rawPayload)
  if (!parsedPayload.success) {
    logger.warn('[payment/callback/baridimob] webhook body failed schema validation', { issues: parsedPayload.error.issues })
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const { payment_id: paymentId, order_id: orderId } = parsedPayload.data

  try {
    const { data: order, error: orderErr } = await createAdminClient()
      .from('orders')
      .select('id, total, payment_method, status, payment_status, email, phone, full_name, wilaya, is_stopdesk, stop_desk_cause, client_ip, client_user_agent')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      logger.warn('[payment/callback/baridimob] order not found', { orderId, paymentId })
      // Return 200 so the gateway does not keep retrying for unknown orders.
      return NextResponse.json({ received: true })
    }

    if (order.status === 'confirmed' && order.payment_status === 'paid') {
      logger.info('[payment/callback/baridimob] order already confirmed — idempotent ack', { orderId })
      return NextResponse.json({ received: true })
    }

    // Atomic claim to prevent TOCTOU races from concurrent push/poll.
    const { data: claimed, error: claimErr } = await createAdminClient()
      .from('orders')
      .update({ status: 'processing_payment' })
      .eq('id', orderId)
      .eq('status', 'pending_payment')
      .select('id')
      .single()

    if (claimErr || !claimed) {
      logger.info('[payment/callback/baridimob] order already claimed by concurrent handler', { orderId })
      return NextResponse.json({ received: true })
    }

    const verification = await baridimobVerifyPayment(paymentId)
    if (!verification.paid) {
      logger.info('[payment/callback/baridimob] payment not paid per gateway', { orderId, paymentId, status: verification.status })
      await markOrderFailed(orderId, order, 'Payment not paid per BaridiMob')
      return NextResponse.json({ received: true })
    }

    // Verify reconciled amount matches order total before marking paid.
    if (verification.amount == null || Math.abs(verification.amount - order.total) > 1) {
      logger.error('[payment/callback/baridimob] amount mismatch', {
        orderId,
        paymentId,
        expected: order.total,
        received: verification.amount,
      })
      await markOrderFailed(orderId, order, 'BaridiMob amount mismatch')
      return NextResponse.json({ received: true })
    }

    const { error: confirmErr } = await createAdminClient()
      .from('orders')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        baridimob_payment_id: paymentId,
      })
      .eq('id', orderId)
      .eq('status', 'processing_payment')
    if (confirmErr) {
      logger.error('[payment/callback/baridimob] confirm update failed', { orderId, paymentId, error: confirmErr.message })
      throw new Error(`Failed to confirm BaridiMob order ${orderId}: ${confirmErr.message}`)
    }

    // Trigger non-blocking server-side CAPI event tracking
    void triggerConversionsApiOnSuccess(orderId)

    await recordFinancialTransaction({
      orderId,
      amount: order.total,
      statusBefore: order.status ?? undefined,
      statusAfter: 'confirmed',
      paymentStatusBefore: order.payment_status ?? undefined,
      paymentStatusAfter: 'paid',
      paymentMethod: order.payment_method,
      gatewayRef: paymentId,
      reason: 'Payment confirmed via BaridiMob webhook',
    })

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
      }).catch((err) =>
        logger.error('[payment/callback/baridimob] email confirmation failed', {
          error: err instanceof Error ? err.message : String(err),
        }),
      )
    }

    if (order.phone) {
      const { count: itemCount } = await createAdminClient()
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId)
      notifyOrderConfirmed({
        phone:     order.phone,
        fullName:  order.full_name,
        orderId,
        total:     order.total,
        wilaya:    order.wilaya ?? '',
        itemCount: itemCount ?? 0,
      }).catch((err) =>
        logger.error('[payment/callback/baridimob] WhatsApp notification failed', {
          error: err instanceof Error ? err.message : String(err),
        }),
      )
    }

    logger.info('[payment/callback/baridimob] order confirmed via webhook', { orderId, paymentId })
    return NextResponse.json({ received: true })
  } catch (err) {
    logger.error('[payment/callback/baridimob] webhook processing error', {
      error: err instanceof Error ? err.message : String(err),
      orderId,
      paymentId,
    })
    // Return 500 so the gateway will retry; do not leak internal error details.
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
