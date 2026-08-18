-- Financial integrity: food delivery fees and payable totals are calculated from
-- Admin Control Plane rules in the database, never trusted from a client payload.

ALTER TABLE public.platform_configs DROP CONSTRAINT IF EXISTS platform_configs_key_check;
ALTER TABLE public.platform_configs ADD CONSTRAINT platform_configs_key_check
  CHECK (key IN ('payment_public', 'business_rules', 'brand_public', 'customer_promotions'));

INSERT INTO public.platform_configs(key, value, updated_at)
VALUES (
  'business_rules',
  jsonb_build_object(
    'food', jsonb_build_object('base_fee', 40, 'included_km', 3, 'per_km_fee', 10, 'zone_multiplier', 1, 'service_fee', 0),
    'parcel', jsonb_build_object('base_fee', 50, 'included_km', 3, 'per_km_fee', 12, 'zone_multiplier', 1, 'service_fee', 0),
    'errand', jsonb_build_object('base_fee', 50, 'included_km', 3, 'per_km_fee', 12, 'zone_multiplier', 1, 'service_fee', 0)
  ),
  now()
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.apply_food_delivery_pricing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  rules jsonb;
  store_location jsonb;
  base_fee numeric;
  included_km numeric;
  per_km_fee numeric;
  zone_multiplier numeric;
  service_fee numeric;
  customer_lat double precision;
  customer_lng double precision;
  store_lat double precision;
  store_lng double precision;
  distance numeric;
BEGIN
  IF NEW.service_type <> 'food' THEN
    RETURN NEW;
  END IF;

  SELECT value -> 'food' INTO rules FROM public.platform_configs WHERE key = 'business_rules';
  IF rules IS NULL THEN
    RAISE EXCEPTION 'ไม่สามารถสร้างออร์เดอร์ได้: ผู้ดูแลยังไม่ได้ตั้งกติกาค่าส่งกลาง';
  END IF;

  BEGIN
    base_fee := (rules ->> 'base_fee')::numeric;
    included_km := (rules ->> 'included_km')::numeric;
    per_km_fee := (rules ->> 'per_km_fee')::numeric;
    zone_multiplier := (rules ->> 'zone_multiplier')::numeric;
    service_fee := (rules ->> 'service_fee')::numeric;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'กติกาค่าส่งกลางไม่อยู่ในรูปแบบตัวเลข';
  END;

  IF base_fee IS NULL OR included_km IS NULL OR per_km_fee IS NULL OR zone_multiplier IS NULL OR service_fee IS NULL
     OR base_fee < 0 OR included_km < 0 OR per_km_fee < 0 OR zone_multiplier <= 0 OR service_fee < 0 THEN
    RAISE EXCEPTION 'กติกาค่าส่งกลางไม่ครบหรืออยู่นอกช่วงที่อนุญาต';
  END IF;

  SELECT location INTO store_location FROM public.stores WHERE id = NEW.store_id;
  IF store_location IS NULL OR NEW.delivery_location IS NULL THEN
    RAISE EXCEPTION 'ไม่สามารถคำนวณค่าส่งได้: ต้องมีพิกัดร้านและจุดจัดส่ง';
  END IF;

  BEGIN
    customer_lat := (NEW.delivery_location ->> 'lat')::double precision;
    customer_lng := (NEW.delivery_location ->> 'lng')::double precision;
    store_lat := (store_location ->> 'lat')::double precision;
    store_lng := (store_location ->> 'lng')::double precision;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'พิกัดจัดส่งไม่อยู่ในรูปแบบที่ถูกต้อง';
  END;

  IF customer_lat IS NULL OR customer_lng IS NULL OR store_lat IS NULL OR store_lng IS NULL
     OR abs(customer_lat) > 90 OR abs(store_lat) > 90 OR abs(customer_lng) > 180 OR abs(store_lng) > 180 THEN
    RAISE EXCEPTION 'พิกัดจัดส่งอยู่นอกช่วงที่อนุญาต';
  END IF;

  distance := 6371 * 2 * asin(sqrt(
    power(sin(radians(customer_lat - store_lat) / 2), 2)
    + cos(radians(store_lat)) * cos(radians(customer_lat)) * power(sin(radians(customer_lng - store_lng) / 2), 2)
  ));

  NEW.distance_km := round(distance, 3);
  NEW.delivery_fee := round((base_fee + greatest(0, distance - included_km) * per_km_fee) * zone_multiplier, 2);
  NEW.payable := round(NEW.total + NEW.delivery_fee + service_fee, 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_food_delivery_pricing_before_write ON public.delivery_orders;
CREATE TRIGGER apply_food_delivery_pricing_before_write
  BEFORE INSERT OR UPDATE OF total, store_id, delivery_location, service_type ON public.delivery_orders
  FOR EACH ROW EXECUTE FUNCTION public.apply_food_delivery_pricing();

CREATE OR REPLACE FUNCTION public.create_food_order(
  p_store_id text,
  p_items jsonb,
  p_delivery_address text,
  p_payment_method text,
  p_customer_name text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_id uuid := auth.uid();
  v_customer_location jsonb;
  v_store record;
  v_total numeric;
  v_order public.delivery_orders;
  v_status text;
  v_item_count integer;
  v_requested_count integer;
BEGIN
  IF v_customer_id IS NULL OR NOT private.has_role('customer') THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบด้วยบัญชีลูกค้าก่อนสั่งซื้อ';
  END IF;
  IF p_store_id IS NULL OR btrim(p_store_id) = '' OR p_delivery_address IS NULL OR btrim(p_delivery_address) = '' THEN
    RAISE EXCEPTION 'กรุณาระบุร้านค้าและที่อยู่จัดส่ง';
  END IF;
  IF p_payment_method NOT IN ('เงินสดปลายทาง (COD)', 'โอนผ่าน QR / แนบสลิป') THEN
    RAISE EXCEPTION 'วิธีชำระเงินไม่อยู่ในรายการที่อนุญาต';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'รายการสินค้าไม่ถูกต้อง';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_items) AS x(item_id text, quantity integer) WHERE item_id IS NULL OR btrim(item_id) = '' OR quantity IS NULL OR quantity < 1 OR quantity > 99) THEN
    RAISE EXCEPTION 'สินค้าและจำนวนต้องอยู่ในช่วงที่อนุญาต';
  END IF;

  SELECT id, name, location INTO v_store FROM public.stores WHERE id = p_store_id AND active IS TRUE AND emergency_closed IS FALSE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ร้านค้าไม่พร้อมรับออร์เดอร์';
  END IF;
  SELECT location INTO v_customer_location FROM public.user_profiles WHERE user_id = v_customer_id;
  IF v_customer_location IS NULL THEN
    RAISE EXCEPTION 'กรุณาบันทึกตำแหน่งจัดส่งในหน้าโปรไฟล์ก่อนสั่งซื้อ';
  END IF;

  WITH requested AS (
    SELECT item_id, sum(quantity)::integer AS quantity
    FROM jsonb_to_recordset(p_items) AS x(item_id text, quantity integer)
    GROUP BY item_id
  ), verified AS (
    SELECT m.id, m.name, m.emoji, m.price, r.quantity
    FROM requested r JOIN public.menu_items m ON m.id = r.item_id
    WHERE m.store_id = p_store_id AND m.available IS TRUE
  )
  SELECT count(*), coalesce(sum(price * quantity), 0) INTO v_item_count, v_total FROM verified;
  SELECT count(DISTINCT item_id) INTO v_requested_count FROM jsonb_to_recordset(p_items) AS x(item_id text, quantity integer);
  IF v_item_count <> v_requested_count THEN
    RAISE EXCEPTION 'มีสินค้าไม่พร้อมขายหรือไม่ได้อยู่ในร้านค้าที่เลือก';
  END IF;

  v_status := CASE WHEN p_payment_method = 'โอนผ่าน QR / แนบสลิป' THEN 'รอตรวจสอบการชำระเงิน' ELSE 'ร้านค้ารับออร์เดอร์' END;
  INSERT INTO public.delivery_orders(customer_id, customer_email, customer_name, store_id, store_name, service_type, status, total, payable, delivery_fee, payment_method, delivery_address, delivery_location, ordered_at)
  VALUES(v_customer_id, coalesce(auth.jwt() ->> 'email', ''), left(coalesce(nullif(btrim(p_customer_name), ''), auth.jwt() ->> 'email', ''), 160), v_store.id, v_store.name, 'food', v_status, v_total, 0, 0, p_payment_method, left(btrim(p_delivery_address), 1000), v_customer_location, now())
  RETURNING * INTO v_order;

  INSERT INTO public.delivery_order_items(order_id, item_id, name, emoji, unit_price, quantity, options)
  SELECT v_order.id, m.id, m.name, m.emoji, m.price, r.quantity, '{}'::jsonb
  FROM jsonb_to_recordset(p_items) AS r(item_id text, quantity integer)
  JOIN public.menu_items m ON m.id = r.item_id
  WHERE m.store_id = p_store_id AND m.available IS TRUE;

  RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status, 'total', v_order.total, 'delivery_fee', v_order.delivery_fee, 'payable', v_order.payable, 'distance_km', v_order.distance_km);
END;
$$;

REVOKE ALL ON FUNCTION public.create_food_order(text, jsonb, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_food_order(text, jsonb, text, text, text) TO authenticated;

DROP POLICY IF EXISTS orders_customer_insert ON public.delivery_orders;
CREATE POLICY orders_customer_insert ON public.delivery_orders
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role('admin'));
