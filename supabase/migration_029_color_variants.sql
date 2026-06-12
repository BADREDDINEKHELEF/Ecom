-- Migration 029: Color variants per product
-- Adds a JSONB column to store per-color image galleries

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS color_variants JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.color_variants IS
  'Array of { name: string, hex: string, images: string[] } — one entry per color option';
