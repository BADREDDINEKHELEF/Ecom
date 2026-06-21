import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { createAdminClient } from '@/lib/supabase/admin'
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
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)
    const days = Math.min(90, Math.max(7, parseInt(searchParams.get('days') ?? '7')))
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabase
      .from('analytics_events')
      .select('metadata, created_at')
      .eq('event', 'search')
      .gte('created_at', since.toISOString())

    if (error) throw error

    // Aggregate search terms
    const termMap: Record<string, { count: number; totalResults: number; resultsCount: number; zeroResultCount: number }> = {}
    for (const row of data ?? []) {
      const query = (row.metadata as Record<string, unknown>)?.query
      if (typeof query !== 'string' || !query.trim()) continue
      const term = query.trim().toLowerCase().slice(0, 100)
      const results = Number((row.metadata as Record<string, unknown>)?.results_count ?? -1)
      if (!termMap[term]) termMap[term] = { count: 0, totalResults: 0, resultsCount: 0, zeroResultCount: 0 }
      termMap[term].count++
      if (results >= 0) { termMap[term].totalResults += results; termMap[term].resultsCount++ }
      if (results === 0) termMap[term].zeroResultCount++
    }

    const terms = Object.entries(termMap)
      .map(([term, d]) => ({
        term,
        count:           d.count,
        avgResults:      d.resultsCount > 0 ? Math.round(d.totalResults / d.resultsCount) : 0,
        zeroResultCount: d.zeroResultCount,
        zeroResultPct:   d.count > 0 ? Math.round((d.zeroResultCount / d.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50)

    const zeroResultTerms = terms.filter((t) => t.zeroResultCount > 0)
      .sort((a, b) => b.zeroResultCount - a.zeroResultCount)
      .slice(0, 20)

    return NextResponse.json({ terms, zeroResultTerms, totalSearches: (data ?? []).length, days })
  } catch (err) {
    logger.error('[GET /api/admin/analytics/search]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
