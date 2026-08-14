-- AP Service error-monitoring retention policy.
-- Scope is intentionally restricted to error_reports and error-evidence only.
-- This migration never reads, updates, or deletes customer, order, payment, wallet, store, or rider records.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- The browser already compresses evidence below 1 MB. Enforce the same limit at Storage level.
UPDATE storage.buckets
SET file_size_limit = 1000000
WHERE id = 'error-evidence';

CREATE INDEX IF NOT EXISTS error_reports_created_at_retention_idx
ON public.error_reports (created_at);

-- Configure a daily 03:17 Asia/Bangkok job (20:17 UTC). Secrets must first be stored in Vault with these names:
-- error_cleanup_project_url and error_cleanup_anon_key.
CREATE OR REPLACE FUNCTION private.configure_error_cleanup_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  existing_job record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'error_cleanup_project_url')
     OR NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'error_cleanup_anon_key') THEN
    RAISE EXCEPTION 'Missing Vault secrets for error cleanup schedule';
  END IF;

  FOR existing_job IN SELECT jobid FROM cron.job WHERE jobname = 'apservice-error-retention-daily' LOOP
    PERFORM cron.unschedule(existing_job.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'apservice-error-retention-daily',
    '17 20 * * *',
    $job$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'error_cleanup_project_url') || '/functions/v1/error-retention-cleanup',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'error_cleanup_anon_key'),
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'error_cleanup_anon_key')
        ),
        body := '{"scheduled":true}'::jsonb
      );
    $job$
  );
END;
$$;

REVOKE ALL ON FUNCTION private.configure_error_cleanup_cron() FROM PUBLIC, anon, authenticated;
