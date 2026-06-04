import { createAdminClient } from '@/lib/supabase/admin'

export type AuditAction =
  | 'admin_login_success'
  | 'admin_login_failure'
  | 'admin_logout'
  | 'admin_page_visit'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'order_status_updated'

export async function writeAuditLog({
  action,
  ip,
  userAgent,
  result,
  meta,
}: {
  action: AuditAction
  ip: string
  userAgent: string
  result: 'success' | 'failure'
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
    console.error('[AuditLog] write failed')
  }
}
