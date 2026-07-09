-- Drop the insecure/unused direct client-side insert and delete policies on product-images
DROP POLICY IF EXISTS "Vendors upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Vendors delete own product images" ON storage.objects;

-- Ensure public read remains
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');
