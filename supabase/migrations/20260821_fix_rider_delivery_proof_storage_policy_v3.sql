-- Qualify the outer storage object name explicitly. Without qualification,
-- PostgreSQL resolves name inside the rider subquery to riders.name, recreating
-- the original false comparison and rejecting valid uploads.
DROP POLICY IF EXISTS "riders upload own delivery proof" ON storage.objects;
DROP POLICY IF EXISTS "riders upload own delivery proof by path" ON storage.objects;

CREATE POLICY "riders upload own delivery proof"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'delivery-proofs'
  AND private.has_role('rider')
  AND (storage.foldername(storage.objects.name))[1] = (auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.delivery_orders o
    JOIN public.riders r ON r.id = o.rider_id
    WHERE o.id = (storage.foldername(storage.objects.name))[2]
      AND r.user_id = auth.uid()
  )
  AND storage.extension(storage.objects.name) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp'])
);
