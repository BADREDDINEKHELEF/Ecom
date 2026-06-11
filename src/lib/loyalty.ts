import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

// 1 point per 100 DA spent (1 point = 1 DA at redemption)
const POINTS_PER_100_DA = 1

export async function getPointsBalance(userId: string): Promise<number> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('user_points')
    .select('points_balance')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.points_balance ?? 0
}

export async function awardPoints(userId: string, orderId: string, orderTotal: number): Promise<void> {
  const delta = Math.floor(orderTotal / 100) * POINTS_PER_100_DA
  if (delta <= 0) return

  try {
    const supabase = createAdminClient()
    // Upsert balance row
    await supabase.from('user_points').upsert(
      { user_id: userId, points_balance: delta, lifetime_points: delta, updated_at: new Date().toISOString() },
      {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      }
    )
    // Use RPC or manual increment if upsert doesn't merge — use raw SQL via rpc
    // Fallback: read-modify-write (acceptable at low concurrency)
    const { data } = await supabase
      .from('user_points')
      .select('points_balance, lifetime_points')
      .eq('user_id', userId)
      .single()
    if (data) {
      await supabase
        .from('user_points')
        .update({
          points_balance:  (data.points_balance  ?? 0) + delta,
          lifetime_points: (data.lifetime_points ?? 0) + delta,
          updated_at:      new Date().toISOString(),
        })
        .eq('user_id', userId)
    }
    // Log transaction
    await supabase.from('points_transactions').insert({
      user_id:  userId,
      order_id: orderId,
      delta,
      reason:   `Commande ${orderId.slice(0, 8).toUpperCase()}`,
    })
  } catch (err) {
    logger.error('[loyalty] awardPoints failed', { error: err instanceof Error ? err.message : String(err) })
  }
}

export async function redeemPoints(userId: string, points: number): Promise<boolean> {
  if (points <= 0) return false
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('user_points')
      .select('points_balance')
      .eq('user_id', userId)
      .single()

    if (!data || data.points_balance < points) return false

    await supabase
      .from('user_points')
      .update({ points_balance: data.points_balance - points, updated_at: new Date().toISOString() })
      .eq('user_id', userId)

    await supabase.from('points_transactions').insert({
      user_id: userId,
      delta:   -points,
      reason:  'Utilisation en caisse',
    })

    return true
  } catch (err) {
    logger.error('[loyalty] redeemPoints failed', { error: err instanceof Error ? err.message : String(err) })
    return false
  }
}
