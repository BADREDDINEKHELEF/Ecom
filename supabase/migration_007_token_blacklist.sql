-- Migration 007: JWT token blacklist for admin logout / revocation
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS admin_token_blacklist (
  jti        TEXT        PRIMARY KEY,           -- JWT ID claim (unique per token)
  expires_at TIMESTAMPTZ NOT NULL,              -- original token exp, for cleanup
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-clean expired tokens daily (keeps table small)
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON admin_token_blacklist (expires_at);

-- RLS: only service_role may read/write (admin API uses service role key)
ALTER TABLE admin_token_blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON admin_token_blacklist
  USING (auth.role() = 'service_role');

-- Cleanup function — call from a pg_cron job or on-demand
CREATE OR REPLACE FUNCTION purge_expired_tokens()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM admin_token_blacklist WHERE expires_at < NOW();
$$;
