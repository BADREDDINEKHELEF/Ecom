# ShopDZ — Attack Surface Map
Generated: 2026-06-15

## API Routes (64 total)

### Admin Routes — JWT middleware + requireAdmin() per-route
| Route | Methods | Auth | Notes |
|-------|---------|------|-------|
| /api/admin/login | POST | Public | Rate-limited 5/15min |
| /api/admin/logout | POST | Public | Clears cookie |
| /api/admin/totp | GET | Public | TOTP setup |
| /api/admin/refresh | POST | Public | JWT refresh |
| /api/admin/vendors | GET, PATCH | Admin JWT | — |
| /api/admin/vendors/[id]/verify | GET, PATCH | Admin JWT | — |
| /api/admin/orders | GET, PATCH | Admin JWT | — |
| /api/admin/returns | GET | Admin JWT | — |
| /api/admin/returns/[id] | GET, PATCH | Admin JWT | — |
| /api/admin/analytics | GET | Admin JWT | — |
| /api/admin/analytics/export | GET | Admin JWT | — |
| /api/admin/promo-codes | DELETE, GET, PATCH, POST | Admin JWT | **HIGH: no Zod on POST/PATCH** |
| /api/admin/promotions | GET, PATCH | Admin JWT | — |
| /api/admin/subscriptions | GET, PATCH | Admin JWT | — |
| /api/admin/abandoned | GET, PATCH | Admin JWT | — |
| /api/admin/niches | DELETE, GET, POST | Admin JWT | — |
| /api/admin/niches/order | PATCH | Admin JWT | — |
| /api/admin/settings/announcement | PATCH | Admin JWT | — |

### Seller Routes — Supabase .auth.getUser() per-route
| Route | Methods | Auth | Notes |
|-------|---------|------|-------|
| /api/seller/register | POST | Supabase | — |
| /api/seller/stores | GET, PATCH, POST | Supabase | — |
| /api/seller/vendor | PATCH | Supabase | — |
| /api/seller/vendor/vacation | PATCH | Supabase | — |
| /api/seller/orders | GET, PATCH | Supabase | — |
| /api/seller/pending-orders | GET | Supabase | — |
| /api/seller/products/import | POST | Supabase | — |
| /api/seller/upload | POST | Supabase | **HIGH: leaks internal errors** |
| /api/seller/analytics | GET | Supabase | — |
| /api/seller/analytics/export | GET | Supabase | — |
| /api/seller/promo-codes | GET, PATCH, POST | Supabase | — |
| /api/seller/flash-sales | GET, PATCH, POST | Supabase | — |
| /api/seller/sponsored | GET, PATCH, POST | Supabase | — |
| /api/seller/shipments | GET, PATCH, POST | Supabase | — |
| /api/seller/delivery-config | GET, PATCH | Supabase | — |
| /api/seller/messages | GET, POST | Supabase | — |
| /api/seller/notifications | GET, PATCH | Supabase | — |
| /api/seller/questions/[questionId]/answer | PATCH | Supabase | — |
| /api/seller/subscription | GET, POST | Supabase | — |

### Public Routes — Rate-limited by IP, no auth
| Route | Methods | Auth | Notes |
|-------|---------|------|-------|
| /api/orders | POST | None | Rate-limited, server-side price validation |
| /api/orders/[orderId]/cancel | POST | Phone verify | Rate-limited |
| /api/orders/[orderId]/return | POST | Phone verify | **MEDIUM: photos unvalidated** |
| /api/orders/track | GET | None | Rate-limited |
| /api/addresses | GET, POST | Supabase | — |
| /api/addresses/[id] | PATCH, DELETE | Supabase | — |
| /api/reviews/[productId] | POST | None | Rate-limited |
| /api/questions/[productId] | POST | None | Rate-limited |
| /api/payment/initiate | POST | None | **MEDIUM: no rate limit** |
| /api/payment/callback | GET | Satim verify | **MEDIUM: no rate limit** |
| /api/promo/validate | POST | None | Rate-limited |
| /api/gift-cards/validate | POST | None | Rate-limited |
| /api/gift-cards/redeem | POST | None | **HIGH: race condition** |
| /api/newsletter | POST | None | Rate-limited |
| /api/abandoned | PATCH, POST | None | Rate-limited |
| /api/stock-alerts | POST | None | Rate-limited |
| /api/loyalty | GET | Supabase | — |
| /api/compare | GET | None | Rate-limited |
| /api/products/related | GET | None | Rate-limited |
| /api/sponsored | GET | None | Rate-limited |
| /api/store/[slug] | POST | None | Rate-limited |
| /api/delivery/shipment | POST | Supabase | — |
| /api/pixel/collect | GET, POST | None | Rate-limited |
| /api/track | GET | None | Rate-limited |
| /api/geocode | GET | None | Rate-limited 5/min |

### Diagnostic / Utility
| Route | Methods | Auth | Notes |
|-------|---------|------|-------|
| /api/debug/role | GET | **NONE** | **CRITICAL: leaks service_role key prefix** |
| /api/health | GET | None | DB ping only, safe |

## Middleware Coverage
- `/admin/*` and `/api/admin/*` — Edge JWT verification (jose library)
- All other routes: per-route auth via supabase.auth.getUser()
- Seller routes not in middleware matcher — rely on per-route checks

## Auth Patterns
- Admin: HMAC-HS256 JWT in httpOnly cookie → middleware + requireAdmin()
- Seller: Supabase session cookie → createRouteClient() + .auth.getUser()
- Public: phone-number ownership check for order cancel/return

## Supabase Client Types
- admin.ts: service_role key — server-only, bypasses RLS ✓
- server.ts: anon key + auth cookies — respects RLS ✓
- client.ts: anon key — browser, respects RLS ✓

## Findings Summary
| Severity | Count | Fixed |
|----------|-------|-------|
| CRITICAL | 1 | pending |
| HIGH | 3 | pending |
| MEDIUM | 3 | pending |
| LOW | 0 | — |
