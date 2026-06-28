import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import {
  getSellerSessions, revokeSellerSession, revokeAllSellerSessions,
} from '@/lib/auth/sellerSessions'
import { logSecurityEvent, SEC_EVENT } from '@/lib/auth/securityEvents'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// GET /api/seller/sessions — list active sessions for the current user
export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'seller_sessions_list')
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 })

  const supabase = createRouteClient(req)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sessions = await getSellerSessions(user.id)
    return NextResponse.json(sessions)
  } catch (err) {
    logger.error('[GET /api/seller/sessions]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/seller/sessions?id=<sessionId|all> — revoke one or all sessions
export async function DELETE(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'session_revoke')
  if (!rl.allowed) return NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 })

  const supabase = createRouteClient(req)
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('id')

  if (!sessionId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    if (sessionId === 'all') {
      await revokeAllSellerSessions(user.id)
      void logSecurityEvent({
        actorType: 'seller',
        actorId:   user.id,
        action:    SEC_EVENT.SELLER_ALL_SESSIONS_REVOKED,
        ipAddress: ip,
        result:    'success',
      })
      return NextResponse.json({ ok: true })
    }

    if (!UUID_RE.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid session id' }, { status: 400 })
    }

    const ok = await revokeSellerSession(user.id, sessionId)
    if (!ok) return NextResponse.json({ error: 'Session introuvable' }, { status: 404 })

    void logSecurityEvent({
      actorType: 'seller',
      actorId:   user.id,
      action:    SEC_EVENT.SELLER_SESSION_REVOKED,
      resource:  `session:${sessionId}`,
      ipAddress: ip,
      result:    'success',
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error('[DELETE /api/seller/sessions]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
