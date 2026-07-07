import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'
import { satimGetOrderStatus, satimConfigured } from '@/lib/payment/satim'
import { verifyCheckToken } from '@/lib/payment/checkToken'
import { sendOrderConfirmationEmail } from '@/lib/notifications/email'
import { notifyOrderConfirmed } from '@/lib/notifications/whatsapp'
import { recordFinancialTransaction } from '@/lib/supabase/orders'
import { PaymentCheckQuerySchema } from '@/lib/validation/apiSchemas'

// How long (ms) a pending_payment order must be stuck before we attempt
// a background Satim reconciliation. Override with PAYMENT_CHECK_STALE_MS env var.
const STALE_PENDING_MS = parseInt(process.env.PAYMENT_CHECK_STALE_MS ?? '', 10) || 10 * 60 * 1000

// Module-level guard: tracks order IDs currently being reconciled.
// Without this, every poll that finds a stale order would spawn a new
// parallel reconciliation against Satim, burning their rate limit.
const reconciling = new Set<string>()

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkPublicRateLimit(ip, 'payment_check')
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Trop de requêtes' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const query = {
      orderId: req.nextUrl.searchParams.get('orderId') ?? '',
      token: req.nextUrl.searchParams.get('token') ?? '',
    }
    const parsedQuery = PaymentCheckQuerySchema.safeParse(query)
    if (!parsedQuery.success) {
      return NextResponse.json({ error: 'orderId ou token invalide' }, { status: 400 })
    }
    const { orderId, token } = parsedQuery.data

    // Fetch the order — include phone (ownership key) and satim_order_id (for reconciliation).
    const { data: order, error } = await createAdminClient()
      .from('orders')
      .select('id, status, payment_status, phone, satim_order_id, total, payment_method, created_at')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    // Verify caller owns this order before revealing any status.
    if (!verifyCheckToken(orderId, order.phone as string, token)) {
      logger.warn('[payment/check] invalid ownership token', { orderId, ip })
      return NextResponse.json({ error: 'Token invalide' }, { status: 403 })
    }

    // ── Terminal states — return immediately without re-querying Satim ────
    if (order.status === 'confirmed' && order.payment_status === 'paid') {
      return NextResponse.json({ paid: true, status: order.status })
    }

    if (order.status === 'cancelled' || order.payment_status === 'failed') {
      return NextResponse.json({ paid: false, status: order.status })
    }

    // ── Self-healing: reconcile stale pending_payment orders with Satim ───
    // If the order has been stuck in pending_payment (or processing_payment)
    // beyond the stale timeout AND we have a satim_order_id, re-verify with
    // Satim in the background so the order does not stay pending indefinitely
    // when the callback was missed or failed to process.
    const isStuckPending =
      order.status === 'pending_payment' || order.status === 'processing_payment'

    if (isStuckPending && order.satim_order_id && satimConfigured()) {
      const ageMs = Date.now() - new Date(order.created_at as string).getTime()
      if (ageMs >= STALE_PENDING_MS && !reconciling.has(orderId)) {
        reconciling.add(orderId)
        // Fire-and-forget reconciliation — do not block the polling response.
        reconcileWithSatim(orderId, order.satim_order_id as string, order)
          .finally(() => reconciling.delete(orderId))
          .catch((err) =>
            logger.error('[payment/check] background reconciliation failed', {
              orderId,
              error: err instanceof Error ? err.message : String(err),
            })
          )
      }
    }

    return NextResponse.json({ paid: false, status: order.status })
  } catch (err) {
    logger.error('[GET /api/payment/check]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}

/**
 * Background reconciliation: re-query Satim for the real payment outcome and
 * update the order if it has been paid (orderStatus === 2).  This self-heals
 * orders where the primary callback was never received (e.g. network timeout,
 * Satim retry exhaustion).
 *
 * We deliberately do NOT mark orders as failed here — only a definitive
 * paid confirmation is actioned. Ambiguous states are left for manual review
 * or the next reconciliation pass.
 */
async function reconcileWithSatim(
  orderId: string,
  satimOrderId: string,
  order: { total: number; payment_method?: string | null; status?: string | null; payment_status?: string | null }
): Promise<void> {
  logger.info('[payment/check] reconciling stale order with Satim', { orderId, satimOrderId })
  const satimStatus = await satimGetOrderStatus(satimOrderId)
  if (satimStatus.orderStatus !== 2) {
    logger.info('[payment/check] reconciliation: order not yet paid in Satim', {
      orderId,
      satimOrderId,
      satimStatus: satimStatus.orderStatus,
    })
    return
  }

  // Verify reconciled amount matches order total before mutating state.
  const expectedCentimes = Math.round(order.total * 100)
  if (satimStatus.amount !== expectedCentimes && Math.abs(satimStatus.amount - expectedCentimes) > 1) {
    logger.error('[payment/check] reconciliation amount mismatch', {
      orderId,
      satimOrderId,
      expected: expectedCentimes,
      received: satimStatus.amount,
    })
    return
  }

  // Only update if still in a non-terminal state.
  // Select the order details back so we can send notifications without a
  // second DB round-trip, and only when we actually made the transition
  // (maybeSingle() returns null when the WHERE filters matched 0 rows).
  const { data: updated, error } = await createAdminClient()
    .from('orders')
    .update({ status: 'confirmed', payment_status: 'paid' })
    .eq('id', orderId)
    .in('status', ['pending_payment', 'processing_payment'])
    .select('email, phone, full_name, total, wilaya, is_stopdesk, stop_desk_cause')
    .maybeSingle()

  if (error) {
    logger.error('[payment/check] reconciliation update failed', { orderId, error: error.message })
    return
  }

  if (!updated) {
    // Already in a terminal state — another handler got there first.
    logger.info('[payment/check] reconciliation: order already in terminal state', { orderId })
    return
  }

  logger.info('[payment/check] reconciliation: order marked paid', { orderId, satimOrderId })

  await recordFinancialTransaction({
    orderId,
    amount: order.total,
    statusBefore: order.status ?? undefined,
    statusAfter: 'confirmed',
    paymentStatusBefore: order.payment_status ?? undefined,
    paymentStatusAfter: 'paid',
    paymentMethod: order.payment_method,
    gatewayRef: satimOrderId,
    reason: 'Payment confirmed via Satim reconciliation',
  })

  if (updated.email) {
    const { count } = await createAdminClient()
      .from('order_items')
      .select('*', { count: 'exact', head: true })
      .eq('order_id', orderId)
    sendOrderConfirmationEmail({
      to:           updated.email,
      fullName:     updated.full_name,
      orderId,
      total:        updated.total,
      wilaya:       updated.wilaya ?? '',
      itemCount:    count ?? 0,
      isStopDesk:   updated.is_stopdesk ?? false,
      stopDeskCause: (updated as typeof updated & { stop_desk_cause?: string | null }).stop_desk_cause ?? null,
    }).catch((err) =>
      logger.error('[payment/check] reconciliation email failed', { orderId, error: err instanceof Error ? err.message : String(err) })
    )
  }

  if (updated.phone) {
    notifyOrderConfirmed({
      phone:     updated.phone,
      fullName:  updated.full_name,
      orderId,
      total:     updated.total,
      wilaya:    updated.wilaya ?? '',
      itemCount: 0,
    }).catch((err) =>
      logger.error('[payment/check] reconciliation WhatsApp failed', { orderId, error: err instanceof Error ? err.message : String(err) })
    )
  }
}
