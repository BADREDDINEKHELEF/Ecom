import { NextRequest, NextResponse } from 'next/server'
import { copyCookies } from '@/lib/supabase/server'
import {
  getSellerSessions, revokeSellerSession, revokeAllSellerSessions,
} from '@/lib/auth/sellerSessions'
import { logSecurityEvent, SEC_EVENT } from '@/lib/auth/securityEvents'
import { checkPublicRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'

async function requireSeller(
  req: NextRequest,
  response: NextResponse,
  permission: 'sessions:read' | 'sessions:revoke',
): Promise<{ user: { id: string }; vendorId: string } | NextResponse> {
  const result = await requireVendorPermission(req, permission, response)
  if (result instanceof NextResponse) return result
  return { user: result.ctx.user, vendorId: result.ctx.vendor.id }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// GET /api/seller/sessions â€” list active sessions for the current user
export async function GET(req: NextRequest) {
  const response = NextResponse.next()
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'seller_sessions_list')
  if (!rl.allowed) return copyCookies(response, NextResponse.json({ error: 'Trop de requÃªtes.' }, { status: 429 }))

  const seller = await requireSeller(req, response, 'sessions:read')
  if (seller instanceof NextResponse) return seller

  try {
    const sessions = await getSellerSessions(seller.user.id)
    return copyCookies(response, NextResponse.json(sessions))
  } catch (err) {
    logger.error('[GET /api/seller/sessions]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

// DELETE /api/seller/sessions?id=<sessionId|all> â€” revoke one or all sessions
export async function DELETE(req: NextRequest) {
  const response = NextResponse.next()
  const ip = getClientIp(req)
  const rl = await checkPublicRateLimit(ip, 'session_revoke')
  if (!rl.allowed) return copyCookies(response, NextResponse.json({ error: 'Trop de requÃªtes.' }, { status: 429 }))

  const seller = await requireSeller(req, response, 'sessions:revoke')
  if (seller instanceof NextResponse) return seller

  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('id')

  if (!sessionId) return copyCookies(response, NextResponse.json({ error: 'id required' }, { status: 400 }))

  try {
    if (sessionId === 'all') {
      await revokeAllSellerSessions(seller.user.id)
      void logSecurityEvent({
        actorType: 'seller',
        actorId:   seller.user.id,
        action:    SEC_EVENT.SELLER_ALL_SESSIONS_REVOKED,
        ipAddress: ip,
        result:    'success',
      })
      return copyCookies(response, NextResponse.json({ ok: true }))
    }

    if (!UUID_RE.test(sessionId)) {
      return copyCookies(response, NextResponse.json({ error: 'Invalid session id' }, { status: 400 }))
    }

    const ok = await revokeSellerSession(seller.user.id, sessionId)
    if (!ok) return copyCookies(response, NextResponse.json({ error: 'Session introuvable' }, { status: 404 }))

    void logSecurityEvent({
      actorType: 'seller',
      actorId:   seller.user.id,
      action:    SEC_EVENT.SELLER_SESSION_REVOKED,
      resource:  `session:${sessionId}`,
      ipAddress: ip,
      result:    'success',
    })

    return copyCookies(response, NextResponse.json({ ok: true }))
  } catch (err) {
    logger.error('[DELETE /api/seller/sessions]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

