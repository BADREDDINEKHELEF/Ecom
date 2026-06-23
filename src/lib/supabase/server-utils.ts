import { createAdminClient } from './admin'

/**
 * Checks whether a vendor can add another product based on their active
 * subscription plan's max_products limit.
 * Returns { allowed: true } when under limit, { allowed: false, count, limit }
 * when at or over the limit.
 * A limit of null/0 means unlimited.
 */
export async function checkVendorProductLimit(
  vendorId: string
): Promise<{ allowed: boolean; count: number; limit: number | null }> {
  const supabase = createAdminClient()

  // Count existing products for this vendor
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('vendor_id', vendorId)
  const currentCount = count ?? 0

  // Get vendor's active subscription plan
  const { data: vendor } = await supabase
    .from('vendors')
    .select('subscription_plan_id, subscription_status, subscription_expires_at')
    .eq('id', vendorId)
    .single()

  if (!vendor) return { allowed: true, count: currentCount, limit: null }

  // Expired or no subscription — cap at 10 products (free trial)
  const isActive =
    vendor.subscription_status === 'active' &&
    vendor.subscription_plan_id &&
    (!vendor.subscription_expires_at || new Date(vendor.subscription_expires_at) > new Date())

  if (!isActive) {
    const FREE_LIMIT = 10
    return { allowed: currentCount < FREE_LIMIT, count: currentCount, limit: FREE_LIMIT }
  }

  // Get plan's max_products
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('max_products')
    .eq('id', vendor.subscription_plan_id)
    .single()

  const limit = plan?.max_products && plan.max_products > 0 ? plan.max_products : null
  return { allowed: limit === null || currentCount < limit, count: currentCount, limit }
}
