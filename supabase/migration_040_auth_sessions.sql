-- Migration 040: Device-aware admin session tracking + TOTP replay protection
--
-- admin_sessions:           one row per login; JTI rotates on each token refresh
--                           so the admin can see and revoke individual browser sessions.
-- admin_used_totp_counters: prevents replaying a TOTP code within the same 30-second window.

-- ── Admin sessions ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_sessions (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jti               TEXT        NOT NULL UNIQUE,   -- current token JTI (updated on each refresh)
  device_fingerprint TEXT       NOT NULL,           -- SHA-256(ua||ip)[0:16] — no raw PII stored
  ip_address        TEXT        NOT NULL,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ NOT NULL,
  is_active         BOOLEAN     NOT NULL DEFAULT true
);

-- No RLS — server-only table, accessed exclusively via the service_role client
ALTER TABLE public.admin_sessions DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_sessions_jti
  ON public.admin_sessions(jti);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_active
  ON public.admin_sessions(is_active, expires_at);

-- ── TOTP replay protection ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_used_totp_counters (
  counter BIGINT      NOT NULL PRIMARY KEY,   -- floor(unix_time / 30)
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS — server-only table
ALTER TABLE public.admin_used_totp_counters DISABLE ROW LEVEL SECURITY;

-- ── Cleanup helpers ──────────────────────────────────────────────────────────

-- Remove inactive / expired sessions older than 7 days (call from a pg_cron job)
CREATE OR REPLACE FUNCTION public.cleanup_old_admin_sessions()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.admin_sessions
  WHERE (is_active = false OR expires_at < now())
    AND created_at < now() - INTERVAL '7 days';
$$;
