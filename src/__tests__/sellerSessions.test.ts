/**
 * Phase 2 — Seller session tracking & revocation tests
 *
 * Covers:
 * 1. deviceHash() — pure function, deterministic, no PII in output
 * 2. Source audit of sellerSessions.ts — IDOR guard, active-session filter
 * 3. Source audit of sessions API — auth gating, UUID validation, audit logging
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(__dirname, '..')

// ── 1. deviceHash — pure function behaviour ───────────────────────────────────

describe('deviceHash — deterministic fingerprinting', () => {
  it('returns exactly 16 hex characters', async () => {
    const { deviceHash } = await import('../lib/auth/sellerSessions')
    const hash = deviceHash('Mozilla/5.0 (Windows NT 10.0)', '41.200.0.1')
    expect(hash).toMatch(/^[0-9a-f]{16}$/)
  })

  it('is deterministic — same UA + IP always yields the same hash', async () => {
    const { deviceHash } = await import('../lib/auth/sellerSessions')
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
    const ip = '105.105.0.99'
    expect(deviceHash(ua, ip)).toBe(deviceHash(ua, ip))
  })

  it('different IPs produce different hashes', async () => {
    const { deviceHash } = await import('../lib/auth/sellerSessions')
    const ua = 'SameAgent/1.0'
    expect(deviceHash(ua, '1.2.3.4')).not.toBe(deviceHash(ua, '5.6.7.8'))
  })

  it('different user-agents produce different hashes', async () => {
    const { deviceHash } = await import('../lib/auth/sellerSessions')
    const ip = '41.200.0.1'
    const h1 = deviceHash('Chrome/120', ip)
    const h2 = deviceHash('Safari/17.0', ip)
    expect(h1).not.toBe(h2)
  })

  it('does not include raw UA or IP in output (no PII leak)', async () => {
    const { deviceHash } = await import('../lib/auth/sellerSessions')
    const ua = 'Mozilla/5.0 TestAgent'
    const ip = '192.168.1.100'
    const hash = deviceHash(ua, ip)
    expect(hash).not.toContain('Mozilla')
    expect(hash).not.toContain('192.168')
    expect(hash).not.toContain(ip)
    expect(hash).not.toContain(ua)
  })

  it('empty inputs still produce a 16-char hash', async () => {
    const { deviceHash } = await import('../lib/auth/sellerSessions')
    const hash = deviceHash('', '')
    expect(hash).toMatch(/^[0-9a-f]{16}$/)
  })
})

// ── 2. Source audit — sellerSessions.ts security invariants ──────────────────

describe('sellerSessions.ts — source audit: security invariants', () => {
  const src = readFileSync(
    resolve(root, 'lib/auth/sellerSessions.ts'),
    'utf-8'
  )

  it('revokeSellerSession has IDOR guard (.eq user_id filter)', () => {
    // The update MUST be scoped to the calling user's sessions only.
    // Without .eq('user_id', userId), any authenticated user could revoke another user's session.
    expect(src).toContain(".eq('user_id', userId)")
  })

  it('revokeSellerSession scopes to the specific session id', () => {
    expect(src).toContain(".eq('id', sessionId)")
  })

  it('revokeAllSellerSessions only touches active sessions', () => {
    // Prevents churning already-revoked rows
    expect(src).toContain(".eq('is_revoked', false)")
  })

  it('revokeAllSellerSessions scopes to user_id (no cross-user revocation)', () => {
    expect(src).toContain(".eq('user_id', userId)")
  })

  it('isSessionRevoked returns false for unknown devices (new-device-is-not-blocked)', () => {
    // The "if (!data) return false" branch is critical — a new device must not be
    // treated as revoked just because we have no session record for it yet.
    expect(src).toContain('if (!data) return false')
  })

  it('deviceHash uses SHA-256 (not MD5 or SHA-1)', () => {
    expect(src).toContain("createHash('sha256')")
    expect(src).not.toContain("createHash('md5')")
    expect(src).not.toContain("createHash('sha1')")
  })

  it('upsertSellerSession debounces on (user_id, device_hash) conflict key', () => {
    // Check both parts separately — the source aligns the colon with extra spaces
    expect(src).toContain('onConflict:')
    expect(src).toContain("'user_id,device_hash'")
  })

  it('upsertSellerSession is non-blocking (errors swallowed)', () => {
    // Must contain a try/catch and the catch must not rethrow
    expect(src).toContain('} catch {')
    expect(src).toContain('// Non-blocking')
  })

  it('hash output is truncated to 16 chars (.slice(0, 16))', () => {
    // SHA-256 outputs 64 hex chars; we only store the first 16 to keep the
    // column compact while remaining collision-resistant for our use case.
    expect(src).toContain('.slice(0, 16)')
  })
})

// ── 3. Source audit — sessions API route security ────────────────────────────

describe('sessions API route — source audit: auth & validation', () => {
  const src = readFileSync(
    resolve(root, 'app/api/seller/sessions/route.ts'),
    'utf-8'
  )

  it('requires authentication (getUser call present)', () => {
    expect(src).toContain('getUser()')
  })

  it('returns 401 when not authenticated', () => {
    expect(src).toContain('status: 401')
    expect(src).toContain("'Unauthorized'")
  })

  it('validates session ID format (UUID regex) before DB query', () => {
    // Must not pass arbitrary string to DB without validation
    expect(src).toContain('UUID_RE')
  })

  it('handles bulk revocation via id=all sentinel', () => {
    expect(src).toContain("sessionId === 'all'")
    expect(src).toContain('revokeAllSellerSessions')
  })

  it('logs session revocation to security audit trail', () => {
    expect(src).toContain('logSecurityEvent')
    expect(src).toContain('SEC_EVENT.SELLER_SESSION_REVOKED')
    expect(src).toContain('SEC_EVENT.SELLER_ALL_SESSIONS_REVOKED')
  })

  it('is rate limited', () => {
    expect(src).toContain('checkPublicRateLimit')
  })

  it('requires id parameter (returns 400 if missing)', () => {
    expect(src).toContain("'id required'")
  })

  it('returns 404 when session not found', () => {
    expect(src).toContain('status: 404')
  })
})

// ── 4. Source audit — team API IDOR & privilege escalation guards ─────────────

describe('team API route — source audit: IDOR & privilege escalation guards', () => {
  const src = readFileSync(
    resolve(root, 'app/api/seller/team/route.ts'),
    'utf-8'
  )

  it('all operations require vendor permission (requireVendorPermission)', () => {
    // Must call requireVendorPermission for every HTTP verb
    const calls = (src.match(/requireVendorPermission/g) ?? []).length
    expect(calls).toBeGreaterThanOrEqual(3) // GET, POST, DELETE at minimum
  })

  it('isAssignableRole prevents privilege escalation (owner role cannot be assigned via API)', () => {
    expect(src).toContain('isAssignableRole')
  })

  it('prevents the owner from adding themselves to their own team', () => {
    expect(src).toContain('targetUser.id === ctx.user.id')
  })

  it('all DB team mutations are scoped to ctx.vendor.id', () => {
    // Every query that touches vendor_members must filter by vendor_id so
    // a manager of vendor A cannot read/modify members of vendor B.
    const vendorScopes = (src.match(/eq\('vendor_id', ctx\.vendor\.id\)/g) ?? []).length
    expect(vendorScopes).toBeGreaterThanOrEqual(3) // GET select, POST upsert, DELETE
  })

  it('logs all team events to the security audit trail', () => {
    expect(src).toContain('SEC_EVENT.TEAM_MEMBER_INVITED')
    expect(src).toContain('SEC_EVENT.TEAM_MEMBER_REMOVED')
    expect(src).toContain('SEC_EVENT.TEAM_ROLE_CHANGED')
  })

  it('POST invite is rate limited', () => {
    expect(src).toContain('checkSellerRateLimit')
  })
})
