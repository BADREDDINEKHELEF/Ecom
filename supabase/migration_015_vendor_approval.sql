-- Migration 015: Vendor approval workflow
-- Adds admin_note field for decline reasons, changes default to require manual approval

-- Add admin_note for decline reasons
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- New stores must be explicitly approved (no more auto-approve)
ALTER TABLE public.vendors ALTER COLUMN is_approved SET DEFAULT false;

-- Index for fast pending queries
CREATE INDEX IF NOT EXISTS vendors_approval_idx ON public.vendors(is_approved, is_active);
