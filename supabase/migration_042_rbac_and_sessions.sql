-- migration_042_rbac_and_sessions.sql
-- Phase 2 (RBAC) + Phase 1 (Seller Sessions) + Phase 6 (Security Events)

-- ── 1. VENDOR MEMBERS ────────────────────────────────────────────────────────
-- Enables multi-user vendor access with role-based permissions.
-- 'owner' is implicit via vendors.user_id — never stored here.

CREATE TABLE IF NOT EXISTS public.vendor_members (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id   UUID        NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'manager'
              CHECK (role IN ('manager', 'support', 'readonly')),
  invited_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vendor_id, user_id)
);

-- Service-role only — all reads/writes go through API, not client SDK
ALTER TABLE public.vendor_members DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_vendor_members_user     ON public.vendor_members(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_members_vendor   ON public.vendor_members(vendor_id);

-- ── 2. SELLER SESSIONS ───────────────────────────────────────────────────────
-- Device-level session tracking for seller accounts.
-- Provides: active device list, suspicious login detection, session revocation.
-- device_hash = SHA-256(UA || IP)[:16] — opaque fingerprint, no raw PII.

CREATE TABLE IF NOT EXISTS public.seller_sessions (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id     UUID        REFERENCES public.vendors(id) ON DELETE CASCADE,
  device_hash   TEXT        NOT NULL,
  ip_address    TEXT,
  user_agent    TEXT,
  last_seen_at  TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  is_revoked    BOOLEAN     DEFAULT false,
  revoked_at    TIMESTAMPTZ,
  UNIQUE(user_id, device_hash)
);

ALTER TABLE public.seller_sessions DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_seller_sessions_user_id   ON public.seller_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_sessions_vendor_id ON public.seller_sessions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_seller_sessions_last_seen ON public.seller_sessions(last_seen_at DESC);

-- ── 3. SECURITY EVENTS ───────────────────────────────────────────────────────
-- Unified, immutable security audit trail across admin, seller, and system.
-- Covers: logins, logouts, password changes, role changes, rate limit blocks,
--         payment anomalies, customer data access, failed auth attempts.
-- This table must NEVER be UPDATE/DELETE'd — append-only by design.

CREATE TABLE IF NOT EXISTS public.security_events (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_type  TEXT        NOT NULL
              CHECK (actor_type IN ('admin', 'seller', 'system', 'anonymous')),
  actor_id    TEXT,        -- user_id, vendor_id, or 'system'
  action      TEXT        NOT NULL,
  resource    TEXT,        -- e.g., 'order:uuid', 'customer:hash'
  ip_address  TEXT,
  user_agent  TEXT,
  result      TEXT        NOT NULL DEFAULT 'success'
              CHECK (result IN ('success', 'failure', 'blocked')),
  meta        JSONB,       -- structured context — NEVER put raw secrets/PII here
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Append-only: disable RLS, service-role inserts only
ALTER TABLE public.security_events DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_security_events_actor     ON public.security_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_security_events_action    ON public.security_events(action);
CREATE INDEX IF NOT EXISTS idx_security_events_created   ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip        ON public.security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_result    ON public.security_events(result)
  WHERE result IN ('failure', 'blocked');
