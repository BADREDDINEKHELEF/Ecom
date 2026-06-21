import { createAdminClient } from '@/lib/supabase/admin'

interface AuditEntry {
  vendorId: string
  action: 'view_customer_list' | 'reveal_phone' | 'view_abandoned' | 'export_csv'
  resourceType: 'customer_list' | 'order' | 'abandoned_cart'
  resourceId?: string
  ipAddress?: string
  userAgent?: string
}

export async function logSellerDataAccess(entry: AuditEntry): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('seller_data_access_log').insert({
      vendor_id:     entry.vendorId,
      action:        entry.action,
      resource_type: entry.resourceType,
      resource_id:   entry.resourceId ?? null,
      ip_address:    entry.ipAddress ?? null,
      user_agent:    entry.userAgent ?? null,
    })
  } catch {
    // Non-blocking — audit failure must never break the API response
  }
}
