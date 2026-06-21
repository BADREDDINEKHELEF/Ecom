# Application Security Audit

**Standard:** OWASP ASVS v4.0.3 · OWASP Top 10 2021 · OWASP API Security Top 10 2023  
**Date:** 2026-06-20  
**Methodology:** Full source-code trace — no assumption-based testing  
**Scope:** 96 route handlers, 4 middleware layers, DB migration stack, dependency tree

> Findings already patched in previous sessions (JTI bypass, PostgREST injection, Host-header payment redirect, missing rate limits) are not re-listed here. This report covers what remains.

---

## Findings Summary

| ID | OWASP Class | Severity | Title | Status |
|----|-------------|----------|-------|--------|
| C-01 | API6 / A04 | **Critical** | Client-controlled shipping cost | Open |
| C-02 | API6 / A04 | **Critical** | Promo code race — discount before atomic increment | Open |
| H-01 | API3 / A02 | **High** | Gift card balance exposed to unauthenticated callers | Open |
| H-02 | A04 | **High** | Non-atomic stock restoration — permanent stock loss on crash | Open |
| H-03 | A02 / GDPR | **High** | Unredacted buyer IP sent to Meta CAPI without consent | Open |
| M-01 | A02 | **Medium** | TOTP setup secret written to server logs permanently | Open |
| M-02 | API3 | **Medium** | `select('*')` pulls encrypted credential columns unnecessarily | Open |
| M-03 | A08 | **Medium** | No webhook signature on Satim payment callback | Open |
| M-04 | API9 | **Medium** | Delivery credential test endpoints accept tokens in request body | Open |
| M-05 | A04 | **Medium** | Inconsistent phone normalization — OTP/order phone mismatch | Open |
| L-01 | A02 | **Low** | `Math.random()` for storage file IDs | Open |
| L-02 | A09 | **Low** | Missing audit events (session revoke, commission paid) | Open |
| L-03 | A06 | **Low** | Three transitive npm CVEs | Open |

---

## C-01 — Critical — Client-Controlled Shipping Cost

**OWASP:** API6:2023 Unrestricted Access to Sensitive Business Flows · A04:2021 Insecure Design  
**ASVS:** 5.1.3 — Server-side enforcement of business rules

### Code Location

`src/app/api/orders/route.ts:39`
```typescript
shippingCost: z.number().min(0).max(10000),
```

`src/lib/supabase/orders.ts:161`
```typescript
const total = Math.max(0,
  computedSubtotal + input.shippingCost   // ← client value used verbatim
  - discountAmount - giftCardDeduction - pointsDeduction
)
```

`src/lib/supabase/orders.ts:234`
```typescript
shipping_cost: input.shippingCost,   // ← persisted directly from client
```

### Exploitation Scenario

A buyer inspects network traffic on checkout, intercepts the `POST /api/orders` request, and changes `shippingCost` from 700 to 0. The server accepts the value without validation, creates the order with zero shipping, and charges the seller the actual delivery cost. Repeat across every order.

```bash
curl -X POST /api/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "fullName": "Test Buyer",
    "phone": "0551234567",
    "wilaya": "Alger",
    "city": "Bab Ezzouar",
    "address": "Rue 01",
    "paymentMethod": "cash",
    "shippingCost": 0,        ← was 700 DA in the browser
    "items": [{"productId": "VALID_ID", "productName": "...", "quantity": 1}]
  }'
```

The server at line 161 computes `total = subtotal + 0 - 0 - 0 - 0`. Order is created. Vendor ships the product and pays their delivery provider; the platform absorbs the loss.

### Business Impact

Every order placed through the API (not a locked-down native app) is subject to this. Technically sophisticated buyers can permanently pay zero shipping. At scale with 100 orders/day averaging 700 DA shipping, the financial exposure is ~2.1M DZD/month.

### Recommended Fix

Remove `shippingCost` from the client schema entirely. Compute it server-side from the buyer's wilaya and the vendor's configured delivery rates.

**Patch — `src/app/api/orders/route.ts`:**
```diff
 const CreateOrderSchema = z.object({
   fullName:      z.string().min(2).max(200),
   phone:         z.string().regex(/^(213[5-7]|0[5-7])\d{8}$/),
   wilaya:        z.string().min(1).max(100),
   city:          z.string().min(1).max(200).refine(v => v !== '__autre__'),
   address:       z.string().min(5).max(500),
   paymentMethod: z.enum(['cash', 'card', 'edahabia', 'cib', 'baridimob']),
-  shippingCost:  z.number().min(0).max(10000),
   // ... rest of schema
 })
```

**Patch — `src/lib/supabase/orders.ts`** (add server-side rate lookup before line 161):
```typescript
// Resolve shipping cost from DB, never from client
async function resolveShippingCost(wilaya: string, vendorId: string | null): Promise<number> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('shipping_rates')
    .select('cost')
    .eq('wilaya', wilaya)
    .eq('vendor_id', vendorId ?? null)   // vendor-specific or platform rate
    .maybeSingle()
  return data?.cost ?? 0
}
// Then: const shippingCost = await resolveShippingCost(input.wilaya, primaryVendorId)
```

If a shipping-rates table does not yet exist, the minimum fix is a server-side allowlist of valid wilaya costs from a config file — anything but trusting the client value.

---

## C-02 — Critical — Promo Code Race Condition

**OWASP:** API6:2023 Unrestricted Access to Sensitive Business Flows · A04:2021 Insecure Design  
**ASVS:** 1.11.2 — Critical business logic flows are not susceptible to TOCTOU

### Code Location

`src/lib/supabase/orders.ts:139-155` — validation (read phase):
```typescript
if (
  promo && promo.is_active &&
  !(promo.expires_at && new Date(promo.expires_at) < new Date()) &&
  !(promo.max_uses !== null && promo.uses_count >= promo.max_uses) &&  // ← checked here
  computedSubtotal >= (promo.min_order ?? 0)
) {
  discountAmount = promo.discount_type === 'percentage' ? ... : ...
}
```

`src/lib/supabase/orders.ts:277-287` — increment (write phase), **after stock decrement + order insert**:
```typescript
if (input.promoCodeId) {
  const promoAccepted = await incrementPromoUses(input.promoCodeId)
  if (!promoAccepted) {
    // Compensating: order already inserted — now we try to remove the discount
    await supabase.from('orders').update({ discount_amount: 0, promo_code_id: null, total: correctedTotal })
      .eq('id', order.id)
    return { id: order.id, total: correctedTotal }
  }
}
```

### Exploitation Scenario

Promo code `PROMO2024` has `max_uses = 1`. Two buyers send orders simultaneously:

1. T=0ms — Request A reads `uses_count=0, max_uses=1` → passes check, sets `discountAmount = 500`
2. T=1ms — Request B reads `uses_count=0, max_uses=1` → passes check, sets `discountAmount = 500`
3. T=50ms — Request A decrements stock, inserts order (with 500 DA discount)
4. T=51ms — Request B decrements stock, inserts order (with 500 DA discount)
5. T=100ms — Request A calls `incrementPromoUses` → returns `true` (uses_count now = 1)
6. T=101ms — Request B calls `incrementPromoUses` → returns `false` (max_uses exceeded)
7. T=110ms — Compensating update removes discount from B's order

**Result:** One order slips through with the unauthorized discount. The compensating transaction only works if the increment RPC is atomic. If two concurrent RPCs both succeed (race in the RPC itself), both orders keep their discounts. The business absorbs unauthorized discount costs.

The compensating transaction is also visible to the buyer: they receive `orderId` in the 201 response before the discount correction runs. If they poll immediately, they may see the discounted total, then it changes — a confusing and potentially exploitable window.

### Business Impact

For high-value, single-use promo codes (flash sales, influencer codes), every simultaneous order pair during launch spike can double-consume the code. A 10-second flash sale with 500 concurrent buyers could result in dozens of unauthorized discount applications.

### Recommended Fix

Move `incrementPromoUses` to **before** stock decrement. Fail early and cleanly rather than compensating after the fact.

**Patch — `src/lib/supabase/orders.ts`** (insert before line 163, the stock decrement loop):
```typescript
// ── 3b. Attempt to claim the promo code slot BEFORE touching stock ────
// If the code is maxed out by a concurrent order, abort here with a clean
// user-facing error before any stock has been decremented.
if (input.promoCodeId && discountAmount > 0) {
  const promoAccepted = await incrementPromoUses(input.promoCodeId)
  if (!promoAccepted) {
    // Reset discount — code was maxed out between validation and increment
    discountAmount = 0
    // Optionally throw so the buyer knows their code was no longer valid:
    // throw new Error('Promo code no longer available — please try without it')
  }
}
```

Then **remove** the duplicate `incrementPromoUses` call at lines 277-287. The compensating-transaction block is no longer needed.

This means the RPC (`increment_promo_uses`) must be the sole source of truth. Verify the RPC uses `SELECT ... FOR UPDATE` or a `UPDATE ... WHERE uses_count < max_uses RETURNING id` pattern so two concurrent calls cannot both succeed.

---

## H-01 — High — Gift Card Balance Oracle

**OWASP:** API3:2023 Broken Object Property Level Authorization · A02:2021 Cryptographic Failures  
**ASVS:** 8.3.4 — Sensitive data not exposed in APIs without necessity

### Code Location

`src/app/api/gift-cards/validate/route.ts:17-33`
```typescript
const { data } = await supabase
  .from('gift_cards')
  .select('id, balance, expires_at, is_active')
  .eq('code', code.trim().toUpperCase())
  .maybeSingle()

if (!data || !data.is_active) {
  return NextResponse.json({ error: 'Code cadeau invalide ou désactivé' }, { status: 404 })
}
// ...
return NextResponse.json({ balance: data.balance })   // ← exact balance to anonymous caller
```

### Exploitation Scenario

The endpoint is public (no session required) and protected only by `checkPublicRateLimit` (30 req/60s per IP). An attacker with rotating IPs (or Tor exit nodes) can:

1. Enumerate gift card codes by sending `POST /api/gift-cards/validate` with guessed codes
2. Any 200 response reveals the exact balance in DZD
3. The attacker monitors which codes have balance > 0
4. After identifying valid codes, the attacker races to `POST /api/gift-cards/redeem` before the legitimate owner

With 6-character alphanumeric codes (36^6 ≈ 2.1 billion), brute force is impractical without rate limit bypass. But if codes are short, sequential, or follow a pattern (e.g., `GIFT2024001`), the attack surface collapses significantly.

Even without brute force: if an attacker knows a partial code (e.g., from social media where a gift card was partially visible), they can confirm it and check its balance.

### Business Impact

Gift card balances are financial instruments. Leaking exact balances enables targeted theft of high-value cards. Loss of customer trust if gift card fraud occurs at scale.

### Recommended Fix

The validate endpoint should confirm validity only — never expose balance. Balance should be disclosed only in the authenticated checkout flow after the buyer initiates a redemption.

**Patch — `src/app/api/gift-cards/validate/route.ts`:**
```diff
- return NextResponse.json({ balance: data.balance })
+ return NextResponse.json({ valid: true })
```

The checkout UI should call `/redeem` (which returns `{ deducted, remaining_balance }`) to display the applied amount. The validate endpoint's sole purpose is a binary existence check.

---

## H-02 — High — Non-Atomic Stock Restoration

**OWASP:** A04:2021 Insecure Design  
**ASVS:** 1.11.2 — Critical business logic not susceptible to TOCTOU

### Code Location

`src/lib/supabase/orders.ts:177-198` — manual read-then-write restoration:
```typescript
await Promise.all(
  decrementedItems.map(async (prev) => {
    const { data: p } = await supabase        // ← READ current stock
      .from('products')
      .select('stock')
      .eq('id', prev.productId)
      .single()
    if (p) {
      await supabase                           // ← WRITE current + quantity
        .from('products')
        .update({ stock: (p.stock as number) + prev.quantity })
        .eq('id', prev.productId)
    }
  })
)
```

`src/lib/supabase/orders.ts:204-220` — identical pattern in `restoreStock()`.

### Exploitation Scenario (Integrity, Not Confidentiality)

This is not exploitable by an attacker in the traditional sense — it is a reliability hazard triggered by concurrent orders or application crashes.

**Scenario A — Concurrent orders:**
1. Order A decrements product X from 5 → 4 units
2. Order A's insert fails → restoration begins: reads stock=4, writes stock=5
3. Order B (concurrent) also decremented X from 4 → 3 during the restoration read-write window
4. Order A's restoration writes 4+1=5 to a field that is now 3 → stock jumps to 5
5. Net result: Order B's decrement was erased — product now appears to have 5 units again when it should have 4

**Scenario B — Application crash mid-restoration:**
If the serverless function is killed (timeout, OOM) after decrementing 3 of 5 items but before restoring them, stock for those 3 items is permanently lost. No mechanism triggers a re-try.

### Business Impact

Overselling (selling more units than physically exist) or permanently lost stock counters, requiring manual DB correction. Both damage seller trust and cause order fulfilment failures.

### Recommended Fix

Replace the manual compensation loop with a single atomic RPC that increments multiple stock values in one database transaction.

**SQL Migration — add to next migration file:**
```sql
CREATE OR REPLACE FUNCTION restore_product_stocks(
  items JSONB  -- [{"product_id": "uuid", "quantity": 3}, ...]
) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT value FROM jsonb_array_elements(items)
  LOOP
    UPDATE products
    SET    stock = stock + (item->>'quantity')::INT
    WHERE  id   = (item->>'product_id')::UUID;
  END LOOP;
END;
$$;
```

**Patch — `src/lib/supabase/orders.ts`** — replace both restoration blocks:
```typescript
async function restoreStock() {
  if (decrementedItems.length === 0) return
  await supabase.rpc('restore_product_stocks', {
    items: decrementedItems.map(i => ({
      product_id: i.productId,
      quantity:   i.quantity,
    })),
  })
}
```

This reduces N round-trips to 1 and makes the restoration truly atomic — all items restore or none do.

---

## H-03 — High — Unredacted Buyer IP Sent to Meta CAPI

**OWASP:** A02:2021 Cryptographic Failures (inadequate data protection)  
**ASVS:** 8.3.2 — Sensitive data not sent to non-essential third parties

### Code Location

`src/lib/analytics/server.ts` (approximate location based on agent analysis):
```typescript
userData.client_ip_address = clientIp   // ← sent plaintext to Meta, TikTok
userData.client_user_agent = clientUserAgent  // ← sent plaintext
```

`src/app/api/orders/route.ts:203-206`:
```typescript
await firePurchaseCAPI({
  ...
  clientIp: ip,
  clientUserAgent: req.headers.get('user-agent') ?? undefined,
})
```

The `email` and `phone` fields are correctly SHA-256 hashed before transmission (good). The IP address is transmitted in plaintext as the Meta CAPI spec requires — but this creates compliance obligations.

### Business Impact

**GDPR / Algerian Data Protection Act:** IP address is personal data. Sending it to Meta/TikTok without explicit user consent and a Data Processing Agreement (DPA) is a regulatory violation. Algeria's Law 18-07 on personal data protection applies.

**Practical risk:** Buyer geolocation (city/ISP level) is revealed to Meta and TikTok for every completed order, without any privacy notice to the buyer.

### Recommended Fix

1. **Immediate:** Ensure the site's privacy policy explicitly discloses IP address transmission to analytics providers.
2. **Better:** Hash the IP before sending to CAPI where the spec permits (Meta CAPI accepts hashed IPs for some matching strategies).
3. **Best:** Implement a consent gate — only fire CAPI for users who accepted analytics cookies.

**Patch — `src/lib/analytics/server.ts`:**
```typescript
// Hash IP before sending — reduces matching accuracy slightly but
// eliminates plaintext PII transmission to third parties
if (clientIp && clientIp !== '0.0.0.0') {
  userData.client_ip_address = crypto.createHash('sha256')
    .update(clientIp.trim())
    .digest('hex')
}
// Omit user-agent entirely — it provides minimal match lift vs PII cost
// userData.client_user_agent = clientUserAgent  // removed
```

---

## M-01 — Medium — TOTP Setup Secret in Server Logs

**OWASP:** A02:2021 Cryptographic Failures · A09:2021 Security Logging and Monitoring Failures  
**ASVS:** 7.1.1 — Credentials not logged

### Code Location

`src/app/api/admin/totp/route.ts:26`
```typescript
console.info('[TOTP SETUP] Copy this secret into ADMIN_TOTP_SECRET env var:', secret)
```

### Exploitation Scenario

The TOTP seed (`secret`) is a 20-byte Base32-encoded string. It is logged to `console.info` which Vercel persists in its runtime log store. Anyone with Vercel dashboard access, or any log-forwarding destination (Datadog, Sentry, Logtail), retains this secret indefinitely — long after setup is complete.

If logs are breached or an insider reads them, the attacker can clone the admin's TOTP device and bypass MFA.

Note: The endpoint correctly disables itself once `ADMIN_TOTP_SECRET` is set (line 18). The vulnerability only exists during the one-time setup window, but the log entry persists forever.

### Recommended Fix

Return the raw secret in the HTTP response (transmitted over HTTPS, not stored anywhere) and remove the `console.info`. The setup response is already protected: the endpoint is rate-limited (3/hour), requires no prior auth (acceptable — the admin is actively setting up), and is HTTPS-only in production.

**Patch — `src/app/api/admin/totp/route.ts`:**
```diff
  const secret  = generateTotpSecret()
  const qrCode  = await generateQrCode(secret)

- // Log secret server-side only — never send it to the browser
- console.info('[TOTP SETUP] Copy this secret into ADMIN_TOTP_SECRET env var:', secret)

  return NextResponse.json({
    qrCode,
+   secret,    // returned ONCE over HTTPS — admin copies to env var, page is not cached
    instruction:
      '1. Scan the QR code with Google Authenticator / Authy.\n' +
-     '2. Copy ADMIN_TOTP_SECRET from your server logs and set it as an environment variable.\n' +
+     '2. Copy the secret below and set it as the ADMIN_TOTP_SECRET environment variable.\n' +
      '3. This endpoint disables itself once the variable is set.',
  })
```

---

## M-02 — Medium — `select('*')` Pulling Encrypted Credential Columns

**OWASP:** API3:2023 Broken Object Property Level Authorization  
**ASVS:** 8.3.4 — Minimum necessary data returned

### Code Locations

`src/lib/notifications/seller.ts:43`
```typescript
.select('*')   // fetches meta_capi_token, tiktok_capi_token, gtag_api_secret
               // (all AES-256-GCM encrypted, but loaded into JS heap unnecessarily)
```

`src/lib/supabase/vendors.ts` (multiple lines: 252, 292, 305, 319)
```typescript
.select('*')
```

`src/lib/supabase/shipments.ts:52,114`
```typescript
.select('*')
```

### Risk

The encrypted credential fields (`meta_capi_token`, `tiktok_capi_token`, `gtag_api_secret`, `yalidine_api_token`, etc.) are fetched and deserialized into memory for every query that needs only basic fields like `store_name` or `is_active`. This:

1. Increases memory pressure unnecessarily on serverless workers
2. Means the encrypted bytes are present in heap dumps, error snapshots, and any accidental log of the response object
3. Makes code review harder — a future developer might accidentally log or return the full vendor object

### Recommended Fix

Replace `select('*')` with explicit column lists everywhere. Use the principle of minimal data access.

**Patch examples:**

`src/lib/notifications/seller.ts` — only need `id` and `email` (or notification fields):
```diff
- .select('*')
+ .select('id, email, store_name')
```

`src/lib/supabase/vendors.ts` — for the common profile query:
```diff
- .select('*')
+ .select('id, user_id, store_name, store_slug, logo_url, phone, wilaya, description, is_active, is_approved, is_on_vacation, vacation_message, verified_at, referral_code, return_policy, shipping_policy, low_stock_threshold, subscription_status')
  // Note: meta_capi_token, tiktok_capi_token, etc. intentionally omitted
```

Only `getVendorDeliveryConfig()` and `firePurchaseCAPI()` callers should select the encrypted fields, and only those functions.

---

## M-03 — Medium — No Webhook Signature on Satim Callback

**OWASP:** A08:2021 Software and Data Integrity Failures  
**ASVS:** 10.2.4 — Integrity of external data sources verified

### Code Location

`src/app/api/payment/callback/route.ts:1-82`

```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const result  = searchParams.get('result')
  const orderId = searchParams.get('orderId')
  const satimId = searchParams.get('mdOrder')
  // ↑ No signature check. Any HTTP client can call this URL.
```

The code correctly requires `mdOrder` and calls `satimGetOrderStatus(satimId)` before marking an order paid — this is the primary protection. However:

1. **Replay attack:** An attacker who observed a legitimate successful callback URL can re-send it. The idempotency guard (`status = 'pending_payment'`) prevents double-payment, but if the order is not yet processed, the replay races with the real callback.
2. **Denial-of-service on fail path:** If the code processes `result=fail` before calling Satim's API to verify, an attacker can send fake fail callbacks to cancel pending orders.

Checking the actual code for the fail path — the callback requires `mdOrder` to do anything meaningful. If `result=fail` without `mdOrder`, the server likely does nothing (verify in the actual code).

### Recommended Fix

Add HMAC-SHA256 signature verification using a shared secret with Satim (if Satim supports this). If Satim does not provide webhook signatures, restrict callback origin by IP.

```typescript
// If Satim provides a signing secret:
function verifySatimSignature(req: NextRequest, secret: string): boolean {
  const signature = req.headers.get('x-satim-signature')
  if (!signature) return false
  const body = new URL(req.url).searchParams.toString()
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

// At the top of the GET handler:
const sigSecret = process.env.SATIM_WEBHOOK_SECRET
if (sigSecret) {
  if (!verifySatimSignature(req, sigSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }
}
```

---

## M-04 — Medium — Delivery Test Endpoints Accept Credentials in Request Body

**OWASP:** API9:2023 Improper Inventory Management  
**ASVS:** 9.2.1 — TLS used for all credential transmission

### Code Locations

`src/app/api/seller/test-yalidine/route.ts:27-42`
```typescript
const { apiId, apiToken } = body as { apiId?: string; apiToken?: string }
// ...
const res = await fetch('https://api.yalidine.app/v1/agencies/', {
  headers: { 'X-API-ID': apiId, 'X-API-TOKEN': apiToken },
})
```

`src/app/api/seller/test-apec/route.ts` — identical pattern.

### Risks

1. **No ownership check:** Any authenticated seller can test credentials that don't belong to them. A seller could test another vendor's Yalidine credentials if they somehow obtained them, without the credential owner's knowledge.
2. **Credentials in request body:** While HTTPS encrypts transit, the credentials appear in access logs on the seller's browser, reverse proxy logs, and any monitoring middleware.
3. **No rate limiting on credential tests:** An attacker can use these endpoints to brute-force Yalidine/APEC API credentials at the rate of `checkSellerRateLimit` (60/60s) — far faster than Yalidine's own lockout.

### Recommended Fix

Replace body-supplied credentials with server-side lookup. Use the seller's stored (encrypted) credentials for the test:

**Patch — `src/app/api/seller/test-yalidine/route.ts`:**
```typescript
export async function POST(req: NextRequest) {
  // ... auth + rate limiting ...
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Fetch and decrypt stored credentials — never accept from client
  const config = await getVendorDeliveryConfig(vendor.id)
  const apiId    = config?.yalidine_api_id    ?? ''
  const apiToken = config?.yalidine_api_token ?? ''

  if (!apiId || !apiToken) {
    return NextResponse.json({ ok: false, error: 'No Yalidine credentials configured' }, { status: 400 })
  }

  const res = await fetch('https://api.yalidine.app/v1/agencies/', {
    headers: { 'X-API-ID': apiId, 'X-API-TOKEN': apiToken },
    signal: AbortSignal.timeout(10_000),
  })
  return NextResponse.json({ ok: res.ok, status: res.status })
}
```

---

## M-05 — Medium — Inconsistent Phone Normalization

**OWASP:** A04:2021 Insecure Design  
**ASVS:** 5.1.3 — Inputs validated on the server side

### Code Locations

Three different implementations across the codebase:

`src/lib/supabase/orders.ts:66-67` — strips formatting only:
```typescript
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().+]/g, '')
  // "05 51 23 45 67" → "0551234567"  (no country code)
}
```

`src/app/api/seller/verify-otp/route.ts:37-42` — enforces country code:
```typescript
function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.startsWith('213')) return d
  if (d.startsWith('0'))   return '213' + d.slice(1)
  return '213' + d
  // "0551234567" → "213551234567"
}
```

`src/app/api/track/route.ts` — validates and normalizes with regex.

### Exploitation Scenario

1. Seller sends OTP to buyer phone `213551234567` (stored in `password_reset_otps` as `213551234567`)
2. Order is placed with phone `0551234567` (stored as `0551234567` by `orders.ts:67`)
3. OTP verify route looks up OTP by normalized phone `213551234567`
4. Order cancel/return routes look up order by phone `0551234567`
5. Phone-based ownership check fails — buyer cannot cancel their own order

Beyond UX breakage, if two sellers share a phone number in different formats, cross-lookup could match the wrong record (unlikely with Algerian number formats but possible with edge cases).

### Recommended Fix

Create one canonical normalization function in `src/lib/utils/phone.ts` and import it everywhere.

**New file — `src/lib/utils/phone.ts`:**
```typescript
/**
 * Normalizes an Algerian phone number to the 12-digit 213XXXXXXXXX format.
 * Throws if the input cannot be mapped to a valid Algerian mobile number.
 */
export function normalizeAlgerianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('213') && digits.length === 12) return digits
  if (digits.startsWith('0')   && digits.length === 10) return '213' + digits.slice(1)
  throw new Error(`Invalid Algerian phone number: ${raw}`)
}

/** Both storage variants — used for DB lookups where format is unknown. */
export function phoneVariants(normalized: string): string[] {
  return [normalized, '0' + normalized.slice(3)]
}
```

Replace all three local `normalizePhone` implementations with `import { normalizeAlgerianPhone } from '@/lib/utils/phone'`.

---

## L-01 — Low — `Math.random()` for Storage File IDs

**OWASP:** A02:2021 Cryptographic Failures  
**ASVS:** 6.3.1 — CSPRNGs used for all security-relevant random values

### Code Location

`src/components/seller/ImageUploader.tsx:46`
```typescript
const uniqueId = Math.random().toString(36).slice(2, 10)
```

### Risk

`Math.random()` produces ~32 bits of entropy (implementation-dependent). Two concurrent uploads from the same seller could produce the same `uniqueId`, causing one file to silently overwrite the other. This is not a security vulnerability (no attacker benefit) but is a data integrity defect.

### Fix

```diff
- const uniqueId = Math.random().toString(36).slice(2, 10)
+ const uniqueId = crypto.randomUUID().replace(/-/g, '').slice(0, 16)
```

---

## L-02 — Low — Missing Audit Events

**OWASP:** A09:2021 Security Logging and Monitoring Failures  
**ASVS:** 7.2.1 — Authentication events logged; 7.2.2 — Sensitive operations logged

### Gaps

| Event | Where It Happens | Audit Log Written? |
|-------|-----------------|-------------------|
| Admin session revoked | `DELETE /api/admin/sessions/:id` → `revokeSessionById()` | ❌ No |
| Commission marked paid | `PATCH /api/admin/analytics/revenue` | ❌ No |
| Vendor verified | `POST /api/admin/vendors/:id/verify` | ❌ No |
| Admin totp setup | `GET /api/admin/totp` | ❌ No |

**Patch — `src/lib/auth/sessions.ts` — add to `revokeSessionById()`:**
```typescript
import { writeAuditLog } from '@/lib/auth/auditLog'

export async function revokeSessionById(sessionId: string): Promise<boolean> {
  // ... existing logic ...
  // After successful revocation:
  void writeAuditLog({ action: 'admin_session_revoked', meta: { sessionId } })
  return true
}
```

---

## L-03 — Low — Transitive Dependency CVEs

**OWASP:** A06:2021 Vulnerable and Outdated Components

| Package | CVE | Severity | Vector | Build/Runtime |
|---------|-----|----------|--------|---------------|
| `@opentelemetry/core <2.8.0` | GHSA-8988-4f7v-96qf | Moderate | Unbounded memory via W3C baggage header | Runtime (via Sentry) |
| `js-yaml <=4.1.1` | GHSA-h67p-54hq-rp68 | Moderate | DoS via YAML alias expansion | Build-time |
| `postcss <8.5.10` | GHSA-qx2v-qp2m-jg93 | Moderate | XSS in CSS `</style>` serialization | Build-time |

**Action:**
```bash
npm audit fix          # resolves @opentelemetry/core and js-yaml
# Do NOT run --force — would downgrade Next.js to 9.x
```

The `postcss` issue requires a Next.js upstream fix. Monitor the Next.js 15 release notes.

---

## ASVS Control Coverage

| ASVS Chapter | Control | Status |
|--------------|---------|--------|
| V2 — Authentication | 2.1.1 Password min length ≥ 8 | ✅ Enforced in verify-otp |
| V2 | 2.2.1 Anti-automation (brute force) | ✅ 5 attempts/15min |
| V2 | 2.8.4 TOTP replay protection | ✅ Counter in DB |
| V3 — Session | 3.2.1 New session token on auth | ✅ New JTI on login |
| V3 | 3.3.1 Logout invalidates server session | ✅ JTI blocklist |
| V3 | 3.5.3 JWT algorithm restricted | ✅ HS256 only |
| V4 — Access Control | 4.1.1 Server-side access decisions | ✅ requireAdmin, getUser |
| V4 | 4.1.3 Principle of least privilege | ⚠️ select('*') on vendor table |
| V4 | 4.2.2 IDOR: User-scoped queries | ✅ All mutations checked |
| V5 — Validation | 5.1.3 Server-side input validation | ❌ shippingCost from client |
| V5 | 5.2.1 Output encoding | ✅ jsStr() in analytics scripts |
| V6 — Crypto | 6.2.1 Approved algorithms | ✅ AES-256-GCM, HS256 |
| V6 | 6.3.1 CSPRNG for secrets | ⚠️ Math.random in ImageUploader |
| V7 — Errors | 7.1.1 Credentials not logged | ❌ TOTP secret in console.info |
| V7 | 7.4.1 Generic error messages | ✅ No stack traces in prod |
| V8 — Data Protection | 8.3.2 Minimum necessary data | ❌ select('*') with cred fields |
| V8 | 8.3.4 Sensitive data in APIs | ❌ Gift card balance exposed |
| V9 — Communication | 9.1.1 TLS for all connections | ✅ HTTPS enforced |
| V10 — Integrity | 10.2.4 Verify external data sources | ❌ No Satim webhook signature |
| V11 — Business Logic | 11.1.4 Prevent double submission | ⚠️ Promo race TOCTOU |
| V12 — Files | 12.2.1 Magic byte file validation | ✅ Implemented |
| V13 — API | 13.1.4 Routing not bypassed | ✅ requireAdmin on all routes |

---

## OWASP API Top 10 Coverage

| API Risk | Title | Status in This Codebase |
|----------|-------|------------------------|
| API1:2023 | Broken Object Level Authorization | ✅ Fixed (prior sessions) |
| API2:2023 | Broken Authentication | ⚠️ TOTP secret in logs (M-01) |
| API3:2023 | Broken Object Property Level Authorization | ⚠️ select('*') (M-02), gift card balance (H-01) |
| API4:2023 | Unrestricted Resource Consumption | ✅ Rate limits comprehensive |
| API5:2023 | Broken Function Level Authorization | ✅ Fixed (prior sessions) |
| API6:2023 | Unrestricted Access to Sensitive Business Flows | ❌ Shipping cost (C-01), promo race (C-02) |
| API7:2023 | Server Side Request Forgery | ✅ No open vectors |
| API8:2023 | Security Misconfiguration | ⚠️ 3 npm CVEs (L-03) |
| API9:2023 | Improper Inventory Management | ⚠️ Test credential endpoints (M-04) |
| API10:2023 | Unsafe Consumption of APIs | ⚠️ No Satim signature verification (M-03) |

---

## Remediation Priority

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| 1 | C-01 Shipping cost server-side | Medium (shipping_rates table) | Financial loss prevention |
| 2 | C-02 Promo increment before insert | Low (move 5 lines of code) | Discount integrity |
| 3 | H-01 Gift card validate — remove balance | Trivial (1 line) | Financial data protection |
| 4 | H-02 Atomic stock restoration RPC | Low (1 SQL function + 1 call) | Inventory integrity |
| 5 | H-03 Hash/omit IP in CAPI | Low (2 lines) | GDPR compliance |
| 6 | M-01 TOTP secret in response, not logs | Trivial (remove console.info) | Log security |
| 7 | M-02 Explicit select() columns | Medium (many files) | Defense-in-depth |
| 8 | M-04 Test endpoints use stored creds | Low (swap body read for DB lookup) | Credential hygiene |
| 9 | M-05 Unified phone normalization | Low (new utility file + imports) | Data integrity |
| 10 | M-03 Satim signature (if available) | Low-Medium | Webhook integrity |
| 11 | L-01 crypto.randomUUID for file IDs | Trivial | Correctness |
| 12 | L-02 Missing audit events | Trivial | Compliance |
| 13 | L-03 npm audit fix | Trivial | CVE closure |
