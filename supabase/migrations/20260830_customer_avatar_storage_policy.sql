-- Allow customers to upload only their own compressed profile avatar.
-- The shared media pipeline already compresses USER_AVATAR to <= 350 KB;
-- the bucket itself enforces the hard 1,000,000-byte limit.
DROP POLICY IF EXISTS "catalog media customers upload own avatar" ON storage.objects;
CREATE POLICY "catalog media customers upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'catalog-media'
  AND private.has_role('customer')
  AND (storage.foldername(name))[1] = 'customer'
  AND (storage.foldername(name))[2] = (auth.uid())::text
  AND (storage.foldername(name))[3] = 'customer-avatar'
  AND storage.extension(name) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp'])
);

COMMENT ON POLICY "catalog media customers upload own avatar" ON storage.objects IS
  'Customer avatar uploads are scoped to customer/<auth.uid()>/customer-avatar and protected by the 1 MB catalog-media bucket limit.';
