-- Align rider-documents storage RLS with the private media helper path:
--   <auth.uid()>/rider-<rider.id>-<document_field>/<nonce>.jpg
-- Keep uploads, reads, and updates limited to the authenticated rider's own scope.

DROP POLICY IF EXISTS "riders upload own documents" ON storage.objects;
CREATE POLICY "riders upload own documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'rider-documents'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.riders r
    WHERE r.user_id = auth.uid()
      AND (storage.foldername(name))[2] LIKE ('rider-' || r.id || '-%')
  )
  AND storage.extension(name) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp'])
);

DROP POLICY IF EXISTS "riders update own documents" ON storage.objects;
CREATE POLICY "riders update own documents" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'rider-documents'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.riders r
    WHERE r.user_id = auth.uid()
      AND (storage.foldername(name))[2] LIKE ('rider-' || r.id || '-%')
  )
)
WITH CHECK (
  bucket_id = 'rider-documents'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.riders r
    WHERE r.user_id = auth.uid()
      AND (storage.foldername(name))[2] LIKE ('rider-' || r.id || '-%')
  )
  AND storage.extension(name) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp'])
);

DROP POLICY IF EXISTS "riders or admins read documents" ON storage.objects;
CREATE POLICY "riders or admins read documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'rider-documents'
  AND (
    private.has_role('admin')
    OR (
      (storage.foldername(name))[1] = (auth.uid())::text
      AND EXISTS (
        SELECT 1
        FROM public.riders r
        WHERE r.user_id = auth.uid()
          AND (storage.foldername(name))[2] LIKE ('rider-' || r.id || '-%')
      )
    )
  )
);

NOTIFY pgrst, 'reload schema';
