import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// 1 point per 100 DA spent (1 point = 1 DA at redemption)
const POINTS_PER_100_DA = 1

export async function getPointsBalance(userId: string): Promise<number> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('user_points')
      .select('points_balance')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw error
    return (data as { points_balance: number } | null)?.points_balance ?? 0
  } catch (err) {
    logger.error('[loyalty] getPointsBalance failed', { error: err instanceof Error ? err.message : String(err) })
    return 0
  }
}

export async function awardPoints(userId: string, orderId: string, orderTotal: number): Promise<void> {
  const delta = Math.floor(orderTotal / 100) * POINTS_PER_100_DA
  if (delta <= 0) return

  try {
    const supabase = createAdminClient()
    // Atomic upsert via RPC: INSERT ... ON CONFLICT DO SET += delta
    // Prevents the double-credit bug from the old read-modify-write pattern.
    await supabase.rpc('award_loyalty_points', {
      p_user_id:  userId,
      p_order_id: orderId,
      p_delta:    delta,
      p_reason:   `Commande ${orderId.slice(0, 8).toUpperCase()}`,
    })
  } catch (err) {
    logger.error('[loyalty] awardPoints failed', { error: err instanceof Error ? err.message : String(err) })
  }
}

export async function redeemPoints(userId: string, points: number): Promise<boolean> {
  if (points <= 0) return false
  try {
    const supabase = createAdminClient()
    // Atomic UPDATE WHERE points_balance >= points via RPC — no separate read, no race window.
    const { data, error } = await supabase.rpc('redeem_loyalty_points', {
      p_user_id: userId,
      p_points:  points,
    })
    if (error) throw error
    return Boolean(data)
  } catch (err) {
    logger.error('[loyalty] redeemPoints failed', { error: err instanceof Error ? err.message : String(err) })
    return false
  }
}
