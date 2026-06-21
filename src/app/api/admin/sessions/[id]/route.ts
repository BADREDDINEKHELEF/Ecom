import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/adminAuth'
import { revokeSessionById } from '@/lib/auth/sessions'
import { checkAdminApiRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// DELETE /api/admin/sessions/[id] — revoke a specific admin session.
// Adds the session's current JTI to the revocation blocklist (token stops
// working on the next request) and marks the session is_active = false.
// If the admin revokes their own current session they are effectively logged out.
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const ip = getClientIp(req)
  const rl = await checkAdminApiRateLimit(ip, 'sessions_write', 20, 60)
  if (!rl.allowed) return NextResponse.json(
    { error: 'Trop de requêtes.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
  )

  const { id } = await props.params
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 })
  }

  const ok = await revokeSessionById(id)
  if (!ok) {
    return NextResponse.json(
      { error: 'Session not found or already revoked' },
      { status: 404 }
    )
  }
  return NextResponse.json({ ok: true })
}
