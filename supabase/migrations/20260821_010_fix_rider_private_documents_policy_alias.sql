-- Fix the policy subquery alias so it checks the storage object path,
-- not riders.name inside the correlated riders query.

DROP POLICY IF EXISTS "riders upload own documents" ON storage.objects;
CREATE POLICY "riders upload own documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'rider-documents'
  AND (storage.foldername(storage.objects.name))[1] = (auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.riders r
    WHERE r.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[2] LIKE ('rider-' || r.id || '-%')
  )
  AND storage.extension(storage.objects.name) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp'])
);

DROP POLICY IF EXISTS "riders update own documents" ON storage.objects;
CREATE POLICY "riders update own documents" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'rider-documents'
  AND (storage.foldername(storage.objects.name))[1] = (auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.riders r
    WHERE r.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[2] LIKE ('rider-' || r.id || '-%')
  )
)
WITH CHECK (
  bucket_id = 'rider-documents'
  AND (storage.foldername(storage.objects.name))[1] = (auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.riders r
    WHERE r.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[2] LIKE ('rider-' || r.id || '-%')
  )
  AND storage.extension(storage.objects.name) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp'])
);

DROP POLICY IF EXISTS "riders or admins read documents" ON storage.objects;
CREATE POLICY "riders or admins read documents" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'rider-documents'
  AND (
    private.has_role('admin')
    OR (
      (storage.foldername(storage.objects.name))[1] = (auth.uid())::text
      AND EXISTS (
        SELECT 1
        FROM public.riders r
        WHERE r.user_id = auth.uid()
          AND (storage.foldername(storage.objects.name))[2] LIKE ('rider-' || r.id || '-%')
      )
    )
  )
);

NOTIFY pgrst, 'reload schema';
