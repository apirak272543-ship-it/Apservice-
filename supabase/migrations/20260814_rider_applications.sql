-- Rider applications stay separate from active rider accounts. A user becomes an
-- active rider only after an administrator reviews and approves this application.
CREATE TABLE IF NOT EXISTS public.rider_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  registered_address text NOT NULL,
  work_experience text NOT NULL DEFAULT '',
  vehicle_type text NOT NULL,
  vehicle_registration text NOT NULL,
  documents jsonb NOT NULL DEFAULT '{}'::jsonb,
  criminal_record_consent boolean NOT NULL DEFAULT false,
  terms_accepted boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_review','approved','rejected')),
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rider_applications_status_submitted_idx
  ON public.rider_applications(status, submitted_at DESC);

ALTER TABLE public.rider_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rider_applications_select_applicant_or_admin" ON public.rider_applications;
CREATE POLICY "rider_applications_select_applicant_or_admin" ON public.rider_applications
  FOR SELECT TO authenticated
  USING (applicant_id = auth.uid() OR private.has_role('admin'));

DROP POLICY IF EXISTS "rider_applications_insert_self" ON public.rider_applications;
CREATE POLICY "rider_applications_insert_self" ON public.rider_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    applicant_id = auth.uid()
    AND status = 'pending'
    AND terms_accepted IS TRUE
    AND criminal_record_consent IS TRUE
  );

DROP POLICY IF EXISTS "rider_applications_update_self_while_pending" ON public.rider_applications;
CREATE POLICY "rider_applications_update_self_while_pending" ON public.rider_applications
  FOR UPDATE TO authenticated
  USING (applicant_id = auth.uid() AND status = 'pending')
  WITH CHECK (
    applicant_id = auth.uid()
    AND status = 'pending'
    AND terms_accepted IS TRUE
    AND criminal_record_consent IS TRUE
  );

DROP POLICY IF EXISTS "rider_applications_admin_manage" ON public.rider_applications;
CREATE POLICY "rider_applications_admin_manage" ON public.rider_applications
  FOR ALL TO authenticated
  USING (private.has_role('admin'))
  WITH CHECK (private.has_role('admin'));

GRANT SELECT, INSERT, UPDATE ON public.rider_applications TO authenticated;

-- Documents are private. An applicant can upload only into their own UUID folder;
-- only the applicant and platform administrators may read the uploaded files.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rider-application-documents',
  'rider-application-documents',
  false,
  1048576,
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "rider_application_docs_insert_self" ON storage.objects;
CREATE POLICY "rider_application_docs_insert_self" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rider-application-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

DROP POLICY IF EXISTS "rider_application_docs_select_owner_or_admin" ON storage.objects;
CREATE POLICY "rider_application_docs_select_owner_or_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'rider-application-documents'
    AND (
      (storage.foldername(name))[1] = (SELECT auth.uid()::text)
      OR private.has_role('admin')
    )
  );

DROP POLICY IF EXISTS "rider_application_docs_delete_self" ON storage.objects;
CREATE POLICY "rider_application_docs_delete_self" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'rider-application-documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  );

NOTIFY pgrst, 'reload schema';
