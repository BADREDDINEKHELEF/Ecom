import { type NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken, decodeAdminToken } from './jwt'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { getAdminCookieName } from '@/cookie'
import { deleteJti } from './sessions'

/**
 * Reads and verifies the admin JWT cookie, then checks the JTI revocation
 * blocklist. Returns null when authorised, or a 401 response when not.
 * Called from route handlers (Node runtime) — not from edge middleware.
 *
 * Fails closed: if the revocation DB check throws, the request is denied.
 * This prevents a stolen token from being usable during a DB outage.
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const token = req.cookies.get(getAdminCookieName())?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyAdminToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (payload.jti) {
    try {
      const admin = createAdminClient()
      const { data } = await admin
        .from('admin_revoked_tokens')
        .select('jti')
        .eq('jti', payload.jti)
        .maybeSingle()
      if (data !== null) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    } catch {
      logger.error('[requireAdmin] Revocation check failed — denying request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return null
}

/**
 * Full revocation — called on logout and remote session revocation.
 *   1. Adds the JTI to the revocation blocklist (token stops working immediately)
 *   2. Marks the admin_sessions row is_active = false (device tracking)
 *
 * Do NOT call this during token refresh — use invalidateJtiOnly() instead,
 * which invalidates the old JTI without deactivating the session row.
 */
export async function revokeAdminToken(token: string): Promise<void> {
  try {
    const payload = decodeAdminToken(token)
    if (!payload?.jti || !payload.exp) return
    const admin = createAdminClient()
    await Promise.all([
      admin.from('admin_revoked_tokens').insert({
        jti:        payload.jti,
        expires_at: new Date(payload.exp * 1000).toISOString(),
      }),
      admin.from('admin_sessions').update({ is_active: false }).eq('jti', payload.jti),
      deleteJti(payload.jti),
    ])
  } catch {
    logger.error('[revokeAdminToken] Failed to revoke token')
  }
}

/**
 * JTI-only invalidation — called during token refresh.
 * Adds the old JTI to the blocklist so it cannot be reused, but does NOT
 * deactivate the session row. The caller then updates the session row with
 * the new JTI via rotateSessionJti().
 *
 * Returns the old JTI so the caller can pass it to rotateSessionJti,
 * or null if decoding fails.
 */
export async function invalidateJtiOnly(token: string): Promise<string | null> {
  try {
    const payload = decodeAdminToken(token)
    if (!payload?.jti || !payload.exp) return null
    const admin = createAdminClient()
    await Promise.all([
      admin.from('admin_revoked_tokens').insert({
        jti:        payload.jti,
        expires_at: new Date(payload.exp * 1000).toISOString(),
      }),
      deleteJti(payload.jti),
    ])
    return payload.jti
  } catch {
    logger.error('[invalidateJtiOnly] Failed to invalidate JTI')
    return null
  }
}
