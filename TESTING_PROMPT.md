# ShopDZ — Master QA & Bug-Fix Testing Prompt

> Paste this prompt into a new Claude Code session (or a fresh conversation) to run a full end-to-end audit of the entire platform and fix every bug found.

---

## Context

This is **ShopDZ** — a Next.js 15 multi-niche e-commerce platform targeting Algeria.  
Stack: Next.js 15 App Router · TypeScript · Supabase (Postgres + Auth) · Zustand · Tailwind CSS  
Payment: SATIM + BariDiMob (COD)  
Delivery: 10 providers (Yalidine, APEC, Yassir, ZR Express, Colivraison, REX, eCom, Maystro, Procolis)  
i18n: Arabic / French / English (RTL support)  
Platform has three user roles: **Customer**, **Seller**, **Admin**

---

## Instructions

Work through every section below in order. For each area:
1. Read all relevant source files before making any changes.
2. Test the logic by tracing through the code (and run the dev server where you need to see live behavior).
3. Fix every bug you find — do not skip a bug to "document it later".
4. After fixing, confirm the fix does not break adjacent functionality.

---

## 1. Public Customer Flow

### 1.1 Homepage (`/`)
- [ ] Hero CTA links work and route correctly
- [ ] Announcement banner renders (check `src/lib/supabase/settings.ts` for the settings query)
- [ ] Sponsored products render without errors
- [ ] Niche grid loads all categories from `src/lib/data/niches.ts`
- [ ] Social proof badges show correctly on ProductCard components
- [ ] Dark/light mode toggle works without hydration flash
- [ ] Language switcher (AR/FR/EN) applies RTL for Arabic and persists via `langStore`

### 1.2 Product Discovery
- [ ] `/search` — filters by price, category, wilaya; pagination works; empty state renders
- [ ] `/:niche` — correct products load per niche; filter sidebar opens/closes
- [ ] `/:niche/:productId` — product images, price, variants, stock status, reviews, Q&A all load
- [ ] `/compare` — add up to 4 products; table renders correctly; remove works
- [ ] `/deals` — flash deals countdown timer is accurate; expired deals are hidden

### 1.3 Cart & Wishlist
- [ ] Add to cart from product page updates `cartStore` and shows toast
- [ ] Cart page (`/cart`) — quantity change, remove, subtotal calculation
- [ ] Promo code validation at `/api/promo/validate` — valid code applies discount, invalid shows error
- [ ] Gift card validation at `/api/gift-cards/validate` — works and stacks correctly with promo
- [ ] Wishlist add/remove syncs across pages (check `wishlistStore`)
- [ ] Shareable wishlist `/wishlist/share/:id` — loads for unauthenticated users

### 1.4 Checkout (`/checkout`)
- [ ] Address form populates wilaya → commune cascade from `src/lib/data/wilayas.ts`
- [ ] Saved addresses load for logged-in users (`GET /api/addresses`)
- [ ] Delivery provider selection shows available options per wilaya
- [ ] COD order creation (`POST /api/orders`) inserts correct rows in Supabase
- [ ] SATIM payment initiation (`POST /api/payment/initiate`) returns a redirect URL
- [ ] BariDiMob payment initiation works similarly
- [ ] `/payment/success` and `/payment/failure` pages render correctly after return
- [ ] Payment callback (`POST /api/payment/callback`) updates order status correctly
- [ ] Out-of-stock items are blocked at checkout

### 1.5 Order Tracking & Account
- [ ] `/track` — enter order ID + phone → correct status returned from `GET /api/orders/track`
- [ ] `/orders` (logged-in) — order history loads with correct statuses
- [ ] Cancel order (`POST /api/orders/:orderId/cancel`) — only allowed for eligible statuses
- [ ] Return request (`POST /api/orders/:orderId/return`) — form submits and creates return record
- [ ] `/profile` — edit name/phone/email; changes persist to Supabase
- [ ] `/profile/addresses` — add, edit, delete addresses; default address toggle works

### 1.6 Auth
- [ ] `/auth` — sign up with email; OTP verification flow; login; logout
- [ ] Forgot password flow; reset link works
- [ ] Protected routes (`/orders`, `/profile`) redirect to `/auth` if not logged in

---

## 2. Store Pages

- [ ] `/store/:slug` — seller store homepage renders with custom branding
- [ ] `/store/:slug/:productId` — product page from within a store context
- [ ] Vacation mode banner shows when seller has vacation mode enabled
- [ ] Store returns 404 for non-existent slugs (not a crash)

---

## 3. Seller Dashboard

### 3.1 Auth
- [ ] `/seller/register` — OTP sent to email via `POST /api/seller/send-email-otp`; verification works
- [ ] `/seller/login` — JWT cookie set; protected pages accessible
- [ ] `/seller/reset-password` — email-based reset works end-to-end

### 3.2 Dashboard & Analytics
- [ ] `/seller/dashboard` — KPIs load (orders, revenue, visits); no N+1 queries
- [ ] `/seller/analytics` — charts render with real data; date range picker updates charts
- [ ] Export analytics (`POST /api/seller/analytics/export`) — returns valid CSV/XLSX

### 3.3 Products
- [ ] `/seller/products` — list, search, filter by status
- [ ] Create product — all required fields validated; image upload via `POST /api/seller/upload`
- [ ] Edit product — changes persist; variant management (size/color/etc.)
- [ ] CSV import (`POST /api/seller/products/import`) — valid CSV imports correctly; invalid CSV shows row-level errors
- [ ] Product soft-delete — product removed from public listings immediately

### 3.4 Orders
- [ ] `/seller/orders` — paginated order list; status filter works
- [ ] `/seller/pending` — only shows pending orders; confirm/reject actions work
- [ ] `/seller/cancelled-and-abandoned` — correct tab separation (cancelled vs abandoned)
- [ ] Order status change triggers correct WhatsApp/email notification to customer

### 3.5 Deliveries
- [ ] `/seller/deliveries` — shipment list loads from `GET /api/seller/shipments`
- [ ] Live tracking sync (last commit `fb10199`) — status updates from providers show correctly
- [ ] Ship modal — all 9 provider connections work (last commit `9406d62`)
- [ ] `POST /api/delivery/shipment` dispatches to correct provider via `src/lib/delivery/dispatch.ts`
- [ ] Test-connection buttons for APEC (`POST /api/seller/test-apec`) and Yalidine work
- [ ] All 10 delivery provider modules (`src/lib/delivery/*.ts`) handle API errors gracefully — no unhandled promise rejections
- [ ] Cancelled/abandoned tab shows correct data

### 3.6 Settings & Delivery Config
- [ ] `/seller/settings` — profile update, password change, store branding
- [ ] `/seller/settings/delivery` — toggle each provider on/off; credentials save correctly
- [ ] Vacation mode toggle (`POST /api/seller/vendor/vacation`) updates immediately

### 3.7 Promotions & Sponsored
- [ ] `/seller/promotions` — create flash sale, discount, promo code; each type validates correctly
- [ ] `/seller/sponsored` — sponsor a product; budget input validates

### 3.8 Messages & Notifications
- [ ] `/seller/messages` — conversation list loads; send message works
- [ ] Notification badge updates on new message

### 3.9 Subscription & Payouts
- [ ] `/seller/subscription` — current plan shown; upgrade CTA works
- [ ] `/seller/payouts` — payout history loads with correct amounts

---

## 4. Admin Panel

### 4.1 Auth & Security
- [ ] `/admin/login` — correct credentials set JWT + refresh token cookies
- [ ] Middleware in `src/middleware.ts` blocks all `/admin/*` routes without valid JWT
- [ ] TOTP (`POST /api/admin/totp`) — QR code generates; verification works
- [ ] `POST /api/admin/refresh` — session renewal works before expiry
- [ ] `POST /api/admin/logout` — cookies cleared; redirect to login

### 4.2 Orders & Returns
- [ ] `/admin/orders` — full order list with search/filter; status update works
- [ ] `/admin/returns` — return requests list; approve/reject actions update order status

### 4.3 Vendors & Customers
- [ ] `/admin/vendors` — list with verification status; approve vendor (`POST /api/admin/vendors/:id/verify`)
- [ ] `/admin/customers` — customer list; click through to order history

### 4.4 Catalog & Promotions
- [ ] `/admin/products` — moderation queue; approve/reject product
- [ ] `/admin/niches` — reorder categories via drag (`POST /api/admin/niches/order`)
- [ ] `/admin/promo-codes` — create, list, deactivate codes
- [ ] `/admin/promotions` — platform-wide promotion creation

### 4.5 Analytics (all sub-routes under `/admin/analytics/*`)
- [ ] `/admin/analytics/overview` — `GET /api/admin/analytics/overview` returns correct aggregates (last commit `becebbe` — revenue counts only `delivered` status)
- [ ] `/admin/analytics/revenue` — chart renders; date range picker works
- [ ] `/admin/analytics/customers` — new vs returning breakdown correct
- [ ] `/admin/analytics/sellers` — top sellers by revenue; GMV correct
- [ ] `/admin/analytics/delivery` — per-provider success rate; cost per shipment
- [ ] `/admin/analytics/search` — top search terms; zero-results terms flagged
- [ ] `/admin/analytics/cod` — COD conversion rate; abandonment by wilaya
- [ ] Export (`POST /api/admin/analytics/export`) — CSV download works

### 4.6 Settings & Subscriptions
- [ ] `/admin/settings` — announcement banner save (`POST /api/admin/settings/announcement`)
- [ ] `/admin/subscriptions` — create/edit plan; price and feature limits save correctly
- [ ] `/admin/abandoned` — abandoned cart list; manual recovery action

---

## 5. Cross-Cutting Concerns

### 5.1 i18n (`src/lib/i18n/translations.ts`)
- [ ] All translation keys exist for AR/FR/EN — no missing-key fallbacks visible in UI
- [ ] RTL layout correct for Arabic on all pages (check flexbox/grid direction, text alignment)
- [ ] Currency displays in DZD with correct formatting

### 5.2 Delivery Providers (`src/lib/delivery/`)
Each of the 10 modules: `apec.ts`, `yalidine.ts`, `yassir.ts`, `zrexpress.ts`, `colivraison.ts`, `rex.ts`, `ecom.ts`, `maystro.ts`, `procolis.ts`
- [ ] Each module exports the correct interface required by `dispatch.ts`
- [ ] Auth/token refresh logic is correct; credentials stored securely (not in code)
- [ ] Error responses (4xx, 5xx from provider API) are caught and return typed errors, not crashes
- [ ] `dispatch.ts` routing logic selects provider correctly based on seller config

### 5.3 Analytics & Tracking
- [ ] `POST /api/analytics/collect` — page views recorded without blocking render
- [ ] `POST /api/pixel/collect` — conversion events fire on order success
- [ ] `src/lib/supabase/analytics.ts` — queries match the schema (check last commit `becebbe` fix)

### 5.4 Notifications
- [ ] WhatsApp (`src/lib/notifications/whatsapp.ts`) — order confirmation, status update templates correct
- [ ] Email (`src/lib/notifications/email.ts`) — templates render without broken variables
- [ ] Seller notifications (`src/lib/notifications/seller.ts`) — new order alert fires

### 5.5 Security & Edge Cases
- [ ] All API routes validate input — no SQL injection, no XSS via product/store names
- [ ] Rate limiting (`src/lib/auth/rateLimit.ts`) applies on auth endpoints
- [ ] File upload validation (`src/lib/validation/fileUpload.ts`) — rejects non-image types and oversized files
- [ ] Phone validation (`src/lib/validation/phone.ts`) — Algerian format (+213 / 0xxx) accepted
- [ ] Admin audit log (`src/lib/auth/auditLog.ts`) records sensitive actions

### 5.6 Performance & Hydration
- [ ] No hydration mismatch errors in browser console on any page
- [ ] `cartStore`, `wishlistStore`, `compareStore` persist via localStorage without SSR mismatch
- [ ] `/offline` page served correctly by service worker when network is down

---

## 6. Currently Modified Files (from `git status`)

These files have uncommitted changes — audit them specifically:

| File | What to check |
|---|---|
| `src/app/api/admin/analytics/overview/route.ts` | Revenue only counts `delivered` orders (commit `becebbe`) — verify query is correct |
| `src/app/seller/deliveries/page.tsx` | Cancelled/abandoned tab works; live sync renders correctly |
| `src/lib/delivery/apec.ts` | Test-connection logic; error handling |
| `src/lib/delivery/colivraison.ts` | Error handling; correct field names for Colivraison API |
| `src/lib/delivery/dispatch.ts` | All 9 providers wired correctly; fallback when no provider configured |
| `src/lib/delivery/ecom.ts` | Error handling; auth token management |
| `src/lib/delivery/maystro.ts` | Status mapping to internal enum |
| `src/lib/delivery/procolis.ts` | Error handling; webhook parsing |
| `src/lib/delivery/rex.ts` | Error handling; field mapping |
| `src/lib/delivery/yalidine.ts` | Token refresh logic; wilaya code mapping |
| `src/lib/delivery/yassir.ts` | Error handling; pricing calculation |
| `src/lib/delivery/zrexpress.ts` | Error handling; status polling |
| `src/lib/i18n/translations.ts` | Missing keys for new features (social proof badge, cancelled/abandoned tab) |
| `src/lib/supabase/analytics.ts` | Revenue aggregation query matches new `delivered`-only logic |
| `src/app/api/seller/delivery-dashboard/` | New route — confirm it handles all HTTP methods and returns correct shape |

---

## 7. Bug Report Format

When you find a bug, record it and fix it immediately using this format before moving on:

```
BUG: [short title]
File: src/path/to/file.ts:line
Symptom: [what breaks]
Root cause: [why]
Fix: [what you changed]
```

---

## Done when:
- All checkboxes above pass
- No TypeScript errors (`npx tsc --noEmit`)
- No unhandled promise rejections in delivery/payment modules
- All translation keys present for AR/FR/EN
- `git diff` is clean or all changes are intentional fixes
