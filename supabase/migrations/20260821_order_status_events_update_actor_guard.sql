-- The Admin Edge Function writes an explicit, correctly labelled Admin event.
-- Service-role updates have no auth.uid(), so the generic trigger must not add
-- a duplicate System event for those writes. Direct authenticated REST writes
-- by Customer/Merchant/Rider continue to be recorded by the trigger.
CREATE OR REPLACE FUNCTION public.record_order_status_event_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_label text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status OR v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  v_actor_label := CASE
    WHEN private.has_role('admin') THEN 'Admin'
    WHEN EXISTS (
      SELECT 1 FROM public.riders r
      WHERE r.id = NEW.rider_id AND r.user_id = v_actor
    ) THEN 'Rider'
    WHEN NEW.customer_id = v_actor THEN 'Customer'
    WHEN NEW.store_id IS NOT NULL AND private.owns_store(NEW.store_id) THEN 'Merchant'
    ELSE 'Authenticated'
  END;

  INSERT INTO public.order_status_events (order_id, status, actor_id, actor_label, created_at)
  VALUES (NEW.id, NEW.status, v_actor, v_actor_label, now());

  RETURN NEW;
END;
$$;
