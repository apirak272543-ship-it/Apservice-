-- Include a verified Authorization bearer token for the JWT-protected cleanup function.
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
