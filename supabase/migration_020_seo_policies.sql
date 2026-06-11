-- migration_020: Batch 5 — SEO, Store Policies & Verification Badge

-- Product SEO and condition fields
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_title       TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS meta_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS condition        TEXT DEFAULT 'new'
  CHECK (condition IN ('new', 'used', 'refurbished'));

-- Vendor policies and verification
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS return_policy   TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS shipping_policy TEXT;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS verified_at     TIMESTAMPTZ;
