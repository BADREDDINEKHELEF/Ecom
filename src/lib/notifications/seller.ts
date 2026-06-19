import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

export interface SellerNotification {
  id:         string
  vendor_id:  string
  type:       string
  title:      string
  body:       string | null
  link:       string | null
  is_read:    boolean
  created_at: string
}

export async function createSellerNotification(opts: {
  vendorId: string
  type:     string
  title:    string
  body?:    string
  link?:    string
}): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('seller_notifications').insert({
      vendor_id: opts.vendorId,
      type:      opts.type,
      title:     opts.title,
      body:      opts.body ?? null,
      link:      opts.link ?? null,
    })
  } catch (err) {
    logger.error('[seller notification] create failed', { error: err instanceof Error ? err.message : String(err) })
  }
}

export async function getSellerNotifications(
  vendorId: string,
  limit = 20,
): Promise<SellerNotification[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('seller_notifications')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as SellerNotification[]
}

export async function getUnreadCount(vendorId: string): Promise<number> {
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('seller_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('vendor_id', vendorId)
    .eq('is_read', false)
  return count ?? 0
}

export async function markNotificationRead(id: string, vendorId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('seller_notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('vendor_id', vendorId)
}

export async function markAllRead(vendorId: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('seller_notifications').update({ is_read: true })
    .eq('vendor_id', vendorId).eq('is_read', false)
}
