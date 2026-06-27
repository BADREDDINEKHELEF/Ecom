-- Migration 051: Enable RLS on all remaining tables to resolve database linter errors
ALTER TABLE public.admin_revoked_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_used_totp_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_data_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
