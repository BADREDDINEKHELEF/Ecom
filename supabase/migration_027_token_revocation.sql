-- Migration 027: Admin JWT token revocation blocklist
-- Revoked JTIs are stored here so stolen tokens can't be reused after logout.
-- The middleware does fast JWT-only validation; per-route requireAdmin() checks this table.

CREATE TABLE IF NOT EXISTS public.admin_revoked_tokens (
  jti        TEXT        PRIMARY KEY,
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Server-only table — accessed exclusively via service role client
ALTER TABLE public.admin_revoked_tokens DISABLE ROW LEVEL SECURITY;

-- Fast lookup when checking revocation at request time
CREATE INDEX IF NOT EXISTS idx_admin_revoked_tokens_expires
  ON public.admin_revoked_tokens(expires_at);

-- Periodic cleanup: remove entries whose tokens have already expired naturally.
-- Call this from a pg_cron job or Supabase Edge Function cron.
CREATE OR REPLACE FUNCTION public.cleanup_expired_revoked_tokens()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.admin_revoked_tokens WHERE expires_at < now();
$$;
