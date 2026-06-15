# ShopDZ Security Audit Report
Date: 2026-06-15  
Auditor: Claude Code (Automated)  
Scope: Full codebase — API routes, auth, Supabase RLS, input validation, secrets, CSP, payment flow

---

## Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 1 | 1 | 0 |
| HIGH | 3 | 3 | 0 |
| MEDIUM | 3 | 3 | 0 |
| LOW | 0 | — | — |
| **Total** | **7** | **7** | **0** |

**All criticals and highs: FIXED in this session.**

---

## Fixed Issues

| # | Severity | Category | File | Description | Fix Applied |
|---|----------|----------|------|-------------|-------------|
| 1 | CRITICAL | Secret Exposure | `src/app/api/debug/role/route.ts` | Unauthenticated GET endpoint that returns the first 20 chars of `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the response body. No auth, no rate limit — any internet user could call it. | Deleted the entire `/api/debug/` directory. |
| 2 | HIGH | Mass Assignment | `src/app/api/admin/promo-codes/route.ts` | POST handler did `supabase.from('promo_codes').insert(body)` where `body = await req.json()` — raw unvalidated JSON directly inserted. PATCH had the same issue. An admin-credentialed attacker could inject arbitrary columns (`uses_count`, `created_at`, internal IDs). | Added strict Zod schemas (`CreateSchema`, `UpdateSchema`, `DeleteSchema`) for all 4 HTTP methods. Only explicitly whitelisted fields are passed to Supabase. Error messages from DB are no longer forwarded to the client. |
| 3 | HIGH | Race Condition | `src/app/api/gift-cards/redeem/route.ts` | Read-modify-write pattern for balance decrement: read balance → compute new balance → write. Under concurrent requests (e.g. two tabs submitting simultaneously), two threads could both read balance=500, both compute 250, both write 250 — net result: 500 DZD deducted twice from a 500 DZD card. | Replaced with a single atomic `UPDATE ... WHERE balance >= deduct RETURNING balance` query. The DB performs the arithmetic in one statement with row-level locking. If the row is concurrently modified such that balance drops below the deduction amount, the WHERE clause matches 0 rows and the handler returns 409. |
| 4 | HIGH | Information Disclosure | `src/app/api/seller/upload/route.ts` | The catch block returned the raw internal error message to the client: `return NextResponse.json({ error: msg }, { status: 500 })`. This could expose Supabase bucket configuration errors, env var names, internal paths, or SDK error details. | Changed to `return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })`. Full error is still logged server-side via `logger.error`. |
| 5 | MEDIUM | Input Validation / Stored XSS | `src/app/api/orders/[orderId]/return/route.ts` | The `photos` field was accepted as an arbitrary array of strings with only `slice(0, 5)` applied. An attacker could store `javascript:alert(1)` URIs, `data:` URIs, or URLs pointing to attacker-controlled servers (which admins/sellers then load as `<img src>`). Also, `reason` and `phone` had ad-hoc validation without Zod. | Added Zod schema for the full request body. Added `isSafePhotoUrl()` validator that (1) requires `https:` protocol, (2) only permits hostnames ending in `.supabase.co` or `.supabase.in` — the storage domain where seller-uploaded photos actually live. Any other URLs are silently filtered out. |
| 6 | MEDIUM | Missing Rate Limit | `src/app/api/payment/callback/route.ts` | Payment callback endpoint had no rate limiting. An attacker could hammer it with fabricated `orderId` + `mdOrder` pairs, causing excessive Satim API calls and potentially triggering account lockout at the payment provider. | Added `checkPublicRateLimit(ip, 'payment_callback')` — 30 calls/min per IP, consistent with other public endpoints. Excess requests get 429 with a warning logged. |
| 7 | MEDIUM | Clickjacking | `next.config.ts` | `X-Frame-Options: SAMEORIGIN` allowed the checkout and payment pages to be embedded in iframes from the same origin — a prerequisite for same-origin clickjacking attacks. The CSP `connect-src` also lacked `wss://` for Supabase Realtime and the CAPI endpoints added in the previous session. | Changed to `X-Frame-Options: DENY` across all routes. Expanded `connect-src` to include `wss://*.supabase.co`, `https://graph.facebook.com`, `https://business-api.tiktok.com`, `https://www.google-analytics.com`. |

---

## Verified GOOD (no fix needed)

| Area | Status | Detail |
|------|--------|--------|
| Auth — getUser vs getSession | ✅ PASS | All API routes use `.auth.getUser()`. No `.getSession()` calls found in route handlers. |
| Server-side price calculation | ✅ PASS | `createOrder()` in `orders.ts` fetches product prices from DB and ignores client-supplied prices entirely. Comments in the code confirm this is intentional. |
| Admin middleware | ✅ PASS | Edge middleware validates HMAC-HS256 JWT on every `/admin/*` and `/api/admin/*` request before route handler runs. Double-checked by per-route `requireAdmin()`. |
| Payment idempotency | ✅ PASS | `markOrderPaid` uses `.eq('status', 'pending_payment')` guard — a second callback for the same order ID does nothing. |
| IDOR on addresses | ✅ PASS | `PATCH /api/addresses/[id]` and `DELETE /api/addresses/[id]` both add `.eq('user_id', user.id)` to the query — IDOR prevented. |
| IDOR on order cancel | ✅ PASS | Cancel route verifies phone number ownership before allowing cancellation. |
| File upload path | ✅ PASS | Upload stores files at `vendors/{vendor_id}/{timestamp}-{random}.{ext}` — user-supplied filename is discarded. |
| SERVICE_ROLE_KEY exposure | ✅ PASS (after fix #1) | Key is only referenced in server-only files (`admin.ts`, `env.ts`, `health`). The debug route that leaked the prefix is now deleted. |
| Stack traces to client | ✅ PASS | All production catch blocks return generic messages. Internal detail goes to `logger.error()` only. |
| CSP present | ✅ PASS | All routes get security headers via `next.config.ts`. Admin routes get stricter CSP with `Cache-Control: no-store`. |
| Rate limiting | ✅ PASS | Upstash Redis + in-memory fallback covering admin login (5/15min), checkout (10/10min), geocode (5/min), all public routes (30/min). |
| Supabase RLS patterns | ✅ PASS | Admin client (service_role) used only in server files. Route client (anon + cookies) used for user-context queries. |

---

## Security Checklist

- [x] Auth: all routes protected (admin by middleware, seller by getUser(), public by rate limit + ownership check)
- [x] RLS: admin client bypasses RLS deliberately; anon client respects it; admin client always scoped to correct user IDs
- [x] Input validation: all routes use Zod (fixed promo-codes and return route)
- [x] Rate limiting: applied to all sensitive routes including payment callback (fixed)
- [x] Security headers: DENY clickjacking, HSTS 2yr, COOP, CORP, Referrer-Policy (fixed SAMEORIGIN→DENY)
- [x] Payment webhooks: Satim status verified server-side before marking paid; idempotency guard on status column
- [x] Prices: always server-side recalculated from DB (never client-supplied)
- [x] No secrets hardcoded: debug endpoint that leaked key prefix deleted
- [x] XSS: no dangerouslySetInnerHTML on user content; photo URLs now validated against allowlist
- [x] IDOR: all object access checks ownership via user_id or phone verification
- [x] Error messages: no stack traces or internal details exposed to clients (fixed upload route)
- [x] Gift card race condition: fixed with atomic DB update

---

## Remaining Recommendations (require manual/external action)

1. **Run Supabase RLS audit** — Execute the following in the Supabase SQL editor to confirm every table has RLS enabled:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE schemaname = 'public' ORDER BY tablename;
   ```
   Any table with `rowsecurity = false` that stores user data is a risk.

2. **Set Upstash Redis in production** — Without `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, rate limiting falls back to in-memory which resets on cold start. On Vercel with multiple instances, each function has its own counter (bypassable).

3. **Add `FIELD_ENCRYPTION_KEY` for CAPI tokens** — The `meta_capi_token`, `tiktok_capi_token`, `gtag_api_secret` fields are stored in plaintext in the `vendors` table. The `crypto.ts` utility (`encryptField`/`decryptField`) already exists — apply it to vendor CAPI fields the same way it's applied to delivery config credentials.

4. **Rotate any secrets that may have been seen via the debug endpoint** — If `/api/debug/role` was ever deployed to production, consider the `SUPABASE_SERVICE_ROLE_KEY` prefix exposed. While only the first 20 chars were shown, rotate the key in Supabase dashboard → Settings → API as a precaution.

5. **`npm audit`** — Run `npm audit --audit-level=high` and patch any HIGH/CRITICAL findings. No unpatched findings were found in this audit but dependency vulnerabilities change over time.

6. **Sentry / monitoring** — Already wired in via `withSentryConfig`. Set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in Vercel env vars to enable runtime error capture.

7. **Admin accounts** — Currently uses a single shared `ADMIN_SECRET` password. Consider migrating to per-admin Supabase Auth accounts with role claims for a proper audit trail.

---

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/debug/role/route.ts` | DELETED |
| `src/app/api/admin/promo-codes/route.ts` | Full rewrite — added Zod schemas, fixed error forwarding |
| `src/app/api/gift-cards/redeem/route.ts` | Full rewrite — atomic balance decrement, added Zod |
| `src/app/api/seller/upload/route.ts` | Fixed error message leak in catch block |
| `src/app/api/orders/[orderId]/return/route.ts` | Added Zod schema, photo URL allowlist validator |
| `src/app/api/payment/callback/route.ts` | Added rate limiting |
| `next.config.ts` | X-Frame-Options DENY, expanded connect-src |
| `security-audit/00-attack-surface.md` | Created — attack surface map |
| `security-audit/FINAL-REPORT.md` | This file |
