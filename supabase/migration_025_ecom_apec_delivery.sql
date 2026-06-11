-- Migration 025: Add Ecom Delivery and APEC Delivery provider columns
ALTER TABLE public.vendor_delivery_config
  ADD COLUMN IF NOT EXISTS ecom_token   TEXT,
  ADD COLUMN IF NOT EXISTS apec_api_id  TEXT,
  ADD COLUMN IF NOT EXISTS apec_api_token TEXT;
