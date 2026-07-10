-- Migration: Harden product-images storage policies
-- Replaces the overly permissive policies from migration_026 with vendor-scoped
-- policies that allow uploads/deletes only by the vendor owner or a team member.
-- Server-side uploads still bypass RLS via service_role, so this hardens
-- any future client-side direct uploads against credential theft.

-- Ensure the bucket exists with sane limits.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop legacy permissive policies if they exist.
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors delete own product images" ON storage.objects;

-- Public read access (bucket is public).
CREATE POLICY "product_images_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');

-- Vendor-scoped upload: the first path segment must be a vendor id owned by
-- the authenticated user, or a vendor id where the user is an active team member.
CREATE POLICY "product_images_vendor_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.uid() IS NOT NULL
    AND (
      -- owner
      EXISTS (
        SELECT 1 FROM public.vendors
        WHERE id::text = (storage.foldername(name))[1]
          AND user_id = auth.uid()
      )
      OR
      -- active team member
      EXISTS (
        SELECT 1 FROM public.vendor_members vm
        JOIN public.vendors v ON v.id = vm.vendor_id
        WHERE v.id::text = (storage.foldername(name))[1]
          AND vm.user_id = auth.uid()
          AND v.is_active = true
      )
    )
  );

-- Vendor-scoped delete: same ownership/membership check as insert.
CREATE POLICY "product_images_vendor_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.vendors
        WHERE id::text = (storage.foldername(name))[1]
          AND user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.vendor_members vm
        JOIN public.vendors v ON v.id = vm.vendor_id
        WHERE v.id::text = (storage.foldername(name))[1]
          AND vm.user_id = auth.uid()
          AND v.is_active = true
      )
    )
  );

-- Storage migrations require manual enablement of the pg_net extension for RPCs.
-- This migration only uses storage.* and public.* tables, no external HTTP calls.
