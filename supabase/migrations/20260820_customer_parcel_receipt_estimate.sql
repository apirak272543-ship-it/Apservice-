-- Preview only: the customer sees an authoritative distance and fee summary before creating a parcel delivery order.
-- The create RPC remains the sole writer to delivery_orders and recomputes this server-side for integrity.
CREATE OR REPLACE FUNCTION public.estimate_customer_parcel_delivery(
  p_pickup_location jsonb,
  p_delivery_location jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_pickup_lat double precision;
  v_pickup_lng double precision;
  v_delivery_lat double precision;
  v_delivery_lng double precision;
  v_rules jsonb;
  v_distance numeric;
  v_base_fee numeric;
  v_included_km numeric;
  v_per_km_fee numeric;
  v_multiplier numeric;
  v_service_fee numeric;
  v_delivery_fee numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT private.has_role('customer') THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบด้วยบัญชีลูกค้าก่อนตรวจสอบค่าจัดส่ง';
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
  SELECT value -> 'parcel' INTO v_rules FROM public.platform_configs WHERE key = 'business_rules';
  IF v_rules IS NULL THEN RAISE EXCEPTION 'ผู้ดูแลยังไม่ได้ตั้งกติกาค่าส่งบริการ A→B'; END IF;
  BEGIN
    v_base_fee := (v_rules ->> 'base_fee')::numeric;
    v_included_km := (v_rules ->> 'included_km')::numeric;
    v_per_km_fee := (v_rules ->> 'per_km_fee')::numeric;
    v_multiplier := (v_rules ->> 'zone_multiplier')::numeric;
    v_service_fee := (v_rules ->> 'service_fee')::numeric;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'กติกาค่าส่งบริการ A→B ไม่อยู่ในรูปแบบตัวเลข';
  END;
  IF v_base_fee < 0 OR v_included_km < 0 OR v_per_km_fee < 0 OR v_multiplier <= 0 OR v_service_fee < 0 THEN
    RAISE EXCEPTION 'กติกาค่าส่งบริการ A→B ไม่ครบหรือไม่ถูกต้อง';
  END IF;
  v_distance := 6371 * 2 * asin(sqrt(
    power(sin(radians(v_delivery_lat - v_pickup_lat) / 2), 2)
    + cos(radians(v_pickup_lat)) * cos(radians(v_delivery_lat)) * power(sin(radians(v_delivery_lng - v_pickup_lng) / 2), 2)
  ));
  v_delivery_fee := round((v_base_fee + greatest(0, v_distance - v_included_km) * v_per_km_fee) * v_multiplier, 2);
  RETURN jsonb_build_object(
    'service_type', 'parcel',
    'distance_km', round(v_distance, 3),
    'delivery_fee', v_delivery_fee,
    'service_fee', round(v_service_fee, 2),
    'payable', round(v_delivery_fee + v_service_fee, 2)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.estimate_customer_parcel_delivery(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estimate_customer_parcel_delivery(jsonb, jsonb) TO authenticated;
