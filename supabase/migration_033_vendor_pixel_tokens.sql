-- Migration 033: Vendor TikTok pixel + CAPI server-side tokens
-- These columns were referenced in code but missing from the DB, causing 500 on settings save.

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS tiktok_pixel_id   TEXT,
  ADD COLUMN IF NOT EXISTS meta_capi_token   TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_capi_token TEXT,
  ADD COLUMN IF NOT EXISTS gtag_api_secret   TEXT;
