import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export type AuditAction =
  | 'admin_login_success'
  | 'admin_login_failure'
  | 'admin_logout'
  | 'admin_page_visit'
  | 'admin_session_revoked'
  | 'admin_commission_paid'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'order_status_updated'
  | 'vendor_approved'
  | 'vendor_declined'
  | 'vendor_suspended'
  | 'vendor_reactivated'
  | 'vendor_verified'
  | 'subscription_approved'
  | 'subscription_rejected'
  | 'subscription_updated'

export async function writeAuditLog({
  action,
  ip = 'server',
  userAgent = 'server',
  result = 'success',
  meta,
}: {
  action: AuditAction
  ip?: string
  userAgent?: string
  result?: 'success' | 'failure'
  meta?: Record<string, unknown>
}) {
  try {
    const supabase = createAdminClient()
    await supabase.from('admin_audit_log').insert({
      action,
      ip_address: ip,
      user_agent: userAgent,
      result,
      meta: meta ?? null,
    })
  } catch {
    // Never throw — audit log must not break the main flow
    logger.error('[AuditLog] write failed')
  }
}
