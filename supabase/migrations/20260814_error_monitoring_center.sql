-- Secure error-reporting center. Reports are sanitized server-side and evidence
-- stays in a private bucket visible only to the master administrator.

CREATE OR REPLACE FUNCTION private.is_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT private.has_role('admin')
    AND lower(coalesce(auth.jwt() ->> 'email', '')) IN (
      'apirak272543@gmail.com',
      'apirak27254@gmail.com'
    );
$$;

CREATE OR REPLACE FUNCTION private.redact_error_text(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  value text := left(coalesce(input_text, ''), 2400);
BEGIN
  value := regexp_replace(value, '(?i)(authorization|bearer|token|api[_ -]?key|password|secret)\s*[:=]\s*[^\s,;]+', '\1=[REDACTED]', 'g');
  value := regexp_replace(value, '(?i)[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}', '[EMAIL_REDACTED]', 'g');
  value := regexp_replace(value, '(?<!\d)(?:\+?66|0)\d{8,10}(?!\d)', '[PHONE_REDACTED]', 'g');
  value := regexp_replace(value, '(?i)sb_publishable_[A-Za-z0-9_\-]+', '[PUBLISHABLE_KEY_REDACTED]', 'g');
  RETURN value;
END;
$$;

CREATE TABLE IF NOT EXISTS public.error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  reporter_role text NOT NULL DEFAULT 'customer' CHECK (reporter_role IN ('customer', 'rider', 'store_owner', 'admin')),
  app_source text NOT NULL CHECK (app_source IN ('customer', 'rider', 'store')),
  source_type text NOT NULL DEFAULT 'automatic' CHECK (source_type IN ('automatic', 'manual')),
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  error_code text NOT NULL DEFAULT 'UNCLASSIFIED',
  title text NOT NULL DEFAULT 'เกิดข้อผิดพลาดในระบบ',
  message text NOT NULL DEFAULT '',
  route text NOT NULL DEFAULT '',
  sanitized_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_path text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'resolved', 'dismissed')),
  analysis_status text NOT NULL DEFAULT 'not_requested' CHECK (analysis_status IN ('not_requested', 'awaiting_approval', 'approved_for_review', 'reviewed', 'rejected')),
  analysis_summary text,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS error_reports_created_status_idx
  ON public.error_reports (created_at DESC, status, severity);
CREATE INDEX IF NOT EXISTS error_reports_reporter_idx
  ON public.error_reports (reporter_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.sanitize_error_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.title := left(private.redact_error_text(NEW.title), 180);
  NEW.message := private.redact_error_text(NEW.message);
  NEW.error_code := left(regexp_replace(coalesce(NEW.error_code, 'UNCLASSIFIED'), '[^A-Za-z0-9_\-:.]', '', 'g'), 100);
  NEW.route := left(regexp_replace(coalesce(NEW.route, ''), '\?.*$', ''), 500);
  NEW.sanitized_context := jsonb_strip_nulls(jsonb_build_object(
    'event_type', left(coalesce(NEW.sanitized_context ->> 'event_type', ''), 80),
    'http_status', left(coalesce(NEW.sanitized_context ->> 'http_status', ''), 12),
    'screen', left(coalesce(NEW.sanitized_context ->> 'screen', ''), 120),
    'app_version', left(coalesce(NEW.sanitized_context ->> 'app_version', ''), 60)
  ));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sanitize_error_report_before_write ON public.error_reports;
CREATE TRIGGER sanitize_error_report_before_write
BEFORE INSERT OR UPDATE ON public.error_reports
FOR EACH ROW EXECUTE FUNCTION private.sanitize_error_report();

ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "error reporters create own reports" ON public.error_reports;
CREATE POLICY "error reporters create own reports"
ON public.error_reports FOR INSERT TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
  AND status = 'new'
  AND analysis_status = 'not_requested'
  AND approved_at IS NULL AND approved_by IS NULL
  AND resolved_at IS NULL AND resolved_by IS NULL
);

DROP POLICY IF EXISTS "error reporters view own reports" ON public.error_reports;
CREATE POLICY "error reporters view own reports"
ON public.error_reports FOR SELECT TO authenticated
USING (reporter_id = auth.uid() OR private.is_master_admin());

DROP POLICY IF EXISTS "master admins manage error reports" ON public.error_reports;
CREATE POLICY "master admins manage error reports"
ON public.error_reports FOR UPDATE TO authenticated
USING (private.is_master_admin())
WITH CHECK (private.is_master_admin());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('error-evidence', 'error-evidence', false, 2000000, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 2000000,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "reporters upload own error evidence" ON storage.objects;
CREATE POLICY "reporters upload own error evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'error-evidence'
  AND (storage.foldername(name))[1] = (select auth.uid()::text)
  AND storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp')
);

DROP POLICY IF EXISTS "master admins read error evidence" ON storage.objects;
CREATE POLICY "master admins read error evidence"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'error-evidence' AND private.is_master_admin());
