/**
 * Unified security event log — append-only, immutable audit trail.
 *
 * Covers: logins, logouts, session events, permission denials, rate limit blocks,
 *         payment anomalies, data access, role changes, password changes.
 *
 * IMPORTANT: Never put raw secrets, full phone numbers, or payment card data
 * in the meta field. Hash or mask PII before logging.
 *
 * All writes are fire-and-forget (non-blocking). Audit failures must never
 * break the main request flow.
 */

import { createAdminClient } from '@/lib/supabase/admin'

type ActorType = 'admin' | 'seller' | 'system' | 'anonymous'
type EventResult = 'success' | 'failure' | 'blocked'

export interface SecurityEventParams {
  actorType:  ActorType
  actorId?:   string   // user_id, vendor_id, or 'system' — never raw phone/email
  action:     string   // e.g. 'seller_login_success', 'phone_reveal', 'rate_limit_exceeded'
  resource?:  string   // e.g. 'order:uuid', 'customer:phoneHash'
  ipAddress?: string
  userAgent?: string
  result:     EventResult
  meta?:      Record<string, string | number | boolean | null>  // no secrets, no raw PII
}

// Pre-defined action constants to prevent typos and enable grep-ability
export const SEC_EVENT = {
  // Authentication
  SELLER_LOGIN_SUCCESS:      'seller_login_success',
  SELLER_LOGIN_FAILURE:      'seller_login_failure',
  SELLER_LOGOUT:             'seller_logout',
  SELLER_SESSION_REVOKED:    'seller_session_revoked',
  SELLER_ALL_SESSIONS_REVOKED: 'seller_all_sessions_revoked',
  SELLER_PASSWORD_RESET:     'seller_password_reset',

  // Authorization
  PERMISSION_DENIED:         'permission_denied',
  RATE_LIMIT_EXCEEDED:       'rate_limit_exceeded',

  // Team management
  TEAM_MEMBER_INVITED:       'team_member_invited',
  TEAM_MEMBER_REMOVED:       'team_member_removed',
  TEAM_ROLE_CHANGED:         'team_role_changed',

  // Customer data access
  CUSTOMER_LIST_ACCESSED:    'customer_list_accessed',
  CUSTOMER_PHONE_REVEALED:   'customer_phone_revealed',
  ABANDONED_ANALYTICS_ACCESSED: 'abandoned_analytics_accessed',
  DATA_EXPORTED:             'data_exported',

  // Payment
  PAYMENT_AMOUNT_MISMATCH:   'payment_amount_mismatch',
  PAYMENT_REPLAY_DETECTED:   'payment_replay_detected',
  PAYMENT_CONFIRMED:         'payment_confirmed',

  // Order operations
  ORDER_CANCELLED:           'order_cancelled',
  ORDER_CANCEL_FAILED:       'order_cancel_failed',
  RETURN_REQUESTED:          'return_requested',

  // Admin
  ADMIN_LOGIN_SUCCESS:       'admin_login_success',
  ADMIN_LOGIN_FAILURE:       'admin_login_failure',
  ADMIN_SESSION_REVOKED:     'admin_session_revoked',
  ADMIN_TOTP_FAILURE:        'admin_totp_failure',
} as const

export async function logSecurityEvent(event: SecurityEventParams): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('security_events').insert({
      actor_type: event.actorType,
      actor_id:   event.actorId   ?? null,
      action:     event.action,
      resource:   event.resource  ?? null,
      ip_address: event.ipAddress ?? null,
      user_agent: event.userAgent ?? null,
      result:     event.result,
      meta:       event.meta      ?? null,
    })
  } catch {
    // Non-blocking — audit failure must never break the main flow
  }
}

/** Convenience wrapper for failure events. */
export async function logSecurityFailure(
  params: Omit<SecurityEventParams, 'result'>,
): Promise<void> {
  return logSecurityEvent({ ...params, result: 'failure' })
}

/** Convenience wrapper for blocked events (rate limit / IP block). */
export async function logSecurityBlock(
  params: Omit<SecurityEventParams, 'result'>,
): Promise<void> {
  return logSecurityEvent({ ...params, result: 'blocked' })
}
