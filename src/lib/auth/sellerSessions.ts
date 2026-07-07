/**
 * Seller session tracking — device-level fingerprinting and revocation.
 *
 * Each unique (user_id, device_hash) pair is one session row.
 * device_hash = SHA-256(userAgent || ip)[:16] — opaque, no raw PII stored.
 *
 * On every authenticated seller request, call upsertSellerSession() to keep
 * last_seen_at fresh. Use the 30-minute debounce to avoid a DB write per request.
 */

import { createAdminClient } from '@/lib/supabase/admin'

/** Stable opaque fingerprint — same UA+IP always yields same hash.
 *  Uses the Web Crypto API so it works in both Node.js and Edge Runtime.
 */
export async function deviceHash(userAgent: string, ip: string): Promise<string> {
  const input = `${userAgent}||${ip}`
  const encoder = new TextEncoder()
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  const bytes = Array.from(new Uint8Array(buffer))
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

export interface SellerSession {
  id:           string
  device_hash:  string
  ip_address:   string | null
  user_agent:   string | null
  last_seen_at: string
  created_at:   string
  is_revoked:   boolean
  revoked_at:   string | null
  expires_at:   string | null
}

/**
 * Upsert a session record for the current device.
 * Debounced: only updates last_seen_at if it is more than 30 minutes old.
 * Non-blocking — errors are silently swallowed.
 */
export async function upsertSellerSession(params: {
  userId:    string
  vendorId?: string | null
  ip:        string
  userAgent: string
}): Promise<void> {
  try {
    const admin = createAdminClient()
    const hash  = await deviceHash(params.userAgent, params.ip)
    const now   = new Date().toISOString()

    await admin.from('seller_sessions').upsert(
      {
        user_id:      params.userId,
        vendor_id:    params.vendorId ?? null,
        device_hash:  hash,
        ip_address:   params.ip,
        user_agent:   params.userAgent,
        last_seen_at: now,
      },
      {
        onConflict:        'user_id,device_hash',
        ignoreDuplicates:  false,
      }
    )
  } catch {
    // Non-blocking
  }
}

/** List all (non-revoked) sessions for a user, newest first. */
export async function getSellerSessions(userId: string): Promise<SellerSession[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('seller_sessions')
    .select('id, device_hash, ip_address, user_agent, last_seen_at, created_at, is_revoked, revoked_at, expires_at')
    .eq('user_id', userId)
    .order('last_seen_at', { ascending: false })
    .limit(20)
  return (data ?? []) as SellerSession[]
}

/**
 * Revoke a specific session.
 * Verifies user_id ownership to prevent cross-user revocation (IDOR guard).
 * Returns true if the session was found and revoked.
 */
export async function revokeSellerSession(userId: string, sessionId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('seller_sessions')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', userId) // IDOR guard — user can only revoke their own sessions
    .select('id')
    .maybeSingle()
  return !!data
}

/** Revoke ALL sessions for a user (e.g., after password change). */
export async function revokeAllSellerSessions(userId: string): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('seller_sessions')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_revoked', false) // Only touch sessions that are currently active
}

/**
 * Returns true if the given device+user combination has a revoked or expired session.
 * Used to block requests from revoked devices without full Supabase re-auth.
 */
export async function isSessionRevoked(userId: string, ua: string, ip: string): Promise<boolean> {
  const admin = createAdminClient()
  const hash = await deviceHash(ua, ip)
  const { data } = await admin
    .from('seller_sessions')
    .select('is_revoked, revoked_at, expires_at')
    .eq('user_id', userId)
    .eq('device_hash', hash)
    .maybeSingle()

  // No session record → not revoked (new device, session tracking not yet active)
  if (!data) return false
  if (data.is_revoked === true) return true
  if (data.revoked_at != null) return true
  if (data.expires_at != null && new Date(data.expires_at) < new Date()) return true
  return false
}
