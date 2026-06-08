import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/health
 *
 * Lightweight health check for uptime monitors, load balancers, and CI/CD
 * deployment smoke tests. Returns 200 when the application and its
 * critical dependencies are reachable.
 *
 * Response body schema:
 *   { status: 'ok' | 'degraded' | 'down', checks: Record<string, 'ok'|'fail'>, latencyMs: number }
 */
export async function GET() {
  const start   = Date.now()
  const checks: Record<string, 'ok' | 'fail'> = {}

  // ── 1. Database connectivity ────────────────────────────────────
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('store_settings')
      .select('id')
      .eq('id', 1)
      .single()
    checks.database = error ? 'fail' : 'ok'
  } catch {
    checks.database = 'fail'
  }

  // ── 2. Environment configuration ───────────────────────────────
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ADMIN_SECRET',
    'ADMIN_JWT_SECRET',
    'FIELD_ENCRYPTION_KEY',
  ]
  checks.config = requiredEnvVars.every((v) => Boolean(process.env[v])) ? 'ok' : 'fail'

  // ── Determine overall status ────────────────────────────────────
  const allOk      = Object.values(checks).every((v) => v === 'ok')
  const anyFail    = Object.values(checks).some((v) => v === 'fail')
  const status     = allOk ? 'ok' : anyFail ? 'degraded' : 'ok'
  const httpStatus = status === 'ok' ? 200 : 503

  return NextResponse.json(
    {
      status,
      checks,
      latencyMs: Date.now() - start,
      version:   process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
    },
    {
      status: httpStatus,
      headers: {
        // Never cache health checks — monitors need fresh data
        'Cache-Control': 'no-store, no-cache',
      },
    }
  )
}
