-- Migration 052: Add separate ecom_api_key / ecom_api_token columns
-- The code (vendors.ts, dispatch.ts) now uses these as separate fields
-- instead of storing JSON in the legacy ecom_token column.

ALTER TABLE public.vendor_delivery_config
  ADD COLUMN IF NOT EXISTS ecom_api_key  TEXT,
  ADD COLUMN IF NOT EXISTS ecom_api_token TEXT;
