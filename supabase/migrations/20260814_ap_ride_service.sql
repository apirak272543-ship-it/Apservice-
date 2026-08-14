-- AP Ride: motorcycle passenger transport with privacy-safe Rider discovery.
-- Base fare is 50 THB including the first 3 km; additional distance costs 12 THB/km.

ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS profile_image_url text,
  ADD COLUMN IF NOT EXISTS ride_license_class_2_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ride_safety_clearance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ride_service_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ride_available boolean NOT NULL DEFAULT false;

ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS ride_selected_rider_id text REFERENCES public.riders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ride_base_fare numeric NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS ride_included_km numeric NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS ride_rate_per_km numeric NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS ride_destination_address text,
  ADD COLUMN IF NOT EXISTS ride_destination_location jsonb,
  ADD COLUMN IF NOT EXISTS ride_destination_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS ride_passenger_count integer NOT NULL DEFAULT 1 CHECK (ride_passenger_count BETWEEN 1 AND 2);

CREATE INDEX IF NOT EXISTS delivery_orders_ap_ride_selected_idx ON public.delivery_orders(ride_selected_rider_id, status) WHERE service_type = 'ap_ride';
CREATE INDEX IF NOT EXISTS riders_ap_ride_available_idx ON public.riders(ride_available, ride_service_enabled, rating) WHERE ride_available = true AND ride_service_enabled = true;

CREATE OR REPLACE FUNCTION public.list_eligible_ride_riders()
RETURNS TABLE(rider_id text, rider_name text, profile_image_url text, rating numeric, review_count integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.id, r.name, r.profile_image_url, COALESCE(r.rating, 0), COALESCE(r.review_count, 0)
  FROM public.riders r
  WHERE r.status = 'พร้อมรับงาน'
    AND r.ride_available = true
    AND r.ride_service_enabled = true
    AND r.ride_license_class_2_verified = true
    AND r.ride_safety_clearance = true
    AND COALESCE(r.rating, 0) >= 4
  ORDER BY r.rating DESC, r.review_count DESC, r.name ASC
  LIMIT 30;
$$;

CREATE OR REPLACE FUNCTION public.customer_select_ride_rider(p_order_id text, p_rider_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.delivery_orders o
    WHERE o.id = p_order_id AND o.customer_id = auth.uid()
      AND o.service_type = 'ap_ride' AND o.rider_id IS NULL
  ) THEN RAISE EXCEPTION 'Ride booking is unavailable or does not belong to this customer'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.riders r
    WHERE r.id = p_rider_id AND r.status = 'พร้อมรับงาน' AND r.ride_available = true
      AND r.ride_service_enabled = true AND r.ride_license_class_2_verified = true
      AND r.ride_safety_clearance = true AND COALESCE(r.rating, 0) >= 4
  ) THEN RAISE EXCEPTION 'Selected Rider is no longer available'; END IF;
  UPDATE public.delivery_orders
  SET ride_selected_rider_id = p_rider_id, status = 'รอ Rider ยืนยันรับงาน', updated_at = now()
  WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rider_confirm_ride_job(p_order_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_rider_id text;
BEGIN
  SELECT id INTO v_rider_id FROM public.riders WHERE user_id = auth.uid();
  IF v_rider_id IS NULL THEN RAISE EXCEPTION 'Rider profile not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.riders WHERE id = v_rider_id AND ride_service_enabled AND ride_available AND ride_license_class_2_verified AND ride_safety_clearance AND COALESCE(rating,0) >= 4) THEN RAISE EXCEPTION 'You are not eligible for AP Ride'; END IF;
  UPDATE public.delivery_orders
  SET rider_id = v_rider_id, rider_name = (SELECT name FROM public.riders WHERE id = v_rider_id), status = 'ไรเดอร์กำลังไปรับผู้โดยสาร', accepted_at = now(), updated_at = now()
  WHERE id = p_order_id AND service_type = 'ap_ride' AND rider_id IS NULL AND ride_selected_rider_id = v_rider_id AND status = 'รอ Rider ยืนยันรับงาน';
  IF NOT FOUND THEN RAISE EXCEPTION 'Ride job is no longer available'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.rider_set_ride_destination(p_order_id text, p_destination_address text, p_destination_location jsonb)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_rider_id text; v_pickup jsonb; v_distance numeric; v_fare numeric; v_lat1 double precision; v_lng1 double precision; v_lat2 double precision; v_lng2 double precision;
BEGIN
  SELECT id INTO v_rider_id FROM public.riders WHERE user_id = auth.uid();
  SELECT pickup_location INTO v_pickup FROM public.delivery_orders WHERE id = p_order_id AND service_type = 'ap_ride' AND rider_id = v_rider_id;
  IF v_pickup IS NULL THEN RAISE EXCEPTION 'Ride booking or pickup location not found'; END IF;
  v_lat1 := (v_pickup->>'lat')::double precision; v_lng1 := (v_pickup->>'lng')::double precision; v_lat2 := (p_destination_location->>'lat')::double precision; v_lng2 := (p_destination_location->>'lng')::double precision;
  IF v_lat1 IS NULL OR v_lng1 IS NULL OR v_lat2 IS NULL OR v_lng2 IS NULL THEN RAISE EXCEPTION 'A valid pickup and destination location are required'; END IF;
  v_distance := 6371 * acos(LEAST(1, GREATEST(-1, cos(radians(v_lat1))*cos(radians(v_lat2))*cos(radians(v_lng2)-radians(v_lng1))+sin(radians(v_lat1))*sin(radians(v_lat2)))));
  v_fare := ROUND(50 + GREATEST(0, v_distance - 3) * 12, 0);
  UPDATE public.delivery_orders SET ride_destination_address = LEFT(COALESCE(p_destination_address,''),500), ride_destination_location = p_destination_location, ride_destination_set_at = now(), distance_km = ROUND(v_distance,2), delivery_fee = v_fare, payable = v_fare, total = v_fare, status = 'กำลังพาผู้โดยสารไปจุดหมาย', delivery_started_at = now(), updated_at = now() WHERE id = p_order_id AND rider_id = v_rider_id;
  RETURN v_fare;
END;
$$;

REVOKE ALL ON FUNCTION public.list_eligible_ride_riders() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.customer_select_ride_rider(text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rider_confirm_ride_job(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rider_set_ride_destination(text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_eligible_ride_riders() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_select_ride_rider(text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_confirm_ride_job(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rider_set_ride_destination(text,text,jsonb) TO authenticated;
