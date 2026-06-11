import { type NextRequest, NextResponse } from 'next/server'
import { verifyAdminToken, decodeAdminToken } from './jwt'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Reads and verifies the admin JWT cookie, then checks the revocation blocklist.
 * Returns null if the request is authorized, or a 401 response if not.
 * Called from route handlers (Node runtime) — not from edge middleware.
 */
export async function requireAdmin(req: NextRequest): Promise<NextResponse | null> {
  const token = req.cookies.get('casbah_admin_token')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await verifyAdminToken(token)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check revocation blocklist — prevents reuse of tokens after logout
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
      // Fail open on DB error — log but allow the request through to avoid lockout
      console.error('[requireAdmin] Revocation check failed')
    }
  }

  return null
}

/**
 * Inserts the token's JTI into the revocation blocklist.
 * Call this on logout before deleting the cookie.
 */
export async function revokeAdminToken(token: string): Promise<void> {
  try {
    const payload = decodeAdminToken(token)
    if (!payload?.jti || !payload.exp) return
    const admin = createAdminClient()
    await admin.from('admin_revoked_tokens').insert({
      jti:        payload.jti,
      expires_at: new Date(payload.exp * 1000).toISOString(),
    })
  } catch {
    console.error('[revokeAdminToken] Failed to revoke token')
  }
}
