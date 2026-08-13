-- Shared store-operations schema used by Customer, Admin and Store Console.
-- All operational times use Asia/Bangkok and support one same-day opening window.

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS open_time time NOT NULL DEFAULT time '00:00',
  ADD COLUMN IF NOT EXISTS close_time time NOT NULL DEFAULT time '23:59',
  ADD COLUMN IF NOT EXISTS order_cutoff_minutes integer NOT NULL DEFAULT 30 CHECK (order_cutoff_minutes BETWEEN 0 AND 180),
  ADD COLUMN IF NOT EXISTS emergency_closed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_note text,
  ADD COLUMN IF NOT EXISTS emergency_closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0);

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS rating numeric NOT NULL DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0);

CREATE TABLE IF NOT EXISTS public.order_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('store', 'rider')),
  store_id text REFERENCES public.stores(id) ON DELETE SET NULL,
  rider_id text REFERENCES public.riders(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '' CHECK (char_length(comment) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_reviews_target_match CHECK (
    (target_type = 'store' AND store_id IS NOT NULL AND rider_id IS NULL)
    OR (target_type = 'rider' AND rider_id IS NOT NULL AND store_id IS NULL)
  ),
  CONSTRAINT order_reviews_one_target_per_customer UNIQUE (order_id, reviewer_id, target_type)
);

CREATE INDEX IF NOT EXISTS order_reviews_store_created_idx ON public.order_reviews(store_id, created_at DESC) WHERE target_type = 'store';
CREATE INDEX IF NOT EXISTS order_reviews_rider_created_idx ON public.order_reviews(rider_id, created_at DESC) WHERE target_type = 'rider';

-- A public client can use the catalog only for stores that are not suspended.
-- Store owners and admins must still be able to load their own temporarily closed store.
DROP POLICY IF EXISTS "stores_public_active_read" ON public.stores;
CREATE POLICY "stores_public_available_read" ON public.stores
  FOR SELECT USING (active IS TRUE AND emergency_closed IS FALSE);
DROP POLICY IF EXISTS "stores_owner_or_admin_read" ON public.stores;
CREATE POLICY "stores_owner_or_admin_read" ON public.stores
  FOR SELECT USING (private.owns_store(id) OR private.has_role('admin'));

ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_customer_insert_completed_order" ON public.order_reviews;
CREATE POLICY "reviews_customer_insert_completed_order" ON public.order_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.delivery_orders o
      WHERE o.id = order_id
        AND o.customer_id = auth.uid()
        AND o.completed_at IS NOT NULL
        AND (
          (target_type = 'store' AND store_id = o.store_id)
          OR (target_type = 'rider' AND rider_id = o.rider_id)
        )
    )
  );
DROP POLICY IF EXISTS "reviews_participant_read" ON public.order_reviews;
CREATE POLICY "reviews_participant_read" ON public.order_reviews
  FOR SELECT TO authenticated
  USING (
    reviewer_id = auth.uid()
    OR private.has_role('admin')
    OR (target_type = 'store' AND private.owns_store(store_id))
    OR (target_type = 'rider' AND private.owns_rider(rider_id))
  );

CREATE OR REPLACE FUNCTION private.store_accepts_food_orders(target_store_id text, at_time timestamptz DEFAULT now())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = target_store_id
      AND s.active IS TRUE
      AND s.emergency_closed IS FALSE
      AND ((at_time AT TIME ZONE 'Asia/Bangkok')::time >= s.open_time)
      AND ((at_time AT TIME ZONE 'Asia/Bangkok')::time < (s.close_time - make_interval(mins => s.order_cutoff_minutes)))
  );
$$;
REVOKE ALL ON FUNCTION private.store_accepts_food_orders(text, timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.validate_food_order_window()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  IF NEW.service_type = 'food' AND (NEW.store_id IS NULL OR NOT private.store_accepts_food_orders(NEW.store_id, COALESCE(NEW.ordered_at, now()))) THEN
    RAISE EXCEPTION 'ร้านค้านี้ไม่อยู่ในช่วงรับออร์เดอร์หรือใกล้เวลาปิดร้าน';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_food_order_window() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS delivery_orders_validate_food_window ON public.delivery_orders;
CREATE TRIGGER delivery_orders_validate_food_window
  BEFORE INSERT ON public.delivery_orders
  FOR EACH ROW EXECUTE FUNCTION private.validate_food_order_window();

CREATE OR REPLACE FUNCTION private.refresh_target_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  changed_store_id text := COALESCE(NEW.store_id, OLD.store_id);
  changed_rider_id text := COALESCE(NEW.rider_id, OLD.rider_id);
BEGIN
  IF changed_store_id IS NOT NULL THEN
    UPDATE public.stores
    SET rating = COALESCE((SELECT round(avg(r.rating)::numeric, 1) FROM public.order_reviews r WHERE r.target_type = 'store' AND r.store_id = changed_store_id), 0),
        review_count = (SELECT count(*) FROM public.order_reviews r WHERE r.target_type = 'store' AND r.store_id = changed_store_id),
        updated_at = now()
    WHERE id = changed_store_id;
  END IF;
  IF changed_rider_id IS NOT NULL THEN
    UPDATE public.riders
    SET rating = COALESCE((SELECT round(avg(r.rating)::numeric, 1) FROM public.order_reviews r WHERE r.target_type = 'rider' AND r.rider_id = changed_rider_id), 0),
        review_count = (SELECT count(*) FROM public.order_reviews r WHERE r.target_type = 'rider' AND r.rider_id = changed_rider_id),
        updated_at = now()
    WHERE id = changed_rider_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION private.refresh_target_rating() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS order_reviews_refresh_target_rating ON public.order_reviews;
CREATE TRIGGER order_reviews_refresh_target_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.order_reviews
  FOR EACH ROW EXECUTE FUNCTION private.refresh_target_rating();

CREATE OR REPLACE VIEW public.catalog_stores AS
SELECT id, name, emoji, description, rating, eta, location, active,
       image_url, review_count, open_time, close_time, order_cutoff_minutes, emergency_closed, emergency_note
FROM public.stores
WHERE active IS TRUE AND emergency_closed IS FALSE;

CREATE OR REPLACE VIEW public.catalog_menu_items AS
SELECT id, store_id, name, emoji, description, price, available, promo,
       image_url, stock
FROM public.menu_items;

GRANT SELECT ON public.catalog_stores, public.catalog_menu_items TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
