/**
 * Admin session management.
 *
 * Each admin login creates one row in admin_sessions keyed by the token's JTI.
 * On refresh the JTI is rotated in-place — the session row stays alive.
 * On logout / device revocation the JTI is added to admin_revoked_tokens
 * AND the session row is marked is_active = false.
 *
 * The TOTP replay functions live here as well because they need the same
 * service_role DB client and share the "admin auth infrastructure" concern.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from '@/lib/auth/auditLog'
import { createHash } from 'crypto'
import { logger } from '@/lib/logger'

// ── Device fingerprinting ────────────────────────────────────────────────────

/**
 * Returns the first 16 hex chars of SHA-256("ua||ip").
 * Identifies a browser+device without storing raw PII in the session record.
 */
export function buildDeviceFingerprint(userAgent: string, ip: string): string {
  return createHash('sha256').update(`${userAgent}||${ip}`).digest('hex').slice(0, 16)
}

// ── Session lifecycle ────────────────────────────────────────────────────────

/** Inserts a new session row on admin login. */
export async function createSession({
  jti,
  userAgent,
  ip,
  expiresAt,
}: {
  jti: string
  userAgent: string
  ip: string
  expiresAt: Date
}): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('admin_sessions').insert({
      jti,
      device_fingerprint: buildDeviceFingerprint(userAgent, ip),
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    })
  } catch (err) {
    logger.error('[sessions] createSession failed', {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

/**
 * Updates the JTI and expiry on an existing session row (called on token refresh).
 * The session stays is_active = true — only the token identifier changes.
 */
export async function rotateSessionJti(
  oldJti: string,
  newJti: string,
  newExpiresAt: Date,
): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin
      .from('admin_sessions')
      .update({
        jti: newJti,
        last_seen_at: new Date().toISOString(),
        expires_at: newExpiresAt.toISOString(),
      })
      .eq('jti', oldJti)
  } catch (err) {
    logger.error('[sessions] rotateSessionJti failed', {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

export interface SessionRecord {
  id: string
  deviceFingerprint: string
  ip: string
  userAgent: string | null
  createdAt: string
  lastSeenAt: string
  expiresAt: string
}

/** Returns all currently active, non-expired sessions ordered newest first. */
export async function listActiveSessions(): Promise<SessionRecord[]> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('admin_sessions')
      .select('id, device_fingerprint, ip_address, user_agent, created_at, last_seen_at, expires_at')
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('last_seen_at', { ascending: false })
    return (data ?? []).map((s) => ({
      id:                s.id,
      deviceFingerprint: s.device_fingerprint,
      ip:                s.ip_address,
      userAgent:         s.user_agent,
      createdAt:         s.created_at,
      lastSeenAt:        s.last_seen_at,
      expiresAt:         s.expires_at,
    }))
  } catch {
    return []
  }
}

/**
 * Revokes a specific session by UUID:
 *   1. Adds its JTI to admin_revoked_tokens so the token stops working immediately
 *   2. Marks the session is_active = false
 * Returns false if the session is not found or is already inactive.
 */
export async function revokeSessionById(sessionId: string): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { data: session } = await admin
      .from('admin_sessions')
      .select('jti, expires_at, is_active')
      .eq('id', sessionId)
      .maybeSingle()

    if (!session || !session.is_active) return false

    await Promise.all([
      admin.from('admin_revoked_tokens').insert({
        jti:        session.jti,
        expires_at: session.expires_at,
      }),
      admin.from('admin_sessions').update({ is_active: false }).eq('id', sessionId),
    ])
    void writeAuditLog({ action: 'admin_session_revoked', meta: { sessionId } })
    return true
  } catch (err) {
    logger.error('[sessions] revokeSessionById failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}

// ── TOTP replay protection ───────────────────────────────────────────────────

/**
 * Returns true if this TOTP counter (floor(unix_time / 30)) has already been
 * used for a successful admin login — indicating a replay attempt.
 * Fails open on DB error to avoid locking out the admin over a transient fault.
 */
export async function isTotpCounterUsed(counter: number): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('admin_used_totp_counters')
      .select('counter')
      .eq('counter', counter)
      .maybeSingle()
    return data !== null
  } catch {
    return false
  }
}

/**
 * Records the counter as used and prunes stale entries (> 5 min old).
 * Non-fatal: a failure here does not block the login from completing.
 */
export async function markTotpCounterUsed(counter: number): Promise<void> {
  try {
    const admin = createAdminClient()
    await admin.from('admin_used_totp_counters').upsert({ counter })
    const cutoff = counter - 10  // 10 × 30 s = 5 min — safely expired counters
    if (cutoff > 0) {
      await admin.from('admin_used_totp_counters').delete().lt('counter', cutoff)
    }
  } catch {
    // non-fatal — prefer availability over strict replay protection on DB failure
  }
}
