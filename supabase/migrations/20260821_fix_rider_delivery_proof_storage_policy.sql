-- Rider delivery proof uploads use <auth.uid>/<delivery_order_id>/<nonce>.jpg.
-- The previous policy compared the order ID to a Rider profile name,
-- which is unrelated to the uploaded object path and rejected valid Rider uploads.
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
