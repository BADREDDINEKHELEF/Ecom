import { NextRequest, NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/auth/auditLog'
import { revokeAdminToken } from '@/lib/auth/adminAuth'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'
import { getAdminCookieName, ADMIN_COOKIE_NAME } from '@/cookie'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const rl = await checkAdminApiRateLimit(ip, 'logout', 10, 60)
    if (!rl.allowed) return NextResponse.json(
      { error: 'Trop de requêtes.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
    )
    const ua = req.headers.get('user-agent') ?? 'unknown'

    const token = req.cookies.get(getAdminCookieName())?.value
    if (token) await revokeAdminToken(token)

    await writeAuditLog({ action: 'admin_logout', ip, userAgent: ua, result: 'success' })
    const res = NextResponse.json({ ok: true })
    // Delete both the current (possibly __Host-) name and the legacy name so
    // the transition to the prefixed cookie is clean.
    res.cookies.delete(getAdminCookieName())
    res.cookies.delete(ADMIN_COOKIE_NAME)
    return res
  } catch (err) {
    logger.error('[POST /api/admin/logout]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
