import { NextRequest, NextResponse } from 'next/server'
import { writeAuditLog } from '@/lib/auth/auditLog'
import { revokeAdminToken } from '@/lib/auth/adminAuth'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { getAdminCookieName } from '@/cookie'

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'logout', 10, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )
  const ua = req.headers.get('user-agent') ?? 'unknown'

  // Revoke the JWT so it cannot be reused before its 2h natural expiry.
  // revokeAdminToken also marks the admin_sessions row as inactive.
  const token = req.cookies.get(getAdminCookieName())?.value
  if (token) await revokeAdminToken(token)

  await writeAuditLog({ action: 'admin_logout', ip, userAgent: ua, result: 'success' })
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(getAdminCookieName())
  return res
}
