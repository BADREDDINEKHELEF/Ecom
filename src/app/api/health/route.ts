import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'

/**
 * GET /api/health
 *
 * Lightweight health check for uptime monitors, load balancers, and CI/CD
 * deployment smoke tests. Returns 200 when critical dependencies are reachable,
 * 503 otherwise.
 *
 * Critical checks:
 *   - Database connectivity via a lightweight Supabase query
 *   - Redis connectivity (only when UPSTASH_REDIS_REST_URL is configured)
 *
 * Response body schema:
 *   {
 *     status: 'ok' | 'degraded',
 *     checks: Record<string, 'ok' | 'fail'>,
 *     latencyMs: number,
 *     buildTimestamp: string | null
 *   }
 */

export interface HealthResponse {
  status: 'ok' | 'degraded'
  checks: Record<string, 'ok' | 'fail'>
  latencyMs: number
  buildTimestamp: string | null
}

const REDIS_PING_TIMEOUT_MS = 3000

async function checkDatabase(): Promise<'ok' | 'fail'> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('store_settings')
      .select('id')
      .eq('id', 1)
      .single()
    return error ? 'fail' : 'ok'
  } catch (err) {
    logger.error('[health] database check failed', { error: err instanceof Error ? err.message : String(err) })
    return 'fail'
  }
}

function isRedisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL) && Boolean(process.env.UPSTASH_REDIS_REST_TOKEN)
}

async function checkRedis(): Promise<'ok' | 'fail' | 'not_configured'> {
  if (!isRedisConfigured()) return 'not_configured'

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REDIS_PING_TIMEOUT_MS)

    const url = `${process.env.UPSTASH_REDIS_REST_URL}/get/__health_probe__?nocache=${Date.now()}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    // Any parseable JSON response means Redis REST is reachable; a 404 on a
    // missing key is still a healthy response.
    return res.ok || res.status === 404 ? 'ok' : 'fail'
  } catch (err) {
    logger.error('[health] redis check failed', { error: err instanceof Error ? err.message : String(err) })
    return 'fail'
  }
}

function getBuildTimestamp(): string | null {
  return process.env.BUILD_TIMESTAMP ?? null
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const start = Date.now()
  const checks: Record<string, 'ok' | 'fail'> = {}

  checks.database = await checkDatabase()

  const redisStatus = await checkRedis()
  if (redisStatus !== 'not_configured') {
    checks.redis = redisStatus
  }

  const criticalOk = checks.database === 'ok' && Object.values(checks).every((v) => v === 'ok')
  const status = criticalOk ? 'ok' : 'degraded'
  const httpStatus = criticalOk ? 200 : 503

  const body: HealthResponse = {
    status,
    checks,
    latencyMs: Date.now() - start,
    buildTimestamp: getBuildTimestamp(),
  }

  logger.info('[GET /api/health]', { status, checks, latencyMs: body.latencyMs })

  return NextResponse.json(body, {
    status: httpStatus,
    headers: {
      // Never cache health checks — monitors need fresh data
      'Cache-Control': 'no-store, no-cache',
    },
  })
}
