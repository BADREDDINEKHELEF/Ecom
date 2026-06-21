import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { decodeAdminToken } from '@/lib/auth/jwt'
import { listActiveSessions } from '@/lib/auth/sessions'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

// GET /api/admin/sessions — list all active admin sessions with device details.
// The response includes a `isCurrent` flag so the UI can highlight the session
// the admin is currently using without exposing the raw JTI.
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'sessions_read', 30, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  // Decode the current token to determine which session is "this device"
  const token = req.cookies.get('casbah_admin_token')?.value
  const currentJti = token ? (decodeAdminToken(token)?.jti ?? null) : null

  const sessions = await listActiveSessions()
  return NextResponse.json({ sessions, currentJti })
}
