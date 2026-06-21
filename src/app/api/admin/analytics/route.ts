import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { getAdminStats } from '@/lib/supabase/analytics'
import { logger } from '@/lib/logger'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'analytics', 120, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  try {
    const { searchParams } = new URL(req.url)
    const rawDays = parseInt(searchParams.get('days') ?? '30')
    const daysBack = Math.min(365, Math.max(7, Number.isFinite(rawDays) ? rawDays : 30))
    const stats = await getAdminStats(daysBack)
    return NextResponse.json(stats)
  } catch (err) {
    logger.error('[GET /api/admin/analytics]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
