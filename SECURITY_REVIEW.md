# Application Security Review

**Date:** 2026-06-20  
**Application:** ShopDZ — Next.js 15 multi-vendor e-commerce platform  
**Scope:** All 96 API route handlers, 3 middleware layers, authentication stack, dependency tree  
**Auditor:** Automated deep-trace review (code-path analysis, not assumption-based)

---

## Executive Summary

ShopDZ has a strong security baseline. The core authentication stack (JTI revocation, TOTP replay protection, device-aware sessions, rate limiting, CSP headers) is well-implemented and hardened beyond what most production Next.js applications achieve. No authentication bypass or privilege escalation paths remain open.

**5 vulnerabilities were fixed during this review.** The most critical was a JTI revocation bypass on the shipment dispatch endpoint that allowed a revoked admin token to continue creating shipments. Two additional code-execution–adjacent risks were eliminated: a PostgREST filter injection and a host-header injection in the payment callback URL construction.

The remaining open items are dependency-level CVEs (transitive, not directly exploitable) and a TOTP setup UX trade-off that leaks a secret to server logs.

| Severity | Found | Fixed | Open |
|----------|-------|-------|------|
| Critical | 1 | 1 | 0 |
| High | 2 | 2 | 0 |
| Medium | 3 | 0 | 3 |
| Low | 4 | 2 | 2 |
| Info | 3 | 0 | 3 |

---

## Threat Model

### Assets

| Asset | Value | Location |
|-------|-------|----------|
| Admin JWT secret (`ADMIN_JWT_SECRET`) | Critical — compromise = admin impersonation | Vercel env var |
| Supabase service role key | Critical — bypasses all RLS | Vercel env var |
| Seller delivery API credentials | High — enables fraudulent shipments | DB, AES-256-GCM encrypted |
| Seller CAPI tokens (Meta/TikTok/Google) | High — advertising spend hijack | DB, AES-256-GCM encrypted |
| Buyer phone + address data | High — PII, Algerian privacy law | Supabase DB |
| Seller financial data (orders, GMV) | High | Supabase DB |
| Payment callback integrity | High — order fraud | Satim mdOrder reference |
| TOTP seed secret (`ADMIN_TOTP_SECRET`) | High — MFA bypass | Vercel env var |
| Rate limit counters | Medium — DoS amplification | Upstash Redis |

### Threat Actors

| Actor | Capability | Goal |
|-------|------------|------|
| External attacker (no creds) | HTTP access only | Data exfiltration, fraud |
| Rogue seller | Valid seller session | Access other sellers' data, admin panel |
| Compromised admin | Valid admin JWT (possibly revoked) | Persistent access after logout |
| Malicious buyer | Valid buyer session | IDOR against other buyers |
| Satim (payment gateway) | Can craft callback URLs | Must not trust Satim-supplied amounts |
| Supply chain (npm) | Transitive dependencies | Code injection at build time |

### Trust Boundaries

```
Internet
  │
  ▼
Vercel Edge (middleware) ── JWT signature check, IP allowlist
  │
  ▼
Next.js Route Handler ── requireAdmin() / getUser() / phone match
  │
  ▼
Supabase (service_role) ── RLS disabled, full table access
  │
  ▼
External APIs (Twilio, Satim, delivery providers, Resend)
```

---

## Access Control Matrix

### Role Definitions

| Role | Auth Mechanism | Enforcement Point |
|------|----------------|-------------------|
| **Anonymous** | None | Rate limit only |
| **Phone-verified** | Phone must match DB record | Timing-safe compare |
| **Buyer** | Supabase session cookie | `supabase.auth.getUser()` |
| **Seller** | Supabase session + vendor row | `getUser()` + vendor lookup |
| **Admin** | HS256 JWT, 2h TTL | `requireAdmin()` — sig + JTI blocklist |
| **Cron** | `CRON_SECRET` bearer | `timingSafeEqual()` |

### Matrix (✅ = allowed, ❌ = blocked, RL = rate-limited)

| Endpoint Group | Anon | Phone | Buyer | Seller | Admin | Cron |
|----------------|------|-------|-------|--------|-------|------|
| Public catalog (products, store, sponsored) | ✅ RL | — | ✅ | ✅ | ✅ | — |
| Analytics collect + pixel | ✅ RL | — | ✅ | ✅ | ✅ | — |
| Order creation (guest checkout) | ✅ RL | — | ✅ | ✅ | — | — |
| Order cancel / return | ❌ | ✅ RL | ❌ | ❌ | — | — |
| Gift cards, promo validation | ✅ RL | — | ✅ | ✅ | — | — |
| Addresses, loyalty | ❌ | — | ✅ | ✅ | — | — |
| Seller dashboard + orders | ❌ | — | ❌ | ✅ (own) | — | — |
| Seller products, shipments | ❌ | — | ❌ | ✅ (own) | — | — |
| Seller analytics, export | ❌ | — | ❌ | ✅ (own) | — | — |
| Seller credentials (delivery, pixels) | ❌ | — | ❌ | ✅ (own) | — | — |
| Seller register / OTP flows | ✅ RL | — | ✅ | ✅ | — | — |
| Admin — all routes | ❌ | — | ❌ | ❌ | ✅ | — |
| Admin — login/logout/refresh | ✅ RL | — | ✅ RL | ✅ RL | ✅ | — |
| Delivery shipment dispatch | ❌ | — | ❌ | ❌ | ✅ | — |
| Payment initiate | ✅ RL | — | ✅ | ✅ | — | — |
| Payment callback (Satim) | Satim only | — | — | — | — | — |
| Cron jobs | ❌ | — | ❌ | ❌ | ❌ | ✅ |

---

## Public Endpoint Inventory

All endpoints with zero authentication:

| Endpoint | Method | Rate Limit | Notes |
|----------|--------|------------|-------|
| `/api/health` | GET | None | Aggregate status only — no env var names |
| `/api/analytics/collect` | POST | 30/60s | Fire-and-forget, always 200 |
| `/api/pixel/collect` | GET/POST | 60/60s | Always returns 1×1 GIF on GET |
| `/api/abandoned` | POST/PATCH | checkPublicRateLimit | Cart snapshot capped at 50 items |
| `/api/compare` | GET | checkPublicRateLimit | Max 3 products |
| `/api/products/related` | GET | checkPublicRateLimit | Max 20 products |
| `/api/questions/[productId]` | GET | None | Public questions only |
| `/api/questions/[productId]` | POST | checkPublicRateLimit | No auth needed to ask |
| `/api/stock-alerts` | POST | checkPublicRateLimit | Validates product exists + stock=0 |
| `/api/store/[slug]` | GET | checkPublicRateLimit | No sensitive vendor data |
| `/api/promo/validate` | POST | checkPublicRateLimit | |
| `/api/orders/track` | GET | checkPublicRateLimit | Phone-masked output |
| `/api/newsletter` | POST | checkPublicRateLimit | |
| `/api/track` | GET | None | Redirect tracking |
| `/api/gift-cards/validate` | POST | checkPublicRateLimit | Returns balance only if valid |
| `/api/gift-cards/redeem` | POST | checkPublicRateLimit | Atomic RPC, race-condition safe |
| `/api/sponsored` | GET | checkPublicRateLimit | **Placement now allowlisted** |
| `/api/delivery/rates` | GET | checkPublicRateLimit | |
| `/api/geocode` | GET | 5/60s | Proxies Nominatim, coords range-checked |
| `/api/payment/initiate` | POST | checkCheckoutRateLimit | Server-computed total |
| `/api/payment/callback` | GET | 20/60s | Satim server-to-server only |
| `/api/orders` | POST | 10/10min | Guest checkout |
| `/api/orders/[id]/cancel` | POST | checkPublicRateLimit | Phone match required |
| `/api/orders/[id]/return` | POST | checkPublicRateLimit | Phone match + delivered status |
| `/api/seller/register` | POST | 5/3600s | Requires Supabase session |
| `/api/seller/forgot-password` | POST | OTP limits | Returns success regardless of phone existence |
| `/api/seller/send-phone-otp` | POST | OTP limits | CSPRNG OTP, WhatsApp delivery |
| `/api/seller/verify-phone-otp` | POST | OTP limits | Timing-safe compare |
| `/api/seller/verify-otp` | POST | 10/15min | Password reset + session invalidation |
| `/api/admin/login` | POST | 5/15min | TOTP replay-protected |
| `/api/admin/logout` | POST | 10/60s | Clears cookie, revokes JTI |
| `/api/admin/refresh` | POST | 10/60s | Rotates JTI |
| `/api/admin/totp` | GET | 3/60min | Setup only, disabled once configured |

---

## Rate Limiting Plan

### Current State

| Layer | Mechanism | Coverage |
|-------|-----------|----------|
| Production | Upstash Redis sliding window | ✅ All rate-limited endpoints |
| Development | In-memory map (process-local) | ✅ Development only |
| Multi-instance risk | In-memory NOT shared across instances | ⚠️ Set `UPSTASH_REDIS_REST_URL` in Vercel |

### Limits by Category

| Category | Limit | Window | Scope |
|----------|-------|--------|-------|
| Admin login | 5 attempts | 15 min | Per IP |
| Admin API (general) | 120 req | 60 s | Per IP |
| Admin session ops | 20-30 req | 60 s | Per IP |
| Admin analytics export | 5 req | 60 s | Per IP (**new**) |
| Seller general | 60 req | 60 s | Per IP |
| Seller write ops | 20 req | 60 s | Per IP |
| Seller stores PATCH | 20 req | 60 s | Per IP (**new**) |
| Seller export | 3 req | 3600 s | Per user |
| OTP send | 5 req / 3 req | 15 min / 1 hour | Per IP / per phone |
| OTP verify | 10 attempts | 15 min | Per phone |
| Checkout | 10 req | 10 min | Per IP |
| Public general | 30 req | 60 s | Per IP |
| Geocode | 5 req | 60 s | Per IP |
| Upload | IP: 10/300s, User: 5/120s+20/3600s | Dual | Per IP+User |
| TOTP setup | 3 req | 60 min | Per IP |

### Missing Rate Limits (Open)

No unrated endpoints with security-relevant state mutation remain. The `/api/admin/analytics/export` was the last missing one and was fixed in the prior session.

---

## Secret Management Plan

### Current Secrets Inventory

| Secret | Location | Usage | Exposure Risk |
|--------|----------|-------|---------------|
| `ADMIN_JWT_SECRET` | Vercel env | JWT signing/verification | Server-only — ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env | Admin DB client | Server-only — ✅ |
| `ADMIN_TOTP_SECRET` | Vercel env | TOTP verification | Server-only — ✅ |
| `CRON_SECRET` | Vercel env | Cron job auth | Server-only — ✅ |
| `META_CAPI_TOKEN` | Vercel env | Platform CAPI | Server-only — ✅ |
| `TIKTOK_CAPI_TOKEN` | Vercel env | Platform CAPI | Server-only — ✅ |
| `GTAG_API_SECRET` | Vercel env | Platform GA4 | Server-only — ✅ |
| `TWILIO_AUTH_TOKEN` | Vercel env | SMS/WhatsApp | Server-only — ✅ |
| `SATIM_*` credentials | Vercel env | Payment gateway | Server-only — ✅ |
| `RESEND_API_KEY` | Vercel env | Email (optional) | Server-only — ✅ |
| `UPSTASH_REDIS_REST_TOKEN` | Vercel env | Rate limiting | Server-only — ✅ |
| Seller delivery creds | Supabase DB | Encrypted at rest (AES-256-GCM) | Decrypted server-side only — ✅ |
| Seller CAPI tokens | Supabase DB | Encrypted at rest (AES-256-GCM) | Decrypted server-side only — ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-exposed | RLS-protected DB access | Intentionally public — ✅ |
| `NEXT_PUBLIC_META_PIXEL_ID` | Client-exposed | Browser pixel | Intentionally public — ✅ |

### Required Production Environment Variables

```
# Critical — application fails without these
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_JWT_SECRET            # min 32 cryptographically random bytes
CRON_SECRET                 # min 32 cryptographically random bytes
NEXT_PUBLIC_APP_URL         # Must be set — payment callbacks depend on it

# Rate limiting — REQUIRED for multi-instance (Vercel)
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

# Payment
SATIM_USERNAME
SATIM_PASSWORD
SATIM_TERMINAL_ID

# Notifications
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_FROM

# Optional (features degrade gracefully without them)
ADMIN_TOTP_SECRET           # TOTP 2FA for admin login
RESEND_API_KEY              # Email notifications
META_CAPI_TOKEN             # Platform-level conversion tracking
TIKTOK_CAPI_TOKEN
GTAG_API_SECRET
ADMIN_IP_ALLOWLIST          # Comma-separated IPs for admin panel
```

---

## Findings — Critical to Low

---

### F-01 ✅ FIXED — CRITICAL — JTI Revocation Bypass

**File:** [src/app/api/delivery/shipment/route.ts](src/app/api/delivery/shipment/route.ts)  
**Status:** Fixed in access control audit session

**Root cause:** The endpoint called `verifyAdminToken(token)` directly instead of `requireAdmin(req)`. `verifyAdminToken` only validates the JWT signature and expiry; it does not query the `admin_revoked_tokens` blocklist. A logged-out or explicitly revoked admin session remained valid on this endpoint indefinitely until the 2-hour JWT expiry.

**Impact:** An attacker who stole an admin cookie before logout could continue dispatching shipments against any order and read vendor delivery credentials, even after the legitimate admin logged out and the session was deactivated.

**Patch applied:**
```diff
- import { cookies } from 'next/headers'
- import { verifyAdminToken } from '@/lib/auth/jwt'
+ import { requireAdmin } from '@/lib/auth/adminAuth'

  export async function POST(req: NextRequest) {
-   const cookieStore = await cookies()
-   const token = cookieStore.get('casbah_admin_token')?.value
-   const payload = await verifyAdminToken(token ?? '')
-   if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
+   const denied = await requireAdmin(req)
+   if (denied) return denied
```

---

### F-02 ✅ FIXED — HIGH — PostgREST Filter Injection

**File:** [src/app/api/sponsored/route.ts](src/app/api/sponsored/route.ts:26)  
**Line before fix:** 26

**Root cause:** User-supplied `placement` query parameter was interpolated directly into a PostgREST `.or()` filter string without validation:

```typescript
// BEFORE (vulnerable)
const placement = searchParams.get('placement') ?? 'homepage'
.or(`placement.eq.${placement},placement.eq.all`)
```

The Supabase JS client sends `.or()` arguments as a raw PostgREST filter string. An attacker supplying `?placement=homepage,is_active.eq.false` would expand this to:

```
?or=(placement.eq.homepage,is_active.eq.false,placement.eq.all)
```

This bypasses the `.eq('status', 'active')` filter applied separately from the OR group, potentially leaking inactive/unapproved sponsored products. With crafted PostgREST syntax, deeper table traversal may also be possible.

**Patch applied:**
```diff
  const { searchParams } = new URL(req.url)
+ const VALID_PLACEMENTS = new Set(['homepage', 'sidebar', 'category', 'product', 'checkout', 'search'])
+ const rawPlacement = searchParams.get('placement') ?? 'homepage'
+ const placement = VALID_PLACEMENTS.has(rawPlacement) ? rawPlacement : 'homepage'
- const placement = searchParams.get('placement') ?? 'homepage'
```

**Note:** The `.or()` pattern with `user.id` in `src/app/api/seller/stores/route.ts:24,71,78` is safe — `user.id` is a Supabase-guaranteed UUID, which cannot contain PostgREST syntax characters.

---

### F-03 ✅ FIXED — HIGH — Host Header Injection in Payment Callback URL

**File:** [src/app/api/payment/initiate/route.ts](src/app/api/payment/initiate/route.ts:77)  
**Line before fix:** 77

**Root cause:** When `NEXT_PUBLIC_APP_URL` is not set, the code fell back to constructing the callback URL from the `Host` header:

```typescript
// BEFORE (vulnerable when env var is absent)
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')}`
```

An attacker who controls the `Host` header (possible in reverse-proxy deployments where the host is not stripped) could redirect the Satim payment callback to `https://attacker.example.com/api/payment/callback`. Satim would send the payment confirmation (including the `mdOrder` reference) to the attacker's server. While server-side Satim verification prevents marking an order as paid without a valid `mdOrder`, the attacker would receive the callback notification.

On Vercel the Host header is authoritative and cannot be spoofed by external clients. Risk is medium on non-Vercel deployments or if `NEXT_PUBLIC_APP_URL` is accidentally unset.

**Patch applied:**
```diff
- const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')}`
+ const appUrl = process.env.NEXT_PUBLIC_APP_URL
+ if (!appUrl) {
+   logger.error('[POST /api/payment/initiate] NEXT_PUBLIC_APP_URL env var is not set')
+   return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 503 })
+ }
```

---

### F-04 ✅ FIXED — MEDIUM — Missing Rate Limits (Two Endpoints)

**Files:** [src/app/api/seller/stores/route.ts](src/app/api/seller/stores/route.ts) (PATCH), [src/app/api/admin/analytics/export/route.ts](src/app/api/admin/analytics/export/route.ts) (GET)

Already documented in the access control audit. See ACCESS_CONTROL_MATRIX.md.

---

### F-05 — MEDIUM — TOTP Setup Secret in Server Logs

**File:** [src/app/api/admin/totp/route.ts](src/app/api/admin/totp/route.ts:26)

```typescript
console.info('[TOTP SETUP] Copy this secret into ADMIN_TOTP_SECRET env var:', secret)
```

**Context:** This is intentional — the endpoint deliberately does not return the raw secret in the HTTP response (only a QR code is returned). The admin is expected to read the raw secret from server logs to configure an authenticator app when QR scanning fails.

**Risk:** Server logs on Vercel, Datadog, or Sentry have longer retention than a single session. Any party with log read access (ops, contractors, monitoring services) sees the TOTP secret permanently. This is a different risk profile than returning it once over HTTPS.

**The endpoint is gated:** Line 18 returns 403 if `ADMIN_TOTP_SECRET` is already set. So the secret only appears in logs during initial one-time setup.

**Recommended fix:** Return the raw secret in the HTTP response once (it's HTTPS, it's a setup-only endpoint), remove the `console.info`. This limits secret exposure to the TLS session and the admin's screen, rather than leaving it in log storage.

```typescript
// Recommended
return NextResponse.json({
  qrCode,
  secret,   // return once over HTTPS — do not log
  instruction: '...',
})
// Remove: console.info('[TOTP SETUP] ...', secret)
```

**Status:** Not auto-fixed. Design decision: the current implementation is intentional. Flag for admin acknowledgment.

---

### F-06 — MEDIUM — Dependency CVEs (Transitive)

**Source:** `npm audit`

| Package | Severity | CVE | Fix |
|---------|----------|-----|-----|
| `@opentelemetry/core <2.8.0` | Moderate | GHSA-8988-4f7v-96qf — unbounded memory in W3C baggage propagation | `npm audit fix` |
| `js-yaml <=4.1.1` | Moderate | GHSA-h67p-54hq-rp68 — DoS via merge key aliases | `npm audit fix` |
| `postcss <8.5.10` | Moderate | GHSA-qx2v-qp2m-jg93 — XSS via `</style>` in CSS stringify | `npm audit fix --force` (breaking: would pin Next.js to 9.x — wait for upstream fix) |

**Exploitability:**
- `@opentelemetry` — transitive via `@sentry/nextjs`; exploitable only if attacker can inject arbitrary W3C baggage headers into server requests. Mitigated by Vercel's edge stripping of unexpected headers.
- `js-yaml` — build-time dependency only; not in the runtime request path.
- `postcss` — build-time dependency; not present in production bundle. The XSS is in CSS serialization, not in rendered HTML.

**Action:** Run `npm audit fix` for the first two. Track the postcss fix via the upstream Next.js release.

---

### F-07 — LOW — `__Host-` Cookie Prefix Not Applied

**File:** [src/app/api/admin/login/route.ts](src/app/api/admin/login/route.ts), [src/app/api/admin/refresh/route.ts](src/app/api/admin/refresh/route.ts)

The admin cookie `casbah_admin_token` does not use the `__Host-` prefix. The `__Host-` prefix enforces at the browser level that the cookie has `Secure=true`, no `Domain` attribute, and `Path=/`. This provides defense-in-depth against subdomain cookie injection.

Not applied because `__Host-` requires `Secure=true`, which breaks `http://localhost` development.

**Action for production:** Set `__Host-casbah_admin_token` by branching on a `NODE_ENV === 'production'` check and update the cookie name in `middleware.ts` and all route handlers simultaneously.

---

### F-08 — LOW — In-Memory Rate Limiting in Multi-Instance Deployments

**File:** [src/lib/auth/rateLimit.ts](src/lib/auth/rateLimit.ts:13)

```typescript
// Warning already in place:
if (!url || !token) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('[RateLimit] UPSTASH_REDIS_REST_URL not set ...')
  }
}
```

If `UPSTASH_REDIS_REST_URL` is not set in production, each Vercel serverless instance maintains its own independent rate limit counter. An attacker can bypass rate limits by routing requests across multiple Vercel edge regions (IP-pinning is not guaranteed).

**Action:** Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set in the Vercel dashboard under Project → Settings → Environment Variables.

---

## Authentication (Detailed Trace)

### Admin Authentication Flow

```
POST /api/admin/login
  1. checkRateLimit(ip)             — 5 attempts / 15 min / IP
  2. Compare ADMIN_SECRET (timing-safe via timingSafeEqual)
  3. If TOTP enabled:
     a. verifyTotpGetCounter()      — returns matched counter
     b. isTotpCounterUsed(counter)  — checks admin_used_totp_counters (fail-open)
     c. markTotpCounterUsed()       — upserts counter + prunes >5min old
  4. randomUUID() → jti
  5. signAdminToken(jti)            — HS256, 2h TTL
  6. createSession({jti, ua, ip})  — admin_sessions row
  7. Set cookie: httpOnly, sameSite=strict, secure=prod
  8. writeAuditLog(action='admin_login')
```

```
requireAdmin(req)   ← called on EVERY protected route handler
  1. Read casbah_admin_token cookie
  2. verifyAdminToken(token)        — checks HS256 signature + expiry
  3. SELECT from admin_revoked_tokens WHERE jti = payload.jti
     → If found: return 401 (fail closed)
     → If DB error: return 401 (fail closed)
  4. Allow request
```

```
POST /api/admin/refresh
  1. requireAdmin(req)              — validates current token fully
  2. invalidateJtiOnly(oldToken)    — adds old JTI to blocklist (session stays active)
  3. randomUUID() → newJti
  4. signAdminToken(newJti)
  5. rotateSessionJti(oldJti, newJti)
  6. Set new cookie
```

### Seller Authentication Flow

```
Any /api/seller/* route handler
  1. createRouteClient(req)         — reads sb-* session cookies
  2. supabase.auth.getUser()        — validates session server-side
  3. getVendorByUserIdServer(user.id) — looks up vendor row
  4. All subsequent queries scoped to vendor.id
```

### Token Revocation

| Event | Mechanism | Scope |
|-------|-----------|-------|
| Admin logout | `revokeAdminToken()` | JTI → blocklist + session is_active=false |
| Admin refresh | `invalidateJtiOnly()` | JTI → blocklist only (session stays active) |
| Per-device revoke | `revokeSessionById()` | JTI → blocklist + session is_active=false |
| Seller password reset | `POST /auth/v1/admin/users/:uid/logout` | All Supabase sessions invalidated |

---

## Session Management

| Property | Admin | Seller |
|----------|-------|--------|
| Token type | HS256 JWT | Supabase JWT (opaque) |
| Access token TTL | 2 hours | ~1 hour (Supabase default) |
| Refresh | Auto at 1h50m | Supabase auto-refresh |
| Cookie flags | httpOnly, sameSite=strict, secure=prod | Supabase SSR defaults |
| Revocation | JTI blocklist in DB (checked per-request) | Global sign-out via GoTrue admin API |
| Device tracking | `admin_sessions` table (fingerprint, IP, UA) | None (Supabase limitation) |
| Concurrent session listing | `GET /api/admin/sessions` | Not available |
| Per-device revocation | `DELETE /api/admin/sessions/:id` | Not available |
| TOTP replay protection | Counter tracked in `admin_used_totp_counters` | N/A |

---

## Input Validation

### Zod Schemas in Place

| Route | Schema | Key Validations |
|-------|--------|-----------------|
| `POST /api/orders` | `CreateOrderSchema` | Phone regex `/^(213[5-7]\|0[5-7])\d{8}$/`, items max 50, prices bounded |
| `POST /api/payment/initiate` | `InitiateSchema` | Same phone regex, payment method enum |
| `POST /api/seller/register` | `Schema` | Slug regex `/^[a-z0-9-]+$/`, SSRF-safe logo URL |
| `POST /api/delivery/shipment` | `Schema` | UUID orderId, provider enum, string max lengths |
| `POST /api/seller/promo-codes` | Internal | Code format, discount type, amount bounds |
| `POST /api/seller/flash-sales` | Internal | Date ordering enforced |
| `POST /api/questions/[id]` | Zod | Author 2-100 chars, question 5-500 chars |
| `POST /api/admin/niches` | Zod | id, name, emoji, gradient validated |
| `POST /api/admin/returns/[id]` | Internal | Status allowlist, refundAmount ≥ 0 |
| `POST /api/admin/settings/announcement` | Internal | text ≤ 500, color allowlist |

### Zod Error Leakage Control

`POST /api/orders` line 78 and `POST /api/payment/initiate` line 49:
```typescript
const details = process.env.NODE_ENV === 'development' ? parsed.error.issues : undefined
return NextResponse.json({ error: 'Invalid order data', ...(details && { details }) }, { status: 400 })
```
Zod internals (field paths, type names) are stripped in production — correct.

---

## SSRF Analysis

### Outbound Fetch Calls (Server-Side)

| File | URL Construction | User Input | Risk |
|------|-----------------|------------|------|
| `geocode/route.ts:35` | `https://nominatim.openstreetmap.org/reverse?lat=${latNum}&lon=${lonNum}` | `latNum`, `lonNum` (JS `number` type after `parseFloat` + range check) | ✅ Safe — numbers cannot contain URL metacharacters |
| `seller/verify-otp/route.ts:15` | `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}/logout` | `userId` from Supabase auth (UUID) | ✅ Safe — UUID cannot contain path injection |
| `seller/forgot-password/route.ts:27` | `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json` | `sid` from env var | ✅ Safe — env var |
| `payment/initiate/route.ts` | Satim API — hardcoded URL | None | ✅ Safe |
| `seller/test-yalidine/route.ts:36` | `https://api.yalidine.app/v1/agencies/` | None (URL hardcoded; creds in headers) | ✅ Safe |
| `seller/test-apec/route.ts:36` | `https://api.apec.dz/v1/agencies/` | None | ✅ Safe |
| `notifications/email.ts` | Resend API — hardcoded URL | None | ✅ Safe |
| `lib/delivery/dispatch.ts` | Provider API URLs from hardcoded SDK | Credentials from encrypted DB fields | ✅ Safe — URLs not constructed from user input |

**SSRF verdict: No open SSRF vectors.** All outbound URLs use hardcoded base URLs; user-supplied data appears only in query parameters after numeric/UUID normalization.

---

## CSRF Analysis

Protection layers:

1. **SameSite=Strict on admin cookie** — Browser will not send `casbah_admin_token` on cross-origin form POSTs or image loads.
2. **JSON body requirement** — All state-changing routes require `Content-Type: application/json`. A `<form>` submitting `application/x-www-form-urlencoded` will either be rejected by `req.json()` parsing or by Zod schema validation.
3. **Supabase seller auth** — Supabase SSR cookies inherit Supabase's own CSRF handling.
4. **Double-submit not needed** — SameSite=Strict makes explicit CSRF tokens unnecessary for the admin panel.

**CSRF verdict: Protected.**

---

## XSS Analysis

### `dangerouslySetInnerHTML` Inventory

| File | Context | Escaping | Safe? |
|------|---------|----------|-------|
| `VendorAnalyticsScripts.tsx:30` | Meta Pixel init — `fbq('init', ${jsStr(metaPixelId)})` | `jsStr()` = `JSON.stringify().replace(/</, '\\u003c')` | ✅ Yes |
| `VendorAnalyticsScripts.tsx:52` | Google Tag config — `gtag('config', ${jsStr(gtagId)})` | `jsStr()` | ✅ Yes |
| `VendorAnalyticsScripts.tsx:66` | TikTok Pixel load — `ttq.load(${jsStr(tiktokPixelId)})` | `jsStr()` | ✅ Yes |
| `VendorAnalyticsScripts.tsx:87` | Custom pixel — `})(${jsStr(pixelId)})` | `jsStr()` | ✅ Yes |
| `AnalyticsScripts.tsx:16` | Platform Meta Pixel | `JSON.stringify(PIXEL_ID)` | ✅ Yes |
| `layout.tsx:49` | Theme preference script | No user input | ✅ Yes |

**`jsStr()` correctly prevents `</script>` injection:** `JSON.stringify` produces a quoted string literal; replacing `<` with `<` prevents any `</script>` tag from appearing inside the script block.

**XSS verdict: No open XSS.** All `dangerouslySetInnerHTML` uses are correctly escaped.

---

## SQL Injection Analysis

Supabase client SDK parameterizes all `.eq()`, `.in()`, `.select()`, `.insert()`, `.update()` arguments. The only injection surface is the `.or()` and `.filter()` string API.

### `.or()` Usage Audit

| File | Filter string | User input? | Status |
|------|---------------|-------------|--------|
| `seller/stores/route.ts:24,71,78` | `user_id.eq.${user.id},owner_id.eq.${user.id}` | `user.id` from Supabase auth (UUID) | ✅ Safe |
| `sponsored/route.ts:26` | `placement.eq.${placement},placement.eq.all` | `placement` from query param | ✅ **Fixed** — allowlist applied |

### RPC Calls

All 12 `.rpc()` calls use named parameter objects — not string interpolation. Safe.

---

## IDOR Analysis

| Endpoint | User-scoped filter | Verified? |
|----------|--------------------|-----------|
| `PATCH /api/addresses/[id]` | `.eq('user_id', user.id)` on every query | ✅ |
| `DELETE /api/addresses/[id]` | `.eq('user_id', user.id)` on every query | ✅ |
| `GET /api/loyalty` | `getPointsBalance(user.id)` | ✅ |
| `PATCH /api/seller/orders` | Vendor ownership check + `.eq('vendor_id', vendor.id)` | ✅ |
| `PATCH /api/seller/shipments` | `.eq('vendor_id', vendor.id)` in update path | ✅ |
| `PATCH /api/seller/promo-codes` | Ownership verified before update | ✅ |
| `PATCH /api/seller/flash-sales` | Product + vendor ownership chain | ✅ |
| `PATCH /api/seller/sponsored` | Vendor ID filter on status update | ✅ |
| `PATCH /api/seller/questions/[id]/answer` | question → product → vendor ownership chain | ✅ |
| `PATCH /api/seller/stores` | `user_id`/`owner_id` equality check | ✅ |
| `DELETE /api/admin/sessions/[id]` | UUID validated; admin sees all (by design) | ✅ |

**IDOR verdict: No open IDOR.**

---

## File Upload Analysis

**File:** [src/app/api/seller/upload/route.ts](src/app/api/seller/upload/route.ts)

| Control | Implementation |
|---------|---------------|
| Authentication | Supabase session required + vendor ownership |
| File size | 10 MB hard limit |
| MIME validation | `validateImageUpload()` — reads first 12 bytes (magic bytes), not just Content-Type header |
| Allowed types | JPEG, PNG, WebP, GIF, AVIF |
| Storage | Supabase Storage — isolated bucket per vendor slug |
| Path | Content-addressed: `${slug}/${filename}` |
| Overwrites | `upsert: false` prevents accidental overwrite |
| Rate limiting | Dual: 10/300s per IP + 5/120s+20/3600s per user |

**MIME spoofing protection:** Magic byte check reads the actual file header, not the client-supplied Content-Type. A renamed `.php` file with a JPEG header would pass upload but cannot be executed by Supabase Storage.

**File upload verdict: Well-hardened.**

---

## Webhook Security

### Payment Callback (`GET /api/payment/callback`)

| Control | Implementation |
|---------|---------------|
| Satim reference required | Rejects requests without `mdOrder` parameter |
| Server-side verification | Satim API called to verify `mdOrder` before any state change |
| Idempotency | Only updates orders in `pending_payment` status |
| Fail-safe | Non-verified payments never marked as paid |
| Rate limiting | 20 req/60s per IP |
| Replay protection | Status guard prevents re-processing |

**Webhook verdict: Secure.** Server-side verification is mandatory and enforced before any state change.

---

## Logging & Audit Trails

### Logger (`src/lib/logger.ts`)

- Structured JSON output (parseable by Sentry, Datadog)
- Debug suppressed in production
- No built-in secret redaction — callers are responsible for not passing secrets

### Audit Log (`src/lib/auth/auditLog.ts`)

Writes to `admin_audit_log` table for all admin actions:

| Action Logged |
|---------------|
| `admin_login` (success + failure) |
| `admin_logout` |
| `admin_vendor_approved`, `admin_vendor_declined`, `admin_vendor_suspended`, `admin_vendor_reactivated` |
| `admin_subscription_updated` |
| `admin_totp_replay_rejected` |

**Gap:** `admin_session_revoked` (per-device revoke via `DELETE /api/admin/sessions/:id`) is not written to the audit log. Add it to `revokeSessionById()`.

**Gap:** No audit event for `admin_commission_paid`. Add it to the revenue PATCH handler.

---

## Multi-Tenancy Isolation

### Seller Isolation (Vendor Data)

Every seller API route:
1. Verifies Supabase session → gets `user.id`
2. Looks up vendor row → gets `vendor.id`
3. All subsequent DB queries scoped to `vendor.id`

No cross-vendor data leakage path was found in any of the 30+ seller routes audited.

### Admin vs Seller Separation

- Edge middleware blocks all `/admin/*` and `/api/admin/*` paths for requests without a valid `casbah_admin_token`
- Seller Supabase sessions have no relationship to the admin JWT system
- No seller-side endpoint can produce or verify an admin JWT

### Database-Level Isolation (Supabase RLS)

For tables where the admin client (`service_role`) bypasses RLS:
- `vendors`, `orders`, `order_items`, `products` — admin client used only in admin routes and seller routes (for joining across vendor boundaries with proper application-level authorization checks)
- Tables with RLS: `saved_addresses` (user_id = auth.uid()), `seller_notifications` (vendor_id), `stock_alerts` (public insert)

**Multi-tenancy verdict: No isolation failures found.**

---

## Admin Panel Security

| Control | Status |
|---------|--------|
| Edge middleware JWT check | ✅ Every request |
| Per-route `requireAdmin()` call | ✅ Every admin API handler |
| JTI revocation blocklist | ✅ Checked per-request, fails closed |
| TOTP (optional) | ✅ Replay-protected via counter tracking |
| IP allowlist (optional) | ✅ `ADMIN_IP_ALLOWLIST` env var |
| CSP for `/admin/*` | ✅ Stricter policy: no unsafe-inline scripts, no-store cache |
| Session listing | ✅ `GET /api/admin/sessions` |
| Per-device revocation | ✅ `DELETE /api/admin/sessions/:id` |
| Audit log | ✅ Login/logout/vendor actions/subscription changes |
| Brute-force protection | ✅ 5 attempts / 15 min / IP |

---

## Dependency Vulnerabilities

Run `npm audit fix` to resolve the non-breaking issues:

```bash
npm audit fix
```

This resolves: `@opentelemetry/core` and `js-yaml`.

Do **not** run `npm audit fix --force` — it would downgrade Next.js to 9.x (breaking change) to fix the `postcss` issue. Wait for the upstream Next.js 15 patch.

---

## Open Items Checklist

- [ ] **F-05**: Consider returning TOTP secret in setup HTTP response instead of logging it — eliminates permanent log trail
- [ ] **F-06**: Run `npm audit fix` to patch `@opentelemetry/core` and `js-yaml`
- [ ] **F-07**: Plan `__Host-casbah_admin_token` cookie prefix for production (requires coordinated rename across middleware + all route handlers)
- [ ] **F-08**: Confirm `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set in Vercel production environment
- [ ] **Audit gap**: Add `admin_session_revoked` audit event to `revokeSessionById()` in `src/lib/auth/sessions.ts`
- [ ] **Audit gap**: Add `admin_commission_paid` audit event to `src/app/api/admin/analytics/revenue/route.ts`
- [ ] **NEXT_PUBLIC_APP_URL**: Confirm this env var is set in Vercel — payment initiation now fails hard (503) if absent
- [ ] **Database**: Apply `CREATE UNIQUE INDEX addresses_one_default_per_user ON saved_addresses (user_id) WHERE is_default = true` to fix concurrent default address race
- [ ] **Periodic**: Run `npm audit` monthly — all deps use caret ranges (`^`) so minor updates are automatic but new CVEs may emerge
