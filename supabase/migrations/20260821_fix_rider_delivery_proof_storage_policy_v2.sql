-- Reapply the Rider delivery-proof policy under a unique migration name.
-- Production may already have a migration with the earlier generic name recorded,
-- so this migration explicitly replaces the stale policy expression.
DROP POLICY IF EXISTS "riders upload own delivery proof" ON storage.objects;

CREATE POLICY "riders upload own delivery proof"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'delivery-proofs'
  AND private.has_role('rider')
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND EXISTS (
    SELECT 1
    FROM public.delivery_orders o
    JOIN public.riders r ON r.id = o.rider_id
    WHERE o.id = (storage.foldername(name))[2]
      AND r.user_id = auth.uid()
  )
  AND storage.extension(name) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp'])
);
