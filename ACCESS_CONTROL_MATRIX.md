# Access Control Matrix & Vulnerability Report

**Date:** 2026-06-20  
**Scope:** All 96 API route handlers across `/api/**`  
**Status:** Audited — 4 issues fixed, 1 informational noted

---

## Role Definitions

| Role | Description | Auth Mechanism |
|------|-------------|----------------|
| **Anonymous** | No authentication | — |
| **Buyer** | Authenticated Supabase user (buyer session) | `supabase.auth.getUser()` |
| **Seller** | Authenticated user with linked vendor record | `supabase.auth.getUser()` + `getVendorByUserIdServer()` |
| **Admin** | Holds valid `casbah_admin_token` cookie | HS256 JWT + JTI blocklist (`requireAdmin`) |
| **Cron/Service** | Internal automated job | `CRON_SECRET` bearer token (timing-safe compare) |
| **Satim** | Satim payment gateway callback | Server-side `mdOrder` verification |

---

## Access Control Matrix

### Public Routes (Anonymous)

| Resource | Method | Anonymous | Buyer | Seller | Admin | Cron |
|----------|--------|-----------|-------|--------|-------|------|
| `/api/health` | GET | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/analytics/collect` | POST | ✅ RL | ✅ RL | ✅ RL | ✅ RL | ✅ |
| `/api/pixel/collect` | GET/POST/OPTIONS | ✅ RL | ✅ RL | ✅ RL | ✅ RL | ✅ |
| `/api/abandoned` | POST | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/abandoned` | PATCH | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/compare` | GET | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/products/related` | GET | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/questions/[productId]` | GET | ✅ | ✅ | ✅ | ✅ | — |
| `/api/questions/[productId]` | POST | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/stock-alerts` | POST | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/store/[slug]` | GET | ✅ | ✅ | ✅ | ✅ | — |
| `/api/promo/validate` | POST | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/orders/track` | GET | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/newsletter` | POST | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/track` | GET | ✅ | ✅ | ✅ | ✅ | — |
| `/api/reviews/[productId]` | GET | ✅ | ✅ | ✅ | ✅ | — |
| `/api/reviews/[productId]` | POST | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/gift-cards/validate` | POST | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/gift-cards/redeem` | POST | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/sponsored` | GET | ✅ | ✅ | ✅ | ✅ | — |
| `/api/delivery/rates` | GET | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/geocode` | GET | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/payment/initiate` | POST | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/payment/callback` | GET | Satim only | — | — | — | — |
| `/api/orders` | POST | ✅ RL | ✅ RL | ✅ RL | ✅ RL | — |

> RL = rate limited

### Phone-Verified Routes (No session, phone must match order record)

| Resource | Method | Anonymous | Notes |
|----------|--------|-----------|-------|
| `/api/orders/[orderId]/cancel` | POST | ✅ RL+Phone | Status guard: pending only |
| `/api/orders/[orderId]/return` | POST | ✅ RL+Phone | Status guard: delivered only |

### Seller Auth Routes (Supabase session + vendor record)

| Resource | Method | Anonymous | Buyer | Seller | Admin |
|----------|--------|-----------|-------|--------|-------|
| `/api/seller/register` | POST | ❌ | ✅ (creates vendor) | ✅ | ✅ |
| `/api/seller/forgot-password` | POST | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/seller/send-phone-otp` | POST | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/seller/verify-phone-otp` | POST | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/seller/verify-otp` | POST | ✅ RL | ✅ RL | ✅ RL | — |
| `/api/seller/vendor` | PATCH | ❌ | ❌ | ✅ (own vendor) | — |
| `/api/seller/vendor/vacation` | PATCH | ❌ | ❌ | ✅ (own vendor) | — |
| `/api/seller/stores` | GET | ❌ | ❌ | ✅ (own stores) | — |
| `/api/seller/stores` | POST | ❌ | ❌ | ✅ (plan-limited) | — |
| `/api/seller/stores` | PATCH | ❌ | ❌ | ✅ (own store) | — |
| `/api/seller/orders` | GET | ❌ | ❌ | ✅ (own orders) | — |
| `/api/seller/orders` | PATCH | ❌ | ❌ | ✅ (own orders, state machine) | — |
| `/api/seller/pending-orders` | GET | ❌ | ❌ | ✅ (own) | — |
| `/api/seller/cancelled-and-abandoned` | GET | ❌ | ❌ | ✅ (own) | — |
| `/api/seller/shipments` | GET | ❌ | ❌ | ✅ (own) | — |
| `/api/seller/shipments` | POST | ❌ | ❌ | ✅ (own orders) | — |
| `/api/seller/shipments` | PATCH | ❌ | ❌ | ✅ (own shipments) | — |
| `/api/seller/shipments/sync` | POST | ❌ | ❌ | ✅ (own) | — |
| `/api/seller/delivery-config` | GET | ❌ | ❌ | ✅ (redacted flags only) | — |
| `/api/seller/delivery-config` | PATCH | ❌ | ❌ | ✅ (own) | — |
| `/api/seller/delivery-dashboard` | GET | ❌ | ❌ | ✅ (own) | — |
| `/api/seller/promo-codes` | GET | ❌ | ❌ | ✅ (own) | — |
| `/api/seller/promo-codes` | POST | ❌ | ❌ | ✅ (own) | — |
| `/api/seller/promo-codes` | PATCH | ❌ | ❌ | ✅ (ownership checked) | — |
| `/api/seller/flash-sales` | GET | ❌ | ❌ | ✅ (own) | — |
| `/api/seller/flash-sales` | POST | ❌ | ❌ | ✅ (own products) | — |
| `/api/seller/flash-sales` | PATCH | ❌ | ❌ | ✅ (ownership checked) | — |
| `/api/seller/sponsored` | GET | ❌ | ❌ | ✅ (own) | — |
| `/api/seller/sponsored` | POST | ❌ | ❌ | ✅ (product ownership checked) | — |
| `/api/seller/sponsored` | PATCH | ❌ | ❌ | ✅ (own, status: paused/pending only) | — |
| `/api/seller/products/import` | POST | ❌ | ❌ | ✅ (own, max 200/req) | — |
| `/api/seller/messages` | GET | ❌ | ❌ | ✅ (own) | — |
| `/api/seller/notifications` | GET | ❌ | ❌ | ✅ (own) | — |
| `/api/seller/notifications` | PATCH | ❌ | ❌ | ✅ (own) | — |
| `/api/seller/analytics` | GET | ❌ | ❌ | ✅ (own) | — |
| `/api/seller/analytics/export` | GET | ❌ | ❌ | ✅ (own, 3 req/h) | — |
| `/api/seller/subscription` | GET | ❌ | ❌ | ✅ (own) | — |
| `/api/seller/upload` | POST | ❌ | ❌ | ✅ (magic byte check) | — |
| `/api/seller/test-yalidine` | POST | ❌ | ❌ | ✅ (own creds) | — |
| `/api/seller/test-apec` | POST | ❌ | ❌ | ✅ (own creds) | — |
| `/api/seller/questions/[questionId]/answer` | PATCH | ❌ | ❌ | ✅ (product ownership) | — |

### Buyer Auth Routes (Supabase session, buyer)

| Resource | Method | Anonymous | Buyer | Seller | Admin |
|----------|--------|-----------|-------|--------|-------|
| `/api/addresses` | GET | ❌ | ✅ (own) | ✅ (own) | — |
| `/api/addresses` | POST | ❌ | ✅ | ✅ | — |
| `/api/addresses/[id]` | PATCH | ❌ | ✅ (own, `.eq('user_id')`) | ✅ (own) | — |
| `/api/addresses/[id]` | DELETE | ❌ | ✅ (own, `.eq('user_id')`) | ✅ (own) | — |
| `/api/loyalty` | GET | ❌ | ✅ (own) | ✅ (own) | — |

### Admin Routes (Admin JWT + JTI blocklist)

| Resource | Method | Anonymous | Seller | Admin |
|----------|--------|-----------|--------|-------|
| `/api/admin/login` | POST | ✅ (no auth) | ✅ | ✅ |
| `/api/admin/logout` | POST | ✅ (no auth) | ✅ | ✅ |
| `/api/admin/refresh` | POST | ✅ (no auth) | ✅ | ✅ |
| `/api/admin/totp` | POST | ✅ (no auth) | ✅ | ✅ |
| `/api/admin/sessions` | GET | ❌ | ❌ | ✅ |
| `/api/admin/sessions/[id]` | DELETE | ❌ | ❌ | ✅ |
| `/api/admin/orders` | GET | ❌ | ❌ | ✅ |
| `/api/admin/orders` | PATCH | ❌ | ❌ | ✅ |
| `/api/admin/vendors` | GET | ❌ | ❌ | ✅ |
| `/api/admin/vendors` | PATCH | ❌ | ❌ | ✅ |
| `/api/admin/vendors/[id]/verify` | POST | ❌ | ❌ | ✅ |
| `/api/admin/analytics` | GET | ❌ | ❌ | ✅ |
| `/api/admin/analytics/export` | GET | ❌ | ❌ | ✅ (5 req/min) |
| `/api/admin/analytics/delivery` | GET | ❌ | ❌ | ✅ |
| `/api/admin/analytics/customers` | GET | ❌ | ❌ | ✅ |
| `/api/admin/analytics/sellers` | GET | ❌ | ❌ | ✅ |
| `/api/admin/analytics/search` | GET | ❌ | ❌ | ✅ |
| `/api/admin/analytics/revenue` | GET | ❌ | ❌ | ✅ |
| `/api/admin/analytics/overview` | GET | ❌ | ❌ | ✅ |
| `/api/admin/niches` | GET/POST/DELETE | ❌ | ❌ | ✅ |
| `/api/admin/niches/order` | PATCH | ❌ | ❌ | ✅ |
| `/api/admin/settings/announcement` | PATCH | ❌ | ❌ | ✅ |
| `/api/admin/abandoned` | GET | ❌ | ❌ | ✅ |
| `/api/admin/abandoned` | PATCH | ❌ | ❌ | ✅ |
| `/api/admin/promotions` | GET/POST/PATCH | ❌ | ❌ | ✅ |
| `/api/admin/subscriptions` | GET | ❌ | ❌ | ✅ |
| `/api/admin/promo-codes` | GET/POST/PATCH | ❌ | ❌ | ✅ |
| `/api/admin/questions` | GET/PATCH | ❌ | ❌ | ✅ |
| `/api/admin/returns` | GET | ❌ | ❌ | ✅ |
| `/api/admin/returns/[id]` | PATCH | ❌ | ❌ | ✅ |
| `/api/delivery/shipment` | POST | ❌ | ❌ | ✅ (requireAdmin) |

### Cron / Service Routes

| Resource | Method | Auth |
|----------|--------|------|
| `/api/cron/analytics-alerts` | GET | `CRON_SECRET` bearer, timing-safe compare |
| `/api/cron/sync-shipments` | GET | `CRON_SECRET` bearer, timing-safe compare |

---

## Vulnerability Findings

### V1 — CRITICAL (Fixed) — JTI Revocation Bypass in `/api/delivery/shipment`

**File:** [src/app/api/delivery/shipment/route.ts](src/app/api/delivery/shipment/route.ts)  
**Lines before fix:** 33–39

**Root cause:** The route used `verifyAdminToken(token)` directly, which only verifies the JWT signature and expiry. It does **not** query the `admin_revoked_tokens` table. `requireAdmin(req)` is the correct enforcement point — it verifies the signature *and* checks the JTI blocklist.

**Impact:** A logged-out or explicitly revoked admin token (e.g. from a stolen cookie or a terminated session) could create shipments against any order. The JTI revocation mechanism implemented in the auth security review was entirely bypassed for this endpoint.

**Attack scenario:**
1. Admin logs in; token is valid.
2. Admin logs out (JTI added to `admin_revoked_tokens`, session marked inactive).
3. Attacker replays the stolen token against `POST /api/delivery/shipment`.
4. `verifyAdminToken` passes (signature valid, not yet expired).
5. Shipment is created. Attacker learns vendor delivery credentials.

**Fix applied:**
```diff
- import { cookies } from 'next/headers'
- import { verifyAdminToken } from '@/lib/auth/jwt'
+ import { requireAdmin } from '@/lib/auth/adminAuth'

- const cookieStore = await cookies()
- const token = cookieStore.get('casbah_admin_token')?.value
- const payload = await verifyAdminToken(token ?? '')
- if (!payload) {
-   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
- }
+ const denied = await requireAdmin(req)
+ if (denied) return denied
```

---

### V2 — Medium (Fixed) — Missing Rate Limiting on PATCH `/api/seller/stores`

**File:** [src/app/api/seller/stores/route.ts](src/app/api/seller/stores/route.ts)  
**Line before fix:** 137

**Root cause:** The GET and POST handlers had rate limiting (`checkSellerRateLimit`); the PATCH handler did not.

**Impact:** An authenticated seller could flood the PATCH endpoint to cause excessive DB writes or act as a DoS amplifier. While writes are low-cost, the absence of any limit is inconsistent with the rest of the route and violates the defense-in-depth pattern.

**Fix applied:** Added `checkSellerRateLimit(ip, 'stores_write', 20, 60)` at the top of the PATCH handler (before auth).

**Secondary fix:** Added UUID format validation for `body.id` before it reaches the DB query, preventing unnecessary round-trips for malformed input.

---

### V3 — Low (Fixed) — No Rate Limit on Admin CSV Export

**File:** [src/app/api/admin/analytics/export/route.ts](src/app/api/admin/analytics/export/route.ts)

**Root cause:** The endpoint fetches up to 5,000 orders with nested `order_items` joins and generates a full CSV — no rate limiting was applied.

**Impact:** A compromised admin account or a rogue admin could spam this endpoint causing database pressure or elevated compute costs. Low likelihood (admin-only), but the blast radius of a DB scan is non-trivial at 5k rows + joins.

**Fix applied:** Added `checkAdminApiRateLimit(ip, 'analytics_export', 5, 60)` — 5 exports per 60 seconds per IP.

---

### V4 — Informational — Concurrent Default Address Race Condition

**File:** [src/app/api/addresses/route.ts](src/app/api/addresses/route.ts)  
**Lines:** ~60–75

**Root cause:** To set a new default address, the code clears all previous defaults then inserts the new one in two separate statements. Concurrent POST requests could both clear and both set, resulting in multiple `is_default=true` rows.

**Impact:** Cosmetic — the buyer might see two addresses both marked as default. No security impact.

**Remediation (not applied — schema change required):** Add a unique partial index to enforce the constraint at the DB level:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_default_per_user
  ON public.saved_addresses (user_id)
  WHERE is_default = true;
```

This turns the race into a DB-level constraint violation, making the second concurrent request fail cleanly.

---

## Endpoint Inventory — Authorization Mechanism Reference

| Endpoint | Auth Type | Enforcement Point |
|----------|-----------|-------------------|
| `/api/admin/*` (most) | Admin JWT | `requireAdmin(req)` — signature + JTI blocklist |
| `/api/admin/login,logout,refresh,totp` | None (public) | — |
| `/api/delivery/shipment` | Admin JWT | `requireAdmin(req)` (**fixed from `verifyAdminToken`**) |
| `/api/seller/*` | Supabase session | `supabase.auth.getUser()` + vendor lookup |
| `/api/addresses`, `/api/loyalty` | Supabase session | `supabase.auth.getUser()` |
| `/api/orders/[id]/cancel` | Phone match | `order.phone === normalized(input)` |
| `/api/orders/[id]/return` | Phone match | `order.phone === normalized(input)` |
| `/api/cron/*` | CRON_SECRET bearer | `timingSafeEqual(provided, expected)` |
| `/api/payment/callback` | Satim mdOrder | Server-side Satim verification |
| All public endpoints | None | Rate limiting only |

---

## IDOR Audit Results

| Endpoint | IDOR Vector | Status |
|----------|-------------|--------|
| `PATCH /api/addresses/[id]` | `user_id` filter on all queries | ✅ Safe |
| `DELETE /api/addresses/[id]` | `user_id` filter on all queries | ✅ Safe |
| `PATCH /api/seller/orders` | `vendor_id` filter + ownership check | ✅ Safe |
| `PATCH /api/seller/shipments` | `vendor_id` in WHERE clause | ✅ Safe |
| `PATCH /api/seller/promo-codes` | Ownership verified before update | ✅ Safe |
| `PATCH /api/seller/flash-sales` | Product + vendor ownership check | ✅ Safe |
| `PATCH /api/seller/sponsored` | Vendor ID filter on update | ✅ Safe |
| `PATCH /api/seller/questions/[id]/answer` | Question → product → vendor chain check | ✅ Safe |
| `PATCH /api/seller/stores` | `user_id`/`owner_id` ownership check | ✅ Safe |
| `DELETE /api/admin/sessions/[id]` | UUID validated; no user-scoping needed (admin sees all) | ✅ Safe |
| `PATCH /api/admin/returns/[id]` | UUID validated; admin sees all returns | ✅ Safe |

---

## Privilege Escalation Audit

| Risk | Status | Notes |
|------|--------|-------|
| Seller accessing admin endpoints | ✅ Blocked | Edge middleware + `requireAdmin` on all `/api/admin/*` |
| Seller modifying another seller's data | ✅ Blocked | `vendor_id` / `user_id` equality checks on every mutation |
| Buyer accessing seller endpoints | ✅ Blocked | Vendor lookup fails — no vendor row for buyer users |
| Admin token surviving logout | ✅ Fixed (auth review) | JTI blocklist + session deactivation in `revokeAdminToken` |
| Revoked admin token creating shipments | ✅ Fixed (this review) | `requireAdmin` now enforced on `delivery/shipment` |
| Seller elevating to admin via store manipulation | ✅ Blocked | No code path that grants admin role from seller data |
| Gift card balance double-spend | ✅ Blocked | `redeem_gift_card` RPC uses `SELECT FOR UPDATE` |
| Order status regression (delivered→pending) | ✅ Blocked | State machine in seller/orders + delivery/shipment |

---

## Post-Fix Verification Checklist

- [x] `npx tsc --noEmit` — zero TypeScript errors after all three fixes
- [ ] Deploy and test `POST /api/delivery/shipment` with a revoked token → expect 401
- [ ] Test `PATCH /api/seller/stores` with more than 20 requests/min → expect 429
- [ ] Test `GET /api/admin/analytics/export` with more than 5 requests/min → expect 429
- [ ] Apply `CREATE UNIQUE INDEX addresses_one_default_per_user` migration (optional, cosmetic fix)
