import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { getAdminStats } from '@/lib/supabase/analytics'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

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
