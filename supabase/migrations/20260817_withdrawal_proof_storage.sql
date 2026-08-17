BEGIN;

ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS proof_available boolean NOT NULL DEFAULT false;

UPDATE public.withdrawal_requests
SET proof_available = true
WHERE status = 'paid'
  AND COALESCE(trim(proof_image_url), '') <> ''
  AND proof_available = false;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'withdrawal-proofs',
  'withdrawal-proofs',
  false,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 1048576,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

DROP POLICY IF EXISTS "admins upload withdrawal proofs" ON storage.objects;
DROP POLICY IF EXISTS "admins read withdrawal proofs" ON storage.objects;
DROP POLICY IF EXISTS "riders read own withdrawal proofs" ON storage.objects;

CREATE POLICY "admins upload withdrawal proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'withdrawal-proofs'
  AND private.has_role('admin')
  AND storage.extension(name) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp'])
);

CREATE POLICY "admins read withdrawal proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'withdrawal-proofs'
  AND private.has_role('admin')
);

CREATE POLICY "riders read own withdrawal proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'withdrawal-proofs'
  AND EXISTS (
    SELECT 1
    FROM public.withdrawal_requests request
    JOIN public.riders rider ON rider.id = request.rider_id
    WHERE request.recipient_type = 'rider'
      AND request.proof_image_url = bucket_id || '/' || name
      AND rider.user_id = auth.uid()
  )
);

CREATE OR REPLACE FUNCTION public.admin_review_withdrawal(
  p_request_id uuid,
  p_action text,
  p_proof_image_url text DEFAULT '',
  p_payment_reference text DEFAULT '',
  p_admin_note text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
BEGIN
  IF NOT private.has_role('admin') THEN
    RAISE EXCEPTION 'Only administrators can review withdrawals';
  END IF;
  IF p_action NOT IN ('approved', 'rejected', 'paid') THEN
    RAISE EXCEPTION 'Invalid review action';
  END IF;
  IF p_action = 'paid' AND COALESCE(trim(p_proof_image_url), '') = '' THEN
    RAISE EXCEPTION 'Payment proof image is required';
  END IF;

  UPDATE public.withdrawal_requests
  SET status = p_action,
      admin_note = LEFT(COALESCE(p_admin_note, ''), 500),
      proof_image_url = CASE WHEN p_action = 'paid' THEN p_proof_image_url ELSE proof_image_url END,
      proof_available = CASE WHEN p_action = 'paid' THEN true ELSE proof_available END,
      payment_reference = CASE WHEN p_action = 'paid' THEN COALESCE(p_payment_reference, '') ELSE payment_reference END,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      paid_at = CASE WHEN p_action = 'paid' THEN now() ELSE paid_at END
  WHERE id = p_request_id
    AND status IN ('requested', 'approved');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found or already closed';
  END IF;
END;
$function$;

COMMIT;
