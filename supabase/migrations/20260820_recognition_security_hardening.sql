-- Recognition jobs are database-scheduled tasks only. They must never be callable from client RPCs.
REVOKE EXECUTE ON FUNCTION public.fn_run_daily_recognition() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_run_weekly_recognition() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_run_monthly_recognition() FROM PUBLIC, anon, authenticated;

-- This owner-scoped mutation uses the existing UPDATE RLS policy instead of SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.recognition_mark_event_seen(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE public.recognition_events
  SET seen_at = coalesce(seen_at, now()), updated_at = now()
  WHERE id = p_event_id
    AND subject_user_id = auth.uid();

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recognition_mark_event_seen(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recognition_mark_event_seen(uuid) TO authenticated;
