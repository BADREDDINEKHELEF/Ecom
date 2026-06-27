-- Migration 050: Enable RLS on admin_sessions table to resolve security audit issue
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
