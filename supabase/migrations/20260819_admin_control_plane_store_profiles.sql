BEGIN;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS legal_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS registration_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contact_email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS registered_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pickup_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS registration_document_url text NOT NULL DEFAULT '';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-documents',
  'store-documents',
  false,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 1048576,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

DROP POLICY IF EXISTS "admins upload store documents" ON storage.objects;
DROP POLICY IF EXISTS "admins read store documents" ON storage.objects;

CREATE POLICY "admins upload store documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'store-documents'
  AND private.has_role('admin')
  AND storage.extension(name) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp'])
);

CREATE POLICY "admins read store documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'store-documents'
  AND private.has_role('admin')
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
DECLARE
  v_before public.withdrawal_requests%ROWTYPE;
  v_after jsonb;
BEGIN
  IF NOT private.has_role('admin') THEN
    RAISE EXCEPTION 'Only administrators can review withdrawals';
  END IF;
  IF p_action NOT IN ('approved', 'rejected', 'paid') THEN
    RAISE EXCEPTION 'Invalid review action';
  END IF;

  SELECT * INTO v_before
  FROM public.withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE;
  IF NOT FOUND OR v_before.status NOT IN ('requested', 'approved') THEN
    RAISE EXCEPTION 'Withdrawal request not found or already closed';
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
  RETURNING to_jsonb(withdrawal_requests) INTO v_after;

  INSERT INTO public.admin_action_audit (actor_id, target_user_id, action, reason, before_state, after_state)
  VALUES (
    auth.uid(),
    NULL,
    'withdrawal_' || p_action,
    LEFT(COALESCE(p_admin_note, ''), 500),
    to_jsonb(v_before),
    COALESCE(v_after, '{}'::jsonb)
  );
END;
$function$;

COMMIT;
