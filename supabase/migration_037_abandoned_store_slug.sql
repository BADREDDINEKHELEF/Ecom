-- Add store_slug to abandoned_checkouts for vendor-scoped filtering
ALTER TABLE public.abandoned_checkouts
  ADD COLUMN IF NOT EXISTS store_slug TEXT;

CREATE INDEX IF NOT EXISTS abandoned_store_slug_idx
  ON public.abandoned_checkouts(store_slug, status, updated_at DESC);
