const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const migrationPath = path.join(projectRoot, 'supabase/migrations/20260820_recognition_center.sql');
const outputPath = path.join(projectRoot, '.recognition-apply-input.json');
const securityMigrationPath = path.join(projectRoot, 'supabase/migrations/20260820_recognition_security_hardening.sql');
const securityOutputPath = path.join(projectRoot, '.recognition-security-apply-input.json');
const verifyOutputPath = path.join(projectRoot, '.recognition-verify-input.json');
const smokeOutputPath = path.join(projectRoot, '.recognition-smoke-input.json');
const securityVerifyOutputPath = path.join(projectRoot, '.recognition-security-verify-input.json');

fs.writeFileSync(outputPath, JSON.stringify({
  project_id: 'abtsctwfkgzciseppach',
  name: 'recognition_center_v1',
  query: fs.readFileSync(migrationPath, 'utf8'),
}));

fs.writeFileSync(securityOutputPath, JSON.stringify({
  project_id: 'abtsctwfkgzciseppach',
  name: 'recognition_security_hardening',
  query: fs.readFileSync(securityMigrationPath, 'utf8'),
}));

fs.writeFileSync(verifyOutputPath, JSON.stringify({
  project_id: 'abtsctwfkgzciseppach',
  query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('recognition_config', 'recognition_snapshots', 'recognition_events') ORDER BY table_name LIMIT 10;
SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('fn_compute_store_tier', 'fn_compute_rider_tier', 'fn_run_daily_recognition', 'fn_run_weekly_recognition', 'fn_run_monthly_recognition', 'recognition_mark_event_seen') ORDER BY routine_name LIMIT 10;
SELECT jobname, schedule, command FROM cron.job WHERE jobname LIKE 'apservice-recognition-%' ORDER BY jobname LIMIT 10;`,
}));

fs.writeFileSync(smokeOutputPath, JSON.stringify({
  project_id: 'abtsctwfkgzciseppach',
  query: `WITH execution AS (SELECT public.fn_run_daily_recognition() AS records_processed)
SELECT execution.records_processed,
  (SELECT count(*) FROM public.recognition_snapshots WHERE scope = 'daily' AND period_end = ((now() AT TIME ZONE 'Asia/Bangkok')::date::timestamp AT TIME ZONE 'Asia/Bangkok')) AS daily_snapshot_count
FROM execution
LIMIT 1;`,
}));

fs.writeFileSync(securityVerifyOutputPath, JSON.stringify({
  project_id: 'abtsctwfkgzciseppach',
  query: `SELECT
  has_function_privilege('anon', 'public.fn_run_daily_recognition()', 'EXECUTE') AS anon_can_run_daily,
  has_function_privilege('authenticated', 'public.fn_run_daily_recognition()', 'EXECUTE') AS authenticated_can_run_daily,
  has_function_privilege('anon', 'public.fn_run_weekly_recognition()', 'EXECUTE') AS anon_can_run_weekly,
  has_function_privilege('authenticated', 'public.fn_run_monthly_recognition()', 'EXECUTE') AS authenticated_can_run_monthly,
  has_function_privilege('authenticated', 'public.recognition_mark_event_seen(uuid)', 'EXECUTE') AS authenticated_can_mark_seen
LIMIT 1;`,
}));
