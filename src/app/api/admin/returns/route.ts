import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { logger } from '@/lib/logger'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'returns_read', 120, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('return_requests')
      .select('*, orders(full_name, phone, wilaya, total)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error
    return NextResponse.json({ returns: data ?? [] })
  } catch (err) {
    logger.error('[GET /api/admin/returns]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
