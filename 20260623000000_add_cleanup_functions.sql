-- Function to delete revoked token records that are past their natural expiry date.
-- This keeps the admin_revoked_tokens table small and performant.
CREATE OR REPLACE FUNCTION cleanup_expired_revoked_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM public.admin_revoked_tokens
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to delete old admin session records.
-- This purges sessions that expired more than 30 days ago to keep the
-- admin_sessions table from growing indefinitely.
CREATE OR REPLACE FUNCTION cleanup_old_admin_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.admin_sessions
  WHERE expires_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;