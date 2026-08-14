-- AP Ride eligibility must follow the centrally reviewed compliance decision.

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
    AND r.identity_verified = true
    AND r.criminal_record_checked = true
    AND r.compliance_status = 'approved'
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
  ) THEN
    RAISE EXCEPTION 'Ride booking is unavailable or does not belong to this customer';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.riders r
    WHERE r.id = p_rider_id
      AND r.status = 'พร้อมรับงาน'
      AND r.ride_available = true
      AND r.ride_service_enabled = true
      AND r.ride_license_class_2_verified = true
      AND r.ride_safety_clearance = true
      AND r.identity_verified = true
      AND r.criminal_record_checked = true
      AND r.compliance_status = 'approved'
      AND COALESCE(r.rating, 0) >= 4
  ) THEN
    RAISE EXCEPTION 'Selected Rider is no longer available';
  END IF;
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
  IF NOT EXISTS (
    SELECT 1 FROM public.riders
    WHERE id = v_rider_id
      AND ride_service_enabled
      AND ride_available
      AND ride_license_class_2_verified
      AND ride_safety_clearance
      AND identity_verified
      AND criminal_record_checked
      AND compliance_status = 'approved'
      AND COALESCE(rating,0) >= 4
  ) THEN RAISE EXCEPTION 'You are not eligible for AP Ride'; END IF;
  UPDATE public.delivery_orders
  SET rider_id = v_rider_id,
      rider_name = (SELECT name FROM public.riders WHERE id = v_rider_id),
      status = 'ไรเดอร์กำลังไปรับผู้โดยสาร',
      accepted_at = now(),
      updated_at = now()
  WHERE id = p_order_id
    AND service_type = 'ap_ride'
    AND rider_id IS NULL
    AND ride_selected_rider_id = v_rider_id
    AND status = 'รอ Rider ยืนยันรับงาน';
  IF NOT FOUND THEN RAISE EXCEPTION 'Ride job is no longer available'; END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
