import { createAdminClient } from './admin'
import { normalizePhone } from '@/lib/utils/phone'

export interface PromoCode {
  id:             string
  code:           string
  discount_type:  'percentage' | 'fixed'
  discount_value: number
  min_order:      number
  max_uses:       number | null
  uses_count:     number
  expires_at:     string | null
  is_active:      boolean
  created_at:     string
}

export async function validatePromoCode(
  code: string,
  orderTotal: number,
  userId?: string,
  phone?: string,
  email?: string | null
): Promise<
  | { valid: true; promo: PromoCode; discountAmount: number }
  | { valid: false; message: string }
> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('promo_codes')
    .select('id,code,discount_type,discount_value,min_order,max_uses,uses_count,expires_at,is_active,one_per_buyer,created_at')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single()

  if (error || !data) return { valid: false, message: 'invalid' }

  const promo = data as PromoCode & { one_per_buyer?: boolean }

  if (promo.expires_at && new Date(promo.expires_at) < new Date())
    return { valid: false, message: 'expired' }

  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses)
    return { valid: false, message: 'maxed' }

  if (promo.one_per_buyer) {
    let usedOrder: { id: string } | null = null
    if (userId) {
      const { data } = await supabase
        .from('orders')
        .select('id')
        .eq('promo_code_id', promo.id)
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
      usedOrder = data
    } else if (phone || email) {
      const normalizedPhone = phone ? normalizePhone(phone) : null
      const filters: string[] = []
      if (normalizedPhone) filters.push(`phone.eq.${normalizedPhone}`)
      if (email) filters.push(`email.eq.${email.toLowerCase()}`)
      const { data } = await supabase
        .from('orders')
        .select('id')
        .eq('promo_code_id', promo.id)
        .or(filters.join(','))
        .limit(1)
        .maybeSingle()
      usedOrder = data
    }
    if (usedOrder) {
      return { valid: false, message: 'already_used' }
    }
  }

  if (orderTotal < promo.min_order)
    return { valid: false, message: 'min_order' }

  const discountAmount =
    promo.discount_type === 'percentage'
      ? Math.round((orderTotal * promo.discount_value) / 100)
      : Math.min(promo.discount_value, orderTotal)

  return { valid: true, promo, discountAmount }
}

/**
 * Atomically increments the promo use count using a DB-level row lock
 * (see increment_promo_uses function in migration_003).
 * Returns false if the promo is already maxed out (concurrent order edge case).
 */
export async function incrementPromoUses(promoId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('increment_promo_uses', {
    promo_id: promoId,
  })
  if (error) {
    console.error('[incrementPromoUses] RPC failed:', error.message)
    return false
  }
  return Boolean(data)
}

export async function getAllPromoCodes(): Promise<PromoCode[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('promo_codes')
    .select('id,code,discount_type,discount_value,min_order,max_uses,uses_count,expires_at,is_active,created_at')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return (data ?? []) as PromoCode[]
}

export async function upsertPromoCode(
  promo: Omit<PromoCode, 'id' | 'uses_count' | 'created_at'>
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('promo_codes').upsert({
    ...promo,
    code: promo.code.toUpperCase().trim(),
  })
  if (error) throw error
}

export async function togglePromoCode(id: string, isActive: boolean): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('promo_codes')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw error
}

export async function deletePromoCode(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('promo_codes').delete().eq('id', id)
  if (error) throw error
}
