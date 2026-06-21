# Authentication & Credential Handling — Security Review

**Date:** 2026-06-20  
**Scope:** Admin panel JWT auth · Seller Supabase auth · OTP / password-reset flow  
**Status:** Implemented

---

## 1. Current State (before this review)

### Admin panel (`/admin/*`)

| Property | Value |
|----------|-------|
| Token type | HS256 JWT signed with `ADMIN_JWT_SECRET` |
| Expiry | 2 hours (`ADMIN_TOKEN_MAX_AGE_SECONDS`) |
| Cookie | `casbah_admin_token`, `httpOnly`, `sameSite=strict`, `secure` in production |
| MFA | Optional TOTP (RFC 6238, SHA-1, 6-digit, 30 s) |
| Token revocation | JTI blocklist in `admin_revoked_tokens` (checked on every request) |
| Token rotation | Old JTI revoked before new token issued on `/api/admin/refresh` |
| Brute-force protection | 5 attempts / 15 min / IP via in-memory or Upstash sliding window |
| Audit log | Login success / failure / logout written to `admin_audit_log` |
| Edge middleware | JWT signature verified at Cloudflare/Vercel edge before route handlers |
| IP allowlist | Optional (`ADMIN_IP_ALLOWLIST` env var) |
| TOTP replay | **None** — a captured code could be reused within the 90 s window |
| Device tracking | **None** — no record of which browser/device holds an active session |
| Session listing | **None** — impossible to see or revoke a specific device session |

### Seller auth (Supabase)

| Property | Value |
|----------|-------|
| Token type | Supabase-managed JWT (opaque to application code) |
| Expiry | Supabase default (typically 1 hour access + refresh token) |
| Session validation | `supabase.auth.getUser()` on every seller API call (server-side) |
| Password reset | OTP via WhatsApp → `admin.updateUserById(uid, { password })` |
| Session invalidation on password change | **None** — existing sessions remained valid after reset |
| Device tracking | None (Supabase does not expose per-device sessions in the SSR client) |

### Cookie configuration

| Attribute | Admin cookie | Gap |
|-----------|-------------|-----|
| `HttpOnly` | ✓ | — |
| `Secure` | ✓ in production | — |
| `SameSite=Strict` | ✓ | — |
| `Path` | `/` (required — both `/admin` and `/api/admin` need it) | Acceptable |
| `__Host-` prefix | ✗ | Breaking in dev (HTTP) — document-only recommendation |

---

## 2. Security Risks

### R1 — TOTP replay attack (High)
**Impact:** An attacker who observes or intercepts a valid TOTP code (e.g. via shoulder surfing, keylogger, or phishing proxy) can reuse it for up to 90 seconds (the ±1-window tolerance).  
**Likelihood:** Low in isolation; medium in combination with credential phishing.

### R2 — No device-aware session tracking (Medium)
**Impact:** If a token cookie is stolen (XSS, network intercept on misconfigured proxy, malware), there is no way to enumerate active sessions, no way to revoke a specific device, and no visibility into where the admin panel is being accessed from.  
**Likelihood:** Low (cookie is `HttpOnly` which blocks XSS reads), but the blast radius of a stolen token is higher without revocation.

### R3 — Seller sessions survive password reset (High)
**Impact:** If a seller's account is compromised, the attacker can continue using their existing session even after the legitimate owner resets the password via OTP. The window of continued access equals the Supabase refresh token lifetime.  
**Likelihood:** Medium — credential stuffing and session hijacking are common.

### R4 — `console.error` with unstructured error objects (Low)
**Impact:** Some catch blocks logged raw Error objects (`console.error('[x]', err)`) rather than using the structured `logger`. In a Sentry/Datadog integration, raw Error objects can include stack traces and context that should be redacted.  
**Likelihood:** Low — Vercel logs are not public, but structured logging is an ops hygiene requirement.

### R5 — Raw Supabase error messages in HTTP responses (Medium) — **Fixed in previous session**
`admin/abandoned/route.ts` was forwarding `error.message` (which can contain table/column names) directly to HTTP responses. Fixed.

---

## 3. Recommended State

| Requirement | Mechanism | Status |
|-------------|-----------|--------|
| Short-lived access tokens | 2 h JWT, auto-refreshed at 1 h 50 m | ✅ Already implemented |
| Rotating refresh tokens | Old JTI revoked before new token issued | ✅ Already implemented |
| Token revocation on logout | JTI inserted into `admin_revoked_tokens` | ✅ Already implemented |
| Token revocation on device revoke | JTI inserted into blocklist + session deactivated | ✅ **Implemented in this review** |
| TOTP replay protection | Used counters tracked in `admin_used_totp_counters` | ✅ **Implemented in this review** |
| Device-aware session tracking | `admin_sessions` table; one row per login, JTI rotated on refresh | ✅ **Implemented in this review** |
| Active session listing | `GET /api/admin/sessions` | ✅ **Implemented in this review** |
| Per-device session revocation | `DELETE /api/admin/sessions/:id` | ✅ **Implemented in this review** |
| Session invalidation on password change | Supabase GoTrue `POST /auth/v1/admin/users/:uid/logout` | ✅ **Implemented in this review** |
| Structured error logging | All `console.error` → `logger.error` with `err.message` only | ✅ **Implemented in this review** |
| Secure cookie config | `httpOnly`, `sameSite=strict`, `secure=true` in production | ✅ Already implemented |
| `__Host-` cookie prefix | Enforces `secure + path=/` at browser level | ⚠️ Recommended for production (breaks HTTP dev) |

---

## 4. Implementation Plan

### Phase 1 — DB schema (migration 040)
Two new tables with `DISABLE ROW LEVEL SECURITY` (service_role access only):

```
admin_sessions            — one row per login session, JTI rotated on refresh
admin_used_totp_counters  — TOTP counters used in successful logins (TTL: 5 min)
```

### Phase 2 — Library layer
- `src/lib/auth/sessions.ts` (new) — `createSession`, `rotateSessionJti`, `listActiveSessions`, `revokeSessionById`, `isTotpCounterUsed`, `markTotpCounterUsed`
- `src/lib/auth/totp.ts` — add `verifyTotpGetCounter` (returns matched counter or null)
- `src/lib/auth/jwt.ts` — `signAdminToken(jti?)` accepts a pre-generated JTI
- `src/lib/auth/adminAuth.ts` — `revokeAdminToken` now deactivates session + blocklists JTI; new `invalidateJtiOnly` for rotation
- `src/lib/auth/auditLog.ts` — replace `console.error` with `logger.error`

### Phase 3 — Route handlers
- `admin/login` — TOTP replay check + session creation
- `admin/refresh` — `invalidateJtiOnly` + `rotateSessionJti` (session stays active)
- `admin/logout` — unchanged (delegates to updated `revokeAdminToken`)
- `admin/sessions` (new) — GET list
- `admin/sessions/[id]` (new) — DELETE revoke

### Phase 4 — Seller password reset
- `seller/verify-otp` — call Supabase GoTrue admin endpoint to sign out all sessions after password change

---

## 5. Code Changes

### New files
| File | Purpose |
|------|---------|
| `supabase/migration_040_auth_sessions.sql` | DB tables + cleanup function |
| `src/lib/auth/sessions.ts` | All session management + TOTP replay functions |
| `src/app/api/admin/sessions/route.ts` | GET — list active sessions |
| `src/app/api/admin/sessions/[id]/route.ts` | DELETE — revoke session by UUID |

### Modified files
| File | Change |
|------|--------|
| `src/lib/auth/totp.ts` | Added `verifyTotpGetCounter` |
| `src/lib/auth/jwt.ts` | `signAdminToken(jti?)` — optional pre-generated JTI |
| `src/lib/auth/adminAuth.ts` | `revokeAdminToken` deactivates session; `invalidateJtiOnly` for refresh; `console.error` → `logger.error` |
| `src/lib/auth/auditLog.ts` | `console.error` → `logger.error` |
| `src/app/api/admin/login/route.ts` | TOTP replay check + session creation |
| `src/app/api/admin/refresh/route.ts` | Session rotation via `invalidateJtiOnly` + `rotateSessionJti` |
| `src/app/api/admin/logout/route.ts` | Updated comment (was "8h", now "2h") |
| `src/app/api/seller/verify-otp/route.ts` | `signOutAllUserSessions` call after password update |

### Key invariants preserved
- `requireAdmin()` is unchanged — JTI blocklist check remains the enforcement mechanism
- Edge middleware is unchanged — fast JWT-only check at CDN layer
- The refresh route no longer calls `revokeAdminToken` (which deactivates the session); it calls `invalidateJtiOnly` then `rotateSessionJti` instead
- All session operations are non-fatal (fail-open) except the TOTP replay check, which fails-open on DB error to avoid locking out the admin

---

## 6. Migration Risks

### Risk 1 — Existing admin sessions are not tracked (Low impact)
Sessions created before migration 040 have no row in `admin_sessions`. These sessions remain fully functional — the JTI revocation blocklist is unchanged and is the enforcement mechanism. The sessions simply won't appear in the session listing until the admin logs out and logs back in.

**Mitigation:** The refresh route creates a new session record when `oldJti` is null (pre-tracking token), so sessions start appearing after the first scheduled refresh (≈ 1 h 50 m).

### Risk 2 — Supabase GoTrue sign-out endpoint availability (Low impact)
`POST /auth/v1/admin/users/:uid/logout` is a GoTrue admin REST endpoint. If the Supabase version in use does not expose it, the call fails silently. The password has already been changed at that point, so the only consequence is that existing sessions survive until their natural expiry.

**Mitigation:** The call is wrapped in a try/catch and is explicitly non-fatal. Monitor Supabase logs after deploying to confirm the endpoint responds 200.

### Risk 3 — TOTP replay table DB availability (Negligible)
`isTotpCounterUsed` fails-open on DB error (returns `false` — allows login). This means a DB outage during login would disable replay protection temporarily.

**Mitigation:** Acceptable trade-off — fail-open prevents locking the admin out during an outage. The ±1 window means a code is only replayable for ≤ 90 seconds even without this protection.

### Risk 4 — `admin_sessions.jti UNIQUE` constraint on concurrent refresh (Low)
If a refresh request is sent twice simultaneously (e.g. race between two browser tabs), the second request's `rotateSessionJti` update will target a JTI that was already rotated by the first. The update becomes a no-op (0 rows affected), so no error occurs and the second token is valid.

**Mitigation:** The session listing may show a stale JTI temporarily. The JTI blocklist prevents the first token from being reused, so there is no security impact.

### Risk 5 — Cookie naming (`__Host-` prefix) not yet applied
The `__Host-` prefix would enforce browser-level guarantees (no domain attribute, path must be `/`, must be secure). It is not applied because it requires `Secure=true`, which breaks local HTTP development.

**Recommendation:** Add to deployment checklist: enable `__Host-casbah_admin_token` in production by setting a `NEXT_PUBLIC_IS_PROD` flag and branching the cookie name. Rename the cookie in the middleware and all route handlers simultaneously.

---

## 7. Post-Deployment Checklist

- [ ] Run `migration_040_auth_sessions.sql` in Supabase SQL editor
- [ ] Verify `GET /api/admin/sessions` returns `{ sessions: [], currentJti: '...' }` after login
- [ ] Log in from a second browser → confirm two sessions appear
- [ ] Delete the second session → confirm that browser gets 401 on next request
- [ ] Reset a seller password → confirm Supabase logs show sign-out event for that user
- [ ] (Optional) Enable TOTP and attempt to submit the same code twice → confirm second attempt is rejected
- [ ] Set up a pg_cron job or Supabase Edge Function cron calling `cleanup_old_admin_sessions()` and `cleanup_expired_revoked_tokens()` daily
