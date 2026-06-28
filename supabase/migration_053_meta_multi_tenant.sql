-- Migration 053: Multi-tenant Meta tracking columns
-- Adds enable/disable, test event code, and dataset ID to each vendor's Meta config.

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS meta_enabled        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_test_event_code TEXT,
  ADD COLUMN IF NOT EXISTS meta_dataset_id      TEXT;

-- Index for admin queries filtering by Meta-enabled vendors
CREATE INDEX IF NOT EXISTS vendors_meta_enabled_idx ON public.vendors (meta_enabled)
  WHERE meta_enabled = true;
