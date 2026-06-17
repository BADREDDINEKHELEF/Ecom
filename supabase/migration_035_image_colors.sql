-- Add image_colors column to store per-image color labels
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_colors TEXT[] DEFAULT '{}';
