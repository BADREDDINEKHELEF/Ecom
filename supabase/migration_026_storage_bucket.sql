-- Migration 026: Product images storage bucket
-- Run this in Supabase SQL Editor (Storage > Policies)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760,  -- 10 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read images (bucket is public, but policy is required)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read product images'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Public read product images"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'product-images');
    $policy$;
  END IF;
END $$;

-- Allow authenticated users to upload to their vendor folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Vendors upload product images'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Vendors upload product images"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'product-images');
    $policy$;
  END IF;
END $$;

-- Allow authenticated users to delete their own images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Vendors delete own product images'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Vendors delete own product images"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'product-images');
    $policy$;
  END IF;
END $$;
