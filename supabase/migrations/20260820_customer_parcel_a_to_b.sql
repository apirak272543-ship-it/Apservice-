-- Customer A→B parcel requests use delivery_orders so Admin/Rider dispatch retains one auditable lifecycle.
CREATE OR REPLACE FUNCTION public.create_customer_parcel_delivery(
  p_pickup_address text,
  p_pickup_location jsonb,
  p_delivery_address text,
  p_delivery_location jsonb,
  p_recipient_name text,
  p_recipient_phone text,
  p_parcel_description text,
  p_delivery_note text DEFAULT '',
  p_payment_method text DEFAULT 'เงินสดปลายทาง (COD)',
  p_idempotency_key text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_customer_id uuid := auth.uid();
  v_customer_name text;
  v_order public.delivery_orders;
  v_rules jsonb;
  v_pickup_lat double precision;
  v_pickup_lng double precision;
  v_delivery_lat double precision;
  v_delivery_lng double precision;
  v_distance numeric;
  v_base_fee numeric;
  v_included_km numeric;
  v_per_km_fee numeric;
  v_multiplier numeric;
  v_service_fee numeric;
  v_fee numeric;
BEGIN
  IF v_customer_id IS NULL OR NOT private.has_role('customer') THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบด้วยบัญชีลูกค้าก่อนสร้างคำขอส่งของ';
  END IF;
  IF char_length(btrim(coalesce(p_pickup_address, ''))) NOT BETWEEN 3 AND 1000
     OR char_length(btrim(coalesce(p_delivery_address, ''))) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION 'กรุณาระบุที่อยู่จุดรับและจุดส่งให้ครบ';
  END IF;
  IF char_length(btrim(coalesce(p_recipient_name, ''))) NOT BETWEEN 2 AND 160
     OR char_length(btrim(coalesce(p_recipient_phone, ''))) NOT BETWEEN 6 AND 32 THEN
    RAISE EXCEPTION 'กรุณาระบุชื่อและโทรศัพท์ผู้รับให้ถูกต้อง';
  END IF;
  IF char_length(btrim(coalesce(p_parcel_description, ''))) NOT BETWEEN 3 AND 300
     OR char_length(btrim(coalesce(p_delivery_note, ''))) > 800 THEN
    RAISE EXCEPTION 'รายละเอียดสิ่งของหรือหมายเหตุไม่อยู่ในช่วงที่อนุญาต';
  END IF;
  IF p_payment_method NOT IN ('เงินสดปลายทาง (COD)', 'โอนผ่าน QR / แนบสลิป') THEN
    RAISE EXCEPTION 'วิธีชำระเงินไม่อยู่ในรายการที่อนุญาต';
  END IF;
  IF char_length(btrim(coalesce(p_idempotency_key, ''))) NOT BETWEEN 12 AND 220 THEN
    RAISE EXCEPTION 'รหัสยืนยันคำขอไม่ถูกต้อง กรุณาลองใหม่';
  END IF;
  BEGIN
    v_pickup_lat := (p_pickup_location ->> 'lat')::double precision;
    v_pickup_lng := (p_pickup_location ->> 'lng')::double precision;
    v_delivery_lat := (p_delivery_location ->> 'lat')::double precision;
    v_delivery_lng := (p_delivery_location ->> 'lng')::double precision;
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'พิกัดจุดรับหรือจุดส่งไม่ถูกต้อง';
  END;
  IF v_pickup_lat IS NULL OR v_pickup_lng IS NULL OR v_delivery_lat IS NULL OR v_delivery_lng IS NULL
     OR abs(v_pickup_lat) > 90 OR abs(v_delivery_lat) > 90 OR abs(v_pickup_lng) > 180 OR abs(v_delivery_lng) > 180 THEN
    RAISE EXCEPTION 'พิกัดจุดรับหรือจุดส่งอยู่นอกช่วงที่อนุญาต';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_customer_id::text || ':' || btrim(p_idempotency_key)));
  SELECT * INTO v_order FROM public.delivery_orders WHERE customer_id = v_customer_id AND checkout_idempotency_key = btrim(p_idempotency_key) LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status, 'delivery_fee', v_order.delivery_fee, 'payable', v_order.payable, 'distance_km', v_order.distance_km, 'replayed', true);
  END IF;
  SELECT value -> 'parcel' INTO v_rules FROM public.platform_configs WHERE key = 'business_rules';
  IF v_rules IS NULL THEN RAISE EXCEPTION 'ผู้ดูแลยังไม่ได้ตั้งกติกาค่าส่งบริการ A→B'; END IF;
  BEGIN
    v_base_fee := (v_rules ->> 'base_fee')::numeric; v_included_km := (v_rules ->> 'included_km')::numeric; v_per_km_fee := (v_rules ->> 'per_km_fee')::numeric; v_multiplier := (v_rules ->> 'zone_multiplier')::numeric; v_service_fee := (v_rules ->> 'service_fee')::numeric;
  EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'กติกาค่าส่งบริการ A→B ไม่อยู่ในรูปแบบตัวเลข'; END;
  IF v_base_fee < 0 OR v_included_km < 0 OR v_per_km_fee < 0 OR v_multiplier <= 0 OR v_service_fee < 0 THEN RAISE EXCEPTION 'กติกาค่าส่งบริการ A→B ไม่ครบหรือไม่ถูกต้อง'; END IF;
  v_distance := 6371 * 2 * asin(sqrt(power(sin(radians(v_delivery_lat - v_pickup_lat) / 2), 2) + cos(radians(v_pickup_lat)) * cos(radians(v_delivery_lat)) * power(sin(radians(v_delivery_lng - v_pickup_lng) / 2), 2)));
  v_fee := round((v_base_fee + greatest(0, v_distance - v_included_km) * v_per_km_fee) * v_multiplier, 2);
  SELECT coalesce(nullif(btrim(display_name), ''), coalesce(auth.jwt() ->> 'email', 'ลูกค้า')) INTO v_customer_name FROM public.user_profiles WHERE user_id = v_customer_id LIMIT 1;
  INSERT INTO public.delivery_orders(customer_id, customer_email, customer_name, store_id, store_name, service_type, status, workflow_state, total, payable, delivery_fee, payment_method, pickup_address, pickup_location, delivery_address, delivery_recipient_name, delivery_recipient_phone, delivery_note, delivery_location, distance_km, note, delivery_snapshot, checkout_idempotency_key, ordered_at)
  VALUES(v_customer_id, coalesce(auth.jwt() ->> 'email', ''), left(coalesce(v_customer_name, 'ลูกค้า'), 160), NULL, 'ส่งของ A → B', 'parcel', 'ร้านค้ารับออร์เดอร์', 'store_accepted', 0, round(v_fee + v_service_fee, 2), v_fee, p_payment_method, left(btrim(p_pickup_address), 1000), p_pickup_location, left(btrim(p_delivery_address), 1000), left(btrim(p_recipient_name), 160), left(btrim(p_recipient_phone), 32), left(btrim(p_delivery_note), 800), p_delivery_location, round(v_distance, 3), left('สิ่งของ: ' || btrim(p_parcel_description), 1000), jsonb_build_object('service', 'parcel_a_to_b', 'parcel_description', btrim(p_parcel_description), 'pickup', jsonb_build_object('address', btrim(p_pickup_address), 'location', p_pickup_location), 'dropoff', jsonb_build_object('address', btrim(p_delivery_address), 'location', p_delivery_location, 'recipient_name', btrim(p_recipient_name), 'recipient_phone', btrim(p_recipient_phone)), 'created_at', now()), btrim(p_idempotency_key), now())
  RETURNING * INTO v_order;
  RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status, 'delivery_fee', v_order.delivery_fee, 'payable', v_order.payable, 'distance_km', v_order.distance_km, 'replayed', false);
END;
$$;
REVOKE ALL ON FUNCTION public.create_customer_parcel_delivery(text, jsonb, text, jsonb, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_customer_parcel_delivery(text, jsonb, text, jsonb, text, text, text, text, text, text) TO authenticated;
