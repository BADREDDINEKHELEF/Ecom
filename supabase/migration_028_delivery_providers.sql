-- Migration 028: Add Colivraison, Maystro, Rex, Yassir credentials to vendor_delivery_config
-- These are stored encrypted at the application layer (encryptField / decryptField).

ALTER TABLE public.vendor_delivery_config
  ADD COLUMN IF NOT EXISTS colivraison_token TEXT,
  ADD COLUMN IF NOT EXISTS maystro_token     TEXT,
  ADD COLUMN IF NOT EXISTS rex_token         TEXT,
  ADD COLUMN IF NOT EXISTS yassir_api_key    TEXT;
