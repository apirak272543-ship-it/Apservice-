-- Persist every legacy status transition performed after order creation.
-- Customer checkout already records the initial status event; this trigger fills
-- the missing Merchant/Rider/Admin transitions used by Admin order history.
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
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  v_actor_label := CASE
    WHEN v_actor IS NULL THEN 'System'
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

DROP TRIGGER IF EXISTS delivery_orders_record_status_event ON public.delivery_orders;
CREATE TRIGGER delivery_orders_record_status_event
AFTER UPDATE OF status ON public.delivery_orders
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.record_order_status_event_on_update();
