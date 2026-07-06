import { createHmac, timingSafeEqual } from 'crypto'
import { logger } from '@/lib/logger'

/**
 * Compute the HMAC-SHA256 ownership token for a (orderId, phone) pair.
 *
 * The token is issued by /api/payment/initiate immediately after order creation
 * and must be supplied by the polling client on every /api/payment/check call.
 * This prevents any party who learns an orderId from polling the payment status
 * of an order they did not place.
 *
 * Requires env var: PAYMENT_CHECK_SECRET (any high-entropy string ≥ 32 chars).
 * Generate with: openssl rand -hex 32
 *
 * If the env var is absent the function returns '' and verification falls back
 * to a dev-only warning — PAYMENT_CHECK_SECRET MUST be set in production.
 */
export function computeCheckToken(orderId: string, phone: string): string {
  const secret = process.env.PAYMENT_CHECK_SECRET
  if (!secret) return ''
  return createHmac('sha256', secret).update(`${orderId}:${phone}`).digest('hex')
}

/**
 * Verify that `token` is the correct ownership token for this (orderId, phone) pair.
 * Uses a constant-time comparison to prevent timing-oracle attacks.
 */
export function verifyCheckToken(orderId: string, phone: string, token: string): boolean {
  const secret = process.env.PAYMENT_CHECK_SECRET
  if (!secret) {
    // Missing secret is a server misconfiguration. Never accept tokens in
    // this state — it would let anyone poll order payment status.
    logger.error('[payment/check] PAYMENT_CHECK_SECRET not set — ownership check rejected')
    return false
  }
  const expected = computeCheckToken(orderId, phone)
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(token, 'hex'))
  } catch {
    // timingSafeEqual throws when buffer lengths differ (wrong-length / non-hex token).
    return false
  }
}
