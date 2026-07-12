-- Migration 053: Add Procolis API key and ZR Express API key columns
-- These are required by the corrected Procolis v1 and ZR Express integrations.
-- Values are encrypted at the application layer before storage.

ALTER TABLE public.vendor_delivery_config
  ADD COLUMN IF NOT EXISTS procolis_key TEXT,
  ADD COLUMN IF NOT EXISTS zr_key       TEXT;
