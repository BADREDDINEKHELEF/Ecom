-- migration_023: Batch 9 — Business Features
-- B2B invoice fields on orders

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_b2b        BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS company_name  TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS nif           TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS nis           TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rc            TEXT;
