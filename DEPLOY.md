# ShopDZ — Free Production Deployment Guide

Deploy ShopDZ for **free** using Vercel (hosting) + Supabase (database + auth). Both have generous free tiers sufficient for an MVP.

**Estimated setup time:** 30–45 minutes  
**Monthly cost:** $0 (within free tier limits)

---

## Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| Vercel Hobby | 100 GB bandwidth, unlimited deployments |
| Supabase Free | 500 MB database, 2 GB storage, 50k auth users |

---

## Step 1 — Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a region close to Algeria (e.g., `eu-west-1` Frankfurt or `eu-central-1`)
3. Save your **database password** — you'll need it later

### Run Migrations

In the Supabase dashboard → **SQL Editor**, run each migration file **in order**:

```
supabase/migration_002_shipments.sql
supabase/migration_003_security_hardening.sql
supabase/migration_004_seller_improvements.sql
supabase/migration_004_payments_and_stores.sql
supabase/migration_005_stock_decrement.sql
supabase/migration_006_cod_analytics.sql
supabase/migration_007_token_blacklist.sql
supabase/migration_008_audit_log.sql
```

### Collect Your Keys

In Supabase → **Settings → API**:

- `NEXT_PUBLIC_SUPABASE_URL` → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `anon` / `public` key
- `SUPABASE_SERVICE_ROLE_KEY` → `service_role` key (**never expose this to the browser**)

---

## Step 2 — Generate Secrets Locally

Run these commands in your terminal (requires OpenSSL):

```bash
# Admin JWT signing key (min 32 bytes)
openssl rand -base64 48

# Admin login password
openssl rand -base64 24

# Field encryption key (must be exactly 64 hex chars)
openssl rand -hex 32
```

Save each output — you'll paste them into Vercel env vars.

---

## Step 3 — Deploy to Vercel

### Option A: Vercel CLI (recommended)

```bash
npm i -g vercel
vercel login
vercel --prod
```

Follow the prompts. When asked about the framework, select **Next.js**.

### Option B: GitHub Integration

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import from GitHub
3. Select your repository
4. Vercel auto-detects Next.js — click **Deploy**

---

## Step 4 — Set Environment Variables

In Vercel Dashboard → your project → **Settings → Environment Variables**, add:

### Required

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | From Step 1 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | From Step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | From Step 1 — mark as **Secret** |
| `ADMIN_JWT_SECRET` | output of `openssl rand -base64 48` | Mark as **Secret** |
| `ADMIN_SECRET` | output of `openssl rand -base64 24` | Mark as **Secret** — your admin password |
| `FIELD_ENCRYPTION_KEY` | output of `openssl rand -hex 32` | Mark as **Secret** |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Your Vercel URL |

### Optional (add when you have them)

| Variable | Notes |
|----------|-------|
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Business — WhatsApp API Setup |
| `WHATSAPP_ACCESS_TOKEN` | Meta Business — system user token |
| `YALIDINE_API_ID` | Yalidine delivery integration |
| `YALIDINE_API_TOKEN` | Yalidine delivery integration |
| `SATIM_USERNAME` | CIB/Edahabia online payment |
| `SATIM_PASSWORD` | CIB/Edahabia online payment |
| `SATIM_TERMINAL_ID` | CIB/Edahabia online payment |
| `BARIDIMOB_MERCHANT_ID` | BaridiMob QR payment |
| `BARIDIMOB_API_KEY` | BaridiMob QR payment |

After adding env vars, click **Redeploy** to apply them.

---

## Step 5 — Configure Supabase Auth

In Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: add `https://your-app.vercel.app/**`

---

## Step 6 — First Admin Login

1. Visit `https://your-app.vercel.app/admin/login`
2. Enter the password you set as `ADMIN_SECRET`
3. If you want 2FA: hit the TOTP setup endpoint once (see `src/app/api/admin/totp/route.ts`) and scan the QR code with Google Authenticator

---

## Step 7 — Custom Domain (Optional, Free)

Vercel lets you add a custom domain for free:

1. Buy a `.dz` domain from [NIC.dz](https://www.nic.dz) or a `.com` from Namecheap (~$10/year)
2. In Vercel → **Settings → Domains** → Add your domain
3. Follow the DNS instructions Vercel provides
4. Update `NEXT_PUBLIC_APP_URL` to your custom domain and redeploy

---

## Step 8 — Verify Deployment

Run through this checklist after deploy:

- [ ] Homepage loads and shows products (not empty)
- [ ] Admin login works at `/admin`
- [ ] A test order can be placed (COD method)
- [ ] Seller dashboard accessible at `/seller`
- [ ] `/api/health` returns `{ status: "ok" }`

---

## Scaling Beyond Free Tier

When you outgrow the free tier:

| Need | Solution | Cost |
|------|----------|------|
| More database storage | Supabase Pro | $25/month |
| Higher bandwidth | Vercel Pro | $20/month |
| Distributed rate limiting | Upstash Redis | ~$0 (100k req/day free) |
| Email notifications | Resend | Free up to 3k/month |
| Better observability | Logtail (connected to Vercel logs) | Free tier available |

---

## Troubleshooting

**Build fails on Vercel:**  
Check that all required env vars are set. The startup validator (`src/instrumentation.ts`) will log exactly which vars are missing — check the Vercel function logs.

**"Supabase connection refused":**  
Verify `NEXT_PUBLIC_SUPABASE_URL` does not have a trailing slash and matches your project URL exactly.

**Admin login says "Invalid credentials":**  
Ensure `ADMIN_SECRET` in Vercel matches what you're typing. Env var changes require a redeploy.

**Orders not saving:**  
Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly and all migration files have been run in order.

**WhatsApp notifications not sending:**  
Verify `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` are set. The app will silently skip WhatsApp if they're missing (orders still succeed). Check Vercel function logs for `[WhatsApp]` entries.
