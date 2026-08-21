-- Rider-submitted document references are held in a review queue.
-- Protected fields on public.riders remain Admin-only and are changed only by review_rider_compliance.

CREATE TABLE IF NOT EXISTS public.rider_document_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id text NOT NULL REFERENCES public.riders(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  note text NOT NULL DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rider_document_submissions_review_idx
  ON public.rider_document_submissions(rider_id, status, submitted_at DESC);

ALTER TABLE public.rider_document_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rider document submissions read own or admin" ON public.rider_document_submissions;
CREATE POLICY "rider document submissions read own or admin" ON public.rider_document_submissions
FOR SELECT TO authenticated
USING (applicant_id = auth.uid() OR private.has_role('admin'));

DROP POLICY IF EXISTS "rider document submissions insert own pending" ON public.rider_document_submissions;
CREATE POLICY "rider document submissions insert own pending" ON public.rider_document_submissions
FOR INSERT TO authenticated
WITH CHECK (
  applicant_id = auth.uid()
  AND status = 'pending'
  AND EXISTS (SELECT 1 FROM public.riders r WHERE r.id = rider_id AND r.user_id = auth.uid())
);

DROP POLICY IF EXISTS "rider document submissions update own pending" ON public.rider_document_submissions;
CREATE POLICY "rider document submissions update own pending" ON public.rider_document_submissions
FOR UPDATE TO authenticated
USING (applicant_id = auth.uid() AND status = 'pending')
WITH CHECK (applicant_id = auth.uid() AND status = 'pending');

DROP POLICY IF EXISTS "admins manage rider document submissions" ON public.rider_document_submissions;
CREATE POLICY "admins manage rider document submissions" ON public.rider_document_submissions
FOR ALL TO authenticated
USING (private.has_role('admin'))
WITH CHECK (private.has_role('admin'));

GRANT SELECT, INSERT, UPDATE ON public.rider_document_submissions TO authenticated;

NOTIFY pgrst, 'reload schema';
