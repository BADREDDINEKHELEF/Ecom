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

// ── Redis-backed JTI validation (used by middleware) ─────────────────────────

function redisConfigured(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN
}

async function redisCommand<T>(command: string, ...args: string[]): Promise<T | null> {
  if (!redisConfigured()) return null
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL!.replace(/\/+$/, '')
  const url = `${baseUrl}/${command}/${args.map(encodeURIComponent).join('/')}`
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      logger.error('[sessions] Redis command failed', { command, args, status: res.status })
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    logger.error('[sessions] Redis command error', { command, args, error: err instanceof Error ? err.message : String(err) })
    return null
  }
}

async function setJtiValid(jti: string, expiresAt: Date): Promise<void> {
  const ttlSeconds = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
  // Upstash REST API: /set/<key>/<value>/EX/<ttl>
  await redisCommand<{ result: string }>('set', jti, 'valid', 'ex', String(ttlSeconds))
}

export async function deleteJti(jti: string): Promise<void> {
  await redisCommand<{ result: number }>('del', jti)
}

export async function isJtiValidInRedis(jti: string): Promise<boolean> {
  const data = await redisCommand<{ result: string | null }>('get', jti)
  return data?.result === 'valid'
}

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
    const { error } = await admin.from('admin_sessions').insert({
      jti,
      device_fingerprint: buildDeviceFingerprint(userAgent, ip),
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expiresAt.toISOString(),
    })
    if (error) throw error
    // Mirror the active JTI in Redis so edge middleware can validate it cheaply.
    await setJtiValid(jti, expiresAt)
  } catch (err) {
    logger.error('[sessions] createSession failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
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
    const { error } = await admin
      .from('admin_sessions')
      .update({
        jti: newJti,
        last_seen_at: new Date().toISOString(),
        expires_at: newExpiresAt.toISOString(),
      })
      .eq('jti', oldJti)
    if (error) throw error
    // Rotate the Redis mirror: old JTI is no longer valid, new one is.
    await deleteJti(oldJti)
    await setJtiValid(newJti, newExpiresAt)
  } catch (err) {
    logger.error('[sessions] rotateSessionJti failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
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
      deleteJti(session.jti),
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
 * Fails CLOSED on DB error: a transient fault causes the counter to be treated
 * as already used, which may temporarily block admin login but eliminates the
 * TOTP replay window that a fail-open policy would create on an induced timeout.
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
  } catch (err) {
    // Fail CLOSED: treat DB errors as "counter already used" to prevent replay
    // attacks that exploit induced timeouts. Alert operator so they can restore
    // the replay-protection table before re-enabling admin logins.
    logger.error('[sessions] isTotpCounterUsed: DB error — failing closed to prevent TOTP replay. Admin login is blocked until the replay-protection table is reachable.', {
      error: err instanceof Error ? err.message : String(err),
      counter,
    })
    void writeAuditLog({
      action: 'totp_replay_table_unavailable',
      meta: { counter, error: err instanceof Error ? err.message : String(err) },
    })
    return true
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
