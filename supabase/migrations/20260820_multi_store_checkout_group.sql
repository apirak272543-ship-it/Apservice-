-- Wave P3: atomic multi-store food checkout. Existing single-store checkout remains as legacy fallback.

ALTER TABLE public.checkout_groups
  ADD COLUMN IF NOT EXISTS pricing_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS route_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS order_count integer NOT NULL DEFAULT 0 CHECK (order_count >= 0),
  ADD COLUMN IF NOT EXISTS active_order_count integer NOT NULL DEFAULT 0 CHECK (active_order_count >= 0),
  ADD COLUMN IF NOT EXISTS completed_order_count integer NOT NULL DEFAULT 0 CHECK (completed_order_count >= 0),
  ADD COLUMN IF NOT EXISTS cancelled_order_count integer NOT NULL DEFAULT 0 CHECK (cancelled_order_count >= 0),
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','awaiting_slip','under_review','verified','paid','rejected','refund_pending','refunded','partially_refunded','cancelled','mixed'));

CREATE INDEX IF NOT EXISTS delivery_orders_checkout_group_idx
  ON public.delivery_orders(checkout_group_id, ordered_at ASC)
  WHERE checkout_group_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.checkout_group_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_group_id uuid NOT NULL UNIQUE REFERENCES public.checkout_groups(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  method text NOT NULL CHECK (method IN ('เงินสดปลายทาง (COD)', 'โอนผ่าน QR / แนบสลิป')),
  expected_amount numeric NOT NULL CHECK (expected_amount >= 0),
  captured_amount numeric NOT NULL DEFAULT 0 CHECK (captured_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','awaiting_slip','under_review','verified','paid','rejected','refund_pending','refunded','partially_refunded','cancelled')),
  slip_path text,
  payment_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((method = 'เงินสดปลายทาง (COD)' AND slip_path IS NULL) OR (method = 'โอนผ่าน QR / แนบสลิป' AND slip_path IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS checkout_group_payments_slip_path_unique
  ON public.checkout_group_payments(slip_path)
  WHERE slip_path IS NOT NULL;

CREATE INDEX IF NOT EXISTS checkout_group_payments_customer_idx
  ON public.checkout_group_payments(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.checkout_group_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  checkout_group_id uuid NOT NULL REFERENCES public.checkout_groups(id) ON DELETE RESTRICT,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('customer','admin','system')),
  action text NOT NULL CHECK (action IN ('checkout_group_created','payment_reviewed','aggregate_updated')),
  idempotency_key text,
  before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS checkout_group_events_idempotency_unique
  ON public.checkout_group_events(checkout_group_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS checkout_group_events_group_idx
  ON public.checkout_group_events(checkout_group_id, created_at ASC);

ALTER TABLE public.checkout_group_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_group_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS checkout_group_payments_select_owner_or_admin ON public.checkout_group_payments;
CREATE POLICY checkout_group_payments_select_owner_or_admin ON public.checkout_group_payments
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR private.has_role('admin'));

DROP POLICY IF EXISTS checkout_group_events_select_owner_or_admin ON public.checkout_group_events;
CREATE POLICY checkout_group_events_select_owner_or_admin ON public.checkout_group_events
  FOR SELECT TO authenticated
  USING (
    private.has_role('admin')
    OR EXISTS (SELECT 1 FROM public.checkout_groups g WHERE g.id = checkout_group_id AND g.customer_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION private.checkout_haversine_km(p_from jsonb, p_to jsonb)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = pg_temp
AS $$
DECLARE v_lat1 numeric; v_lng1 numeric; v_lat2 numeric; v_lng2 numeric; v_a numeric;
BEGIN
  v_lat1 := nullif(p_from ->> 'lat', '')::numeric; v_lng1 := nullif(p_from ->> 'lng', '')::numeric;
  v_lat2 := nullif(p_to ->> 'lat', '')::numeric; v_lng2 := nullif(p_to ->> 'lng', '')::numeric;
  IF v_lat1 IS NULL OR v_lng1 IS NULL OR v_lat2 IS NULL OR v_lng2 IS NULL OR abs(v_lat1) > 90 OR abs(v_lat2) > 90 OR abs(v_lng1) > 180 OR abs(v_lng2) > 180 THEN
    RAISE EXCEPTION 'พิกัดร้านค้าหรือที่อยู่จัดส่งไม่ครบถ้วน จึงคำนวณค่าส่งไม่ได้';
  END IF;
  v_a := power(sin(radians(v_lat2 - v_lat1) / 2), 2) + cos(radians(v_lat1)) * cos(radians(v_lat2)) * power(sin(radians(v_lng2 - v_lng1) / 2), 2);
  RETURN round((6371 * 2 * atan2(sqrt(v_a), sqrt(1 - v_a)))::numeric, 3);
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_checkout_group_aggregate(p_checkout_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE v_group public.checkout_groups; v_order_count integer; v_active integer; v_completed integer; v_cancelled integer; v_status text;
BEGIN
  IF p_checkout_group_id IS NULL THEN RETURN; END IF;
  SELECT * INTO v_group FROM public.checkout_groups WHERE id = p_checkout_group_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT count(*),
    count(*) FILTER (WHERE workflow_state IN ('completed','delivered')),
    count(*) FILTER (WHERE workflow_state IN ('cancelled','refunded','partially_refunded')),
    count(*) FILTER (WHERE workflow_state NOT IN ('completed','delivered','cancelled','refunded','partially_refunded'))
  INTO v_order_count, v_completed, v_cancelled, v_active
  FROM public.delivery_orders WHERE checkout_group_id = p_checkout_group_id;
  v_status := CASE
    WHEN v_order_count = 0 THEN 'active'
    WHEN v_cancelled = v_order_count THEN 'cancelled'
    WHEN v_completed = v_order_count THEN 'completed'
    WHEN v_cancelled > 0 THEN 'partially_cancelled'
    ELSE 'active'
  END;
  UPDATE public.checkout_groups
    SET order_count = v_order_count, active_order_count = v_active, completed_order_count = v_completed,
        cancelled_order_count = v_cancelled, status = v_status, updated_at = now()
    WHERE id = p_checkout_group_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_checkout_group_aggregate_from_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  PERFORM public.refresh_checkout_group_aggregate(COALESCE(NEW.checkout_group_id, OLD.checkout_group_id));
  IF TG_OP = 'UPDATE' AND OLD.checkout_group_id IS DISTINCT FROM NEW.checkout_group_id THEN
    PERFORM public.refresh_checkout_group_aggregate(OLD.checkout_group_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_checkout_group_aggregate_after_order_change ON public.delivery_orders;
CREATE TRIGGER sync_checkout_group_aggregate_after_order_change
  AFTER INSERT OR UPDATE OF checkout_group_id, workflow_state ON public.delivery_orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_checkout_group_aggregate_from_order();

CREATE OR REPLACE FUNCTION public.sync_checkout_group_payment_to_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE v_order_payment_status text;
BEGIN
  v_order_payment_status := CASE NEW.status
    WHEN 'awaiting_slip' THEN 'awaiting_slip'
    WHEN 'under_review' THEN 'under_review'
    WHEN 'verified' THEN 'verified'
    WHEN 'paid' THEN 'paid'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'refund_pending' THEN 'refund_pending'
    WHEN 'refunded' THEN 'refunded'
    WHEN 'partially_refunded' THEN 'partially_refunded'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END;
  UPDATE public.checkout_groups SET payment_status = NEW.status, updated_at = now() WHERE id = NEW.checkout_group_id;
  UPDATE public.order_payments p
    SET status = v_order_payment_status,
        reviewed_at = CASE WHEN NEW.status IN ('verified','rejected') THEN NEW.reviewed_at ELSE p.reviewed_at END,
        reviewed_by = CASE WHEN NEW.status IN ('verified','rejected') THEN NEW.reviewed_by ELSE p.reviewed_by END,
        reviewer_note = CASE WHEN NEW.status IN ('verified','rejected') THEN NEW.reviewer_note ELSE p.reviewer_note END,
        payment_snapshot = p.payment_snapshot || jsonb_build_object('checkout_group_id', NEW.checkout_group_id, 'group_payment_id', NEW.id, 'group_payment_status', NEW.status, 'group_slip_path', NEW.slip_path),
        updated_at = now()
  FROM public.delivery_orders o
  WHERE o.id = p.order_id AND o.checkout_group_id = NEW.checkout_group_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_checkout_group_payment_after_change ON public.checkout_group_payments;
CREATE TRIGGER sync_checkout_group_payment_after_change
  AFTER INSERT OR UPDATE OF status, reviewed_at, reviewed_by, reviewer_note ON public.checkout_group_payments
  FOR EACH ROW EXECUTE FUNCTION public.sync_checkout_group_payment_to_orders();

CREATE OR REPLACE FUNCTION public.create_food_checkout_group_v3(
  p_orders jsonb,
  p_address_id uuid,
  p_payment_method text,
  p_idempotency_key text,
  p_slip_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth, pg_temp
AS $$
DECLARE
  v_customer_id uuid := auth.uid();
  v_address public.customer_addresses;
  v_existing public.checkout_groups;
  v_group public.checkout_groups;
  v_store record;
  v_line record;
  v_order public.delivery_orders;
  v_config record;
  v_food_rules jsonb;
  v_address_snapshot jsonb;
  v_pricing_snapshot jsonb;
  v_route_snapshot jsonb := '[]'::jsonb;
  v_orders_result jsonb := '[]'::jsonb;
  v_rendered_address text;
  v_store_count integer := 0;
  v_total_amount numeric := 0;
  v_fee_total numeric := 0;
  v_store_total numeric;
  v_store_fee numeric;
  v_distance numeric;
  v_base_fee numeric;
  v_included_km numeric;
  v_per_km_fee numeric;
  v_service_fee numeric;
  v_zone_multiplier numeric;
  v_item_count integer;
  v_requested_count integer;
  v_status text;
  v_order_key text;
  v_slip_object_path text;
BEGIN
  IF v_customer_id IS NULL OR NOT private.has_role('customer') THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบด้วยบัญชีลูกค้าก่อนสั่งซื้อ';
  END IF;
  IF char_length(btrim(coalesce(p_idempotency_key, ''))) NOT BETWEEN 12 AND 220 THEN
    RAISE EXCEPTION 'รหัสยืนยันรายการสั่งซื้อไม่ถูกต้อง กรุณาลองใหม่';
  END IF;
  IF p_payment_method NOT IN ('เงินสดปลายทาง (COD)', 'โอนผ่าน QR / แนบสลิป') THEN
    RAISE EXCEPTION 'วิธีชำระเงินไม่อยู่ในรายการที่อนุญาต';
  END IF;
  IF jsonb_typeof(p_orders) <> 'array' OR jsonb_array_length(p_orders) < 1 OR jsonb_array_length(p_orders) > 10 THEN
    RAISE EXCEPTION 'กรุณาเลือกร้านค้า 1–10 ร้านต่อการสั่งซื้อหนึ่งครั้ง';
  END IF;
  IF p_address_id IS NULL THEN RAISE EXCEPTION 'กรุณาเลือกที่อยู่จัดส่ง'; END IF;
  IF p_payment_method = 'โอนผ่าน QR / แนบสลิป' THEN
    IF p_slip_path IS NULL OR btrim(p_slip_path) !~ ('^payment-slips/' || v_customer_id::text || '/') THEN
      RAISE EXCEPTION 'สลิปชำระเงินไม่ถูกต้องหรือไม่ได้เป็นของบัญชีนี้';
    END IF;
    v_slip_object_path := regexp_replace(btrim(p_slip_path), '^payment-slips/', '');
    IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'payment-slips' AND name = v_slip_object_path AND owner_id = v_customer_id) THEN
      RAISE EXCEPTION 'ไม่พบสลิปส่วนตัวที่ผ่านการอัปโหลดของบัญชีนี้';
    END IF;
  ELSIF p_slip_path IS NOT NULL AND btrim(p_slip_path) <> '' THEN
    RAISE EXCEPTION 'การชำระเงินปลายทางไม่ต้องแนบสลิป';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_customer_id::text || ':checkout-group:' || btrim(p_idempotency_key)));
  SELECT * INTO v_existing FROM public.checkout_groups WHERE customer_id = v_customer_id AND idempotency_key = btrim(p_idempotency_key) LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_existing.id, 'status', v_existing.status, 'payment_status', v_existing.payment_status,
      'total_amount', v_existing.total_amount, 'payable_amount', v_existing.payable_amount, 'replayed', true,
      'orders', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', o.id, 'store_id', o.store_id, 'store_name', o.store_name, 'total', o.total, 'delivery_fee', o.delivery_fee, 'payable', o.payable, 'status', o.status) ORDER BY o.ordered_at) FROM public.delivery_orders o WHERE o.checkout_group_id = v_existing.id), '[]'::jsonb)
    );
  END IF;

  SELECT * INTO v_address FROM public.customer_addresses WHERE id = p_address_id AND user_id = v_customer_id AND archived_at IS NULL FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบที่อยู่จัดส่งหรือคุณไม่มีสิทธิ์ใช้ที่อยู่นี้'; END IF;
  v_rendered_address := concat_ws(', ', nullif(v_address.address_line, ''), nullif(v_address.village, ''), nullif(v_address.moo, ''), nullif(v_address.soi, ''), nullif(v_address.road, ''), nullif(v_address.subdistrict, ''), nullif(v_address.district, ''), nullif(v_address.province, ''), nullif(v_address.postal_code, ''));
  v_address_snapshot := jsonb_build_object('address_id', v_address.id, 'label', v_address.label, 'recipient_name', v_address.recipient_name, 'recipient_phone', v_address.recipient_phone, 'address', v_rendered_address, 'delivery_note', v_address.delivery_note, 'location', v_address.location, 'accuracy', v_address.location -> 'accuracy', 'source', v_address.location -> 'source', 'captured_at', now());

  SELECT value, updated_at INTO v_config FROM public.platform_configs WHERE key = 'business_rules' FOR SHARE;
  v_food_rules := v_config.value -> 'food';
  IF v_food_rules IS NULL THEN RAISE EXCEPTION 'ผู้ดูแลระบบยังไม่ได้ตั้งกติกาค่าส่งอาหาร จึงยังไม่สามารถสั่งซื้อได้'; END IF;
  v_base_fee := nullif(v_food_rules ->> 'base_fee', '')::numeric;
  v_included_km := nullif(v_food_rules ->> 'included_km', '')::numeric;
  v_per_km_fee := nullif(v_food_rules ->> 'per_km_fee', '')::numeric;
  v_service_fee := coalesce(nullif(v_food_rules ->> 'service_fee', '')::numeric, 0);
  v_zone_multiplier := coalesce(nullif(v_food_rules ->> 'zone_multiplier', '')::numeric, 1);
  IF v_base_fee IS NULL OR v_included_km IS NULL OR v_per_km_fee IS NULL OR v_base_fee < 0 OR v_included_km < 0 OR v_per_km_fee < 0 OR v_service_fee < 0 OR v_zone_multiplier <= 0 THEN
    RAISE EXCEPTION 'กติกาค่าส่งอาหารของผู้ดูแลระบบไม่สมบูรณ์';
  END IF;
  v_pricing_snapshot := jsonb_build_object('config_key', 'business_rules', 'config_updated_at', v_config.updated_at, 'service', 'food', 'calculation', 'per_store_direct_distance_v1', 'base_fee', v_base_fee, 'included_km', v_included_km, 'per_km_fee', v_per_km_fee, 'service_fee', v_service_fee, 'zone_multiplier', v_zone_multiplier, 'captured_at', now());

  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_orders) AS x(store_id text, items jsonb) WHERE store_id IS NULL OR btrim(store_id) = '' OR jsonb_typeof(items) <> 'array' OR jsonb_array_length(items) < 1 OR jsonb_array_length(items) > 100) THEN
    RAISE EXCEPTION 'ข้อมูลร้านค้าหรือรายการสินค้าไม่ถูกต้อง';
  END IF;
  IF (SELECT count(*) FROM jsonb_to_recordset(p_orders) AS x(store_id text, items jsonb)) <> (SELECT count(DISTINCT btrim(store_id)) FROM jsonb_to_recordset(p_orders) AS x(store_id text, items jsonb)) THEN
    RAISE EXCEPTION 'ไม่สามารถส่งร้านค้าเดียวกันซ้ำในกลุ่มคำสั่งซื้อได้';
  END IF;

  INSERT INTO public.checkout_groups(customer_id, idempotency_key, status, address_snapshot, fee_snapshot, pricing_snapshot, route_snapshot, total_amount, payable_amount, payment_status)
  VALUES (v_customer_id, btrim(p_idempotency_key), 'active', v_address_snapshot, '{}'::jsonb, v_pricing_snapshot, '[]'::jsonb, 0, 0, CASE WHEN p_payment_method = 'โอนผ่าน QR / แนบสลิป' THEN 'under_review' ELSE 'pending' END)
  RETURNING * INTO v_group;

  FOR v_line IN SELECT btrim(store_id) AS store_id, items FROM jsonb_to_recordset(p_orders) AS x(store_id text, items jsonb) LOOP
    IF NOT private.store_accepts_food_orders(v_line.store_id, now()) THEN RAISE EXCEPTION 'ร้านค้า % ไม่พร้อมรับออร์เดอร์ในขณะนี้', v_line.store_id; END IF;
    SELECT id, name, location INTO v_store FROM public.stores WHERE id = v_line.store_id FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบร้านค้าที่เลือก'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_to_recordset(v_line.items) AS x(item_id text, quantity integer) WHERE item_id IS NULL OR btrim(item_id) = '' OR quantity IS NULL OR quantity < 1 OR quantity > 99) THEN RAISE EXCEPTION 'สินค้าและจำนวนของร้าน % ไม่ถูกต้อง', v_store.name; END IF;
    WITH requested AS (
      SELECT item_id, sum(quantity)::integer AS quantity FROM jsonb_to_recordset(v_line.items) AS x(item_id text, quantity integer) GROUP BY item_id
    ), verified AS (
      SELECT m.id, m.name, m.emoji, m.price, r.quantity FROM requested r JOIN public.menu_items m ON m.id = r.item_id WHERE m.store_id = v_store.id AND m.available IS TRUE AND m.archived_at IS NULL
    ) SELECT count(*), coalesce(sum(price * quantity), 0) INTO v_item_count, v_store_total FROM verified;
    SELECT count(DISTINCT item_id) INTO v_requested_count FROM jsonb_to_recordset(v_line.items) AS x(item_id text, quantity integer);
    IF v_item_count <> v_requested_count THEN RAISE EXCEPTION 'มีสินค้าไม่พร้อมขายหรือไม่ได้อยู่ในร้าน %', v_store.name; END IF;
    v_distance := private.checkout_haversine_km(v_store.location, v_address.location);
    v_store_fee := round(((v_base_fee + greatest(v_distance - v_included_km, 0) * v_per_km_fee + v_service_fee) * v_zone_multiplier)::numeric, 2);
    v_status := CASE WHEN p_payment_method = 'โอนผ่าน QR / แนบสลิป' THEN 'รอตรวจสอบการชำระเงิน' ELSE 'ร้านค้ารับออร์เดอร์' END;
    v_order_key := 'group:' || md5(v_group.id::text || ':' || v_store.id);
    INSERT INTO public.delivery_orders(customer_id, customer_email, customer_name, store_id, store_name, service_type, status, total, payable, delivery_fee, payment_method, delivery_address, delivery_location, delivery_address_id, delivery_recipient_name, delivery_recipient_phone, delivery_note, delivery_location_accuracy, delivery_location_source, delivery_snapshot, checkout_idempotency_key, checkout_group_id, ordered_at)
    VALUES (v_customer_id, coalesce(auth.jwt() ->> 'email', ''), v_address.recipient_name, v_store.id, v_store.name, 'food', v_status, v_store_total, v_store_total + v_store_fee, v_store_fee, p_payment_method, v_rendered_address, v_address.location, v_address.id, v_address.recipient_name, v_address.recipient_phone, v_address.delivery_note, nullif(v_address.location ->> 'accuracy', '')::numeric, nullif(v_address.location ->> 'source', ''), v_address_snapshot || jsonb_build_object('checkout_group_id', v_group.id, 'pricing', v_pricing_snapshot, 'route_distance_km', v_distance, 'delivery_fee', v_store_fee), v_order_key, v_group.id, now()) RETURNING * INTO v_order;
    INSERT INTO public.delivery_order_items(order_id, item_id, name, emoji, unit_price, quantity, options)
    SELECT v_order.id, m.id, m.name, m.emoji, m.price, r.quantity, '{}'::jsonb FROM jsonb_to_recordset(v_line.items) AS r(item_id text, quantity integer) JOIN public.menu_items m ON m.id = r.item_id WHERE m.store_id = v_store.id AND m.available IS TRUE AND m.archived_at IS NULL;
    INSERT INTO public.order_status_events(order_id, status, actor_id, actor_label) VALUES (v_order.id, v_status, v_customer_id, 'Customer');
    v_store_count := v_store_count + 1; v_total_amount := v_total_amount + v_store_total; v_fee_total := v_fee_total + v_store_fee;
    v_route_snapshot := v_route_snapshot || jsonb_build_array(jsonb_build_object('order_id', v_order.id, 'store_id', v_store.id, 'store_name', v_store.name, 'store_location', v_store.location, 'delivery_location', v_address.location, 'direct_distance_km', v_distance, 'delivery_fee', v_store_fee));
    v_orders_result := v_orders_result || jsonb_build_array(jsonb_build_object('id', v_order.id, 'store_id', v_store.id, 'store_name', v_store.name, 'total', v_store_total, 'delivery_fee', v_store_fee, 'payable', v_store_total + v_store_fee, 'status', v_status));
  END LOOP;

  UPDATE public.checkout_groups SET fee_snapshot = v_pricing_snapshot || jsonb_build_object('group_delivery_fee', v_fee_total, 'store_count', v_store_count), route_snapshot = v_route_snapshot, total_amount = v_total_amount + v_fee_total, payable_amount = v_total_amount + v_fee_total, updated_at = now() WHERE id = v_group.id;
  INSERT INTO public.checkout_group_payments(checkout_group_id, customer_id, method, expected_amount, status, slip_path, payment_snapshot)
  VALUES (v_group.id, v_customer_id, p_payment_method, v_total_amount + v_fee_total, CASE WHEN p_payment_method = 'โอนผ่าน QR / แนบสลิป' THEN 'under_review' ELSE 'pending' END, CASE WHEN p_payment_method = 'โอนผ่าน QR / แนบสลิป' THEN btrim(p_slip_path) ELSE NULL END, jsonb_build_object('checkout_group_id', v_group.id, 'method', p_payment_method, 'expected_amount', v_total_amount + v_fee_total, 'slip_path', CASE WHEN p_payment_method = 'โอนผ่าน QR / แนบสลิป' THEN btrim(p_slip_path) ELSE NULL END, 'created_at', now()));
  PERFORM public.refresh_checkout_group_aggregate(v_group.id);
  INSERT INTO public.checkout_group_events(checkout_group_id, actor_id, actor_role, action, idempotency_key, after_state) VALUES (v_group.id, v_customer_id, 'customer', 'checkout_group_created', btrim(p_idempotency_key), jsonb_build_object('store_count', v_store_count, 'total_amount', v_total_amount + v_fee_total, 'payment_method', p_payment_method, 'orders', v_orders_result));
  RETURN jsonb_build_object('id', v_group.id, 'status', 'active', 'payment_status', CASE WHEN p_payment_method = 'โอนผ่าน QR / แนบสลิป' THEN 'under_review' ELSE 'pending' END, 'total_amount', v_total_amount + v_fee_total, 'payable_amount', v_total_amount + v_fee_total, 'store_count', v_store_count, 'orders', v_orders_result, 'replayed', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_checkout_group_payment(
  p_checkout_group_id uuid,
  p_decision text,
  p_reason text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth, pg_temp
AS $$
DECLARE v_admin_id uuid := auth.uid(); v_payment public.checkout_group_payments; v_before jsonb; v_status text;
BEGIN
  IF v_admin_id IS NULL OR NOT private.has_role('admin') THEN RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้นที่ตรวจสอบการชำระเงินได้'; END IF;
  IF p_decision NOT IN ('verify','reject') OR char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 3 AND 1000 THEN RAISE EXCEPTION 'กรุณาระบุผลพิจารณาและเหตุผลอย่างน้อย 3 ตัวอักษร'; END IF;
  IF char_length(btrim(coalesce(p_idempotency_key, ''))) NOT BETWEEN 12 AND 220 THEN RAISE EXCEPTION 'รหัสยืนยันการตรวจสอบไม่ถูกต้อง'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_admin_id::text || ':checkout-group-payment:' || btrim(p_idempotency_key)));
  IF EXISTS (SELECT 1 FROM public.checkout_group_events WHERE checkout_group_id = p_checkout_group_id AND idempotency_key = btrim(p_idempotency_key)) THEN
    SELECT * INTO v_payment FROM public.checkout_group_payments WHERE checkout_group_id = p_checkout_group_id;
    RETURN jsonb_build_object('checkout_group_id', p_checkout_group_id, 'status', v_payment.status, 'replayed', true);
  END IF;
  SELECT * INTO v_payment FROM public.checkout_group_payments WHERE checkout_group_id = p_checkout_group_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบการชำระเงินของกลุ่มคำสั่งซื้อ'; END IF;
  IF v_payment.method <> 'โอนผ่าน QR / แนบสลิป' OR v_payment.status NOT IN ('under_review','rejected') THEN RAISE EXCEPTION 'รายการชำระเงินกลุ่มนี้ยังไม่อยู่ในสถานะที่พิจารณาได้'; END IF;
  v_before := jsonb_build_object('status', v_payment.status, 'expected_amount', v_payment.expected_amount, 'slip_path', v_payment.slip_path);
  v_status := CASE WHEN p_decision = 'verify' THEN 'verified' ELSE 'rejected' END;
  UPDATE public.checkout_group_payments SET status = v_status, reviewed_at = now(), reviewed_by = v_admin_id, reviewer_note = btrim(p_reason), updated_at = now() WHERE id = v_payment.id;
  INSERT INTO public.checkout_group_events(checkout_group_id, actor_id, actor_role, action, idempotency_key, before_state, after_state, reason) VALUES (p_checkout_group_id, v_admin_id, 'admin', 'payment_reviewed', btrim(p_idempotency_key), v_before, jsonb_build_object('status', v_status), btrim(p_reason));
  INSERT INTO public.admin_action_audit(actor_id, target_user_id, action, reason, before_state, after_state) VALUES (v_admin_id, v_payment.customer_id, 'checkout_group_payment_reviewed', btrim(p_reason), v_before, jsonb_build_object('checkout_group_id', p_checkout_group_id, 'status', v_status));
  RETURN jsonb_build_object('checkout_group_id', p_checkout_group_id, 'status', v_status, 'replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION private.checkout_haversine_km(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_checkout_group_aggregate(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_checkout_group_aggregate_from_order() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_checkout_group_payment_to_orders() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_food_checkout_group_v3(jsonb, uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_food_checkout_group_v3(jsonb, uuid, text, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_review_checkout_group_payment(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_checkout_group_payment(uuid, text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
