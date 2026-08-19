-- Wave P1: customer address book, immutable delivery snapshots and replay-safe checkout.
-- This migration intentionally preserves the legacy profile location and create_food_order RPC.

CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  label text NOT NULL DEFAULT 'ที่อยู่จัดส่ง',
  recipient_name text NOT NULL,
  recipient_phone text NOT NULL,
  address_line text NOT NULL,
  village text,
  moo text,
  soi text,
  road text,
  subdistrict text,
  district text,
  province text,
  postal_code text,
  location jsonb NOT NULL,
  delivery_note text,
  is_default boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_addresses_label_length CHECK (char_length(btrim(label)) BETWEEN 1 AND 80),
  CONSTRAINT customer_addresses_recipient_name_length CHECK (char_length(btrim(recipient_name)) BETWEEN 1 AND 160),
  CONSTRAINT customer_addresses_recipient_phone_length CHECK (char_length(btrim(recipient_phone)) BETWEEN 6 AND 32),
  CONSTRAINT customer_addresses_address_length CHECK (char_length(btrim(address_line)) BETWEEN 3 AND 1000),
  CONSTRAINT customer_addresses_location_shape CHECK (
    jsonb_typeof(location) = 'object'
    AND (location ? 'lat')
    AND (location ? 'lng')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_one_default_per_user
  ON public.customer_addresses(user_id)
  WHERE is_default IS TRUE AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS customer_addresses_active_user_idx
  ON public.customer_addresses(user_id, is_default DESC, updated_at DESC)
  WHERE archived_at IS NULL;

ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_addresses_select_owner_or_admin ON public.customer_addresses;
CREATE POLICY customer_addresses_select_owner_or_admin ON public.customer_addresses
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role('admin'));

DROP POLICY IF EXISTS customer_addresses_insert_owner ON public.customer_addresses;
CREATE POLICY customer_addresses_insert_owner ON public.customer_addresses
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND private.has_role('customer'));

DROP POLICY IF EXISTS customer_addresses_update_owner ON public.customer_addresses;
CREATE POLICY customer_addresses_update_owner ON public.customer_addresses
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND private.has_role('customer'))
  WITH CHECK (user_id = auth.uid() AND private.has_role('customer'));

CREATE OR REPLACE FUNCTION public.save_customer_address(
  p_address_id uuid DEFAULT NULL,
  p_label text DEFAULT 'ที่อยู่จัดส่ง',
  p_recipient_name text DEFAULT '',
  p_recipient_phone text DEFAULT '',
  p_address_line text DEFAULT '',
  p_village text DEFAULT NULL,
  p_moo text DEFAULT NULL,
  p_soi text DEFAULT NULL,
  p_road text DEFAULT NULL,
  p_subdistrict text DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_province text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_location jsonb DEFAULT '{}'::jsonb,
  p_delivery_note text DEFAULT NULL,
  p_is_default boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_address public.customer_addresses;
  v_make_default boolean;
  v_lat double precision;
  v_lng double precision;
BEGIN
  IF v_user_id IS NULL OR NOT private.has_role('customer') THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบด้วยบัญชีลูกค้าก่อนจัดการที่อยู่';
  END IF;
  IF char_length(btrim(coalesce(p_label, ''))) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'ชื่อเรียกที่อยู่ต้องมีความยาว 1 ถึง 80 ตัวอักษร';
  END IF;
  IF char_length(btrim(coalesce(p_recipient_name, ''))) NOT BETWEEN 1 AND 160 THEN
    RAISE EXCEPTION 'กรุณาระบุชื่อผู้รับให้ถูกต้อง';
  END IF;
  IF char_length(btrim(coalesce(p_recipient_phone, ''))) NOT BETWEEN 6 AND 32 THEN
    RAISE EXCEPTION 'กรุณาระบุเบอร์โทรศัพท์ผู้รับให้ถูกต้อง';
  END IF;
  IF char_length(btrim(coalesce(p_address_line, ''))) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION 'กรุณาระบุที่อยู่จัดส่งให้ครบถ้วน';
  END IF;
  BEGIN
    v_lat := (p_location ->> 'lat')::double precision;
    v_lng := (p_location ->> 'lng')::double precision;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'พิกัดจัดส่งไม่อยู่ในรูปแบบที่ถูกต้อง';
  END;
  IF v_lat IS NULL OR v_lng IS NULL OR abs(v_lat) > 90 OR abs(v_lng) > 180 THEN
    RAISE EXCEPTION 'พิกัดจัดส่งอยู่นอกช่วงที่อนุญาต';
  END IF;

  IF p_address_id IS NOT NULL THEN
    SELECT * INTO v_address
      FROM public.customer_addresses
      WHERE id = p_address_id AND user_id = v_user_id AND archived_at IS NULL
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'ไม่พบที่อยู่ที่ต้องการแก้ไขหรือคุณไม่มีสิทธิ์';
    END IF;
    v_make_default := coalesce(p_is_default, v_address.is_default);
  ELSE
    v_make_default := coalesce(p_is_default, false) OR NOT EXISTS (
      SELECT 1 FROM public.customer_addresses
      WHERE user_id = v_user_id AND archived_at IS NULL AND is_default IS TRUE
    );
  END IF;

  IF v_make_default THEN
    UPDATE public.customer_addresses
      SET is_default = false, updated_at = now()
      WHERE user_id = v_user_id AND archived_at IS NULL AND is_default IS TRUE;
  END IF;

  IF p_address_id IS NULL THEN
    INSERT INTO public.customer_addresses(
      user_id, label, recipient_name, recipient_phone, address_line, village, moo, soi, road,
      subdistrict, district, province, postal_code, location, delivery_note, is_default, updated_at
    ) VALUES (
      v_user_id, btrim(p_label), btrim(p_recipient_name), btrim(p_recipient_phone), btrim(p_address_line),
      nullif(btrim(coalesce(p_village, '')), ''), nullif(btrim(coalesce(p_moo, '')), ''),
      nullif(btrim(coalesce(p_soi, '')), ''), nullif(btrim(coalesce(p_road, '')), ''),
      nullif(btrim(coalesce(p_subdistrict, '')), ''), nullif(btrim(coalesce(p_district, '')), ''),
      nullif(btrim(coalesce(p_province, '')), ''), nullif(btrim(coalesce(p_postal_code, '')), ''),
      p_location || jsonb_build_object('lat', v_lat, 'lng', v_lng), nullif(btrim(coalesce(p_delivery_note, '')), ''),
      v_make_default, now()
    ) RETURNING * INTO v_address;
  ELSE
    UPDATE public.customer_addresses
      SET label = btrim(p_label), recipient_name = btrim(p_recipient_name), recipient_phone = btrim(p_recipient_phone),
          address_line = btrim(p_address_line), village = nullif(btrim(coalesce(p_village, '')), ''),
          moo = nullif(btrim(coalesce(p_moo, '')), ''), soi = nullif(btrim(coalesce(p_soi, '')), ''),
          road = nullif(btrim(coalesce(p_road, '')), ''), subdistrict = nullif(btrim(coalesce(p_subdistrict, '')), ''),
          district = nullif(btrim(coalesce(p_district, '')), ''), province = nullif(btrim(coalesce(p_province, '')), ''),
          postal_code = nullif(btrim(coalesce(p_postal_code, '')), ''),
          location = p_location || jsonb_build_object('lat', v_lat, 'lng', v_lng),
          delivery_note = nullif(btrim(coalesce(p_delivery_note, '')), ''), is_default = v_make_default, updated_at = now()
      WHERE id = p_address_id AND user_id = v_user_id AND archived_at IS NULL
      RETURNING * INTO v_address;
  END IF;

  RETURN jsonb_build_object(
    'id', v_address.id, 'label', v_address.label, 'recipient_name', v_address.recipient_name,
    'recipient_phone', v_address.recipient_phone, 'address_line', v_address.address_line,
    'location', v_address.location, 'delivery_note', v_address.delivery_note, 'is_default', v_address.is_default
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_customer_address(p_address_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_address public.customer_addresses;
  v_replacement uuid;
BEGIN
  IF v_user_id IS NULL OR NOT private.has_role('customer') THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบด้วยบัญชีลูกค้าก่อนจัดการที่อยู่';
  END IF;
  SELECT * INTO v_address FROM public.customer_addresses
    WHERE id = p_address_id AND user_id = v_user_id AND archived_at IS NULL
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบที่อยู่ที่ต้องการเก็บหรือคุณไม่มีสิทธิ์';
  END IF;
  UPDATE public.customer_addresses
    SET archived_at = now(), is_default = false, updated_at = now()
    WHERE id = v_address.id;
  IF v_address.is_default THEN
    SELECT id INTO v_replacement FROM public.customer_addresses
      WHERE user_id = v_user_id AND archived_at IS NULL
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 1
      FOR UPDATE;
    IF v_replacement IS NOT NULL THEN
      UPDATE public.customer_addresses SET is_default = true, updated_at = now() WHERE id = v_replacement;
    END IF;
  END IF;
  RETURN jsonb_build_object('id', v_address.id, 'archived', true, 'replacement_default_id', v_replacement);
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_customer_address(uuid, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_customer_address(uuid) TO authenticated;

ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS delivery_address_id uuid REFERENCES public.customer_addresses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_recipient_name text,
  ADD COLUMN IF NOT EXISTS delivery_recipient_phone text,
  ADD COLUMN IF NOT EXISTS delivery_note text,
  ADD COLUMN IF NOT EXISTS delivery_location_accuracy numeric,
  ADD COLUMN IF NOT EXISTS delivery_location_source text,
  ADD COLUMN IF NOT EXISTS delivery_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS checkout_idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS delivery_orders_customer_checkout_key_idx
  ON public.delivery_orders(customer_id, checkout_idempotency_key)
  WHERE checkout_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payment_slip_reviews_one_per_order_idx
  ON public.payment_slip_reviews(order_id);

CREATE OR REPLACE FUNCTION public.create_food_order_v2(
  p_store_id text,
  p_items jsonb,
  p_address_id uuid,
  p_payment_method text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_customer_id uuid := auth.uid();
  v_address public.customer_addresses;
  v_store record;
  v_total numeric;
  v_order public.delivery_orders;
  v_status text;
  v_item_count integer;
  v_requested_count integer;
  v_snapshot jsonb;
  v_rendered_address text;
BEGIN
  IF v_customer_id IS NULL OR NOT private.has_role('customer') THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบด้วยบัญชีลูกค้าก่อนสั่งซื้อ';
  END IF;
  IF p_store_id IS NULL OR btrim(p_store_id) = '' OR p_address_id IS NULL THEN
    RAISE EXCEPTION 'กรุณาระบุร้านค้าและที่อยู่จัดส่ง';
  END IF;
  IF char_length(btrim(coalesce(p_idempotency_key, ''))) NOT BETWEEN 12 AND 220 THEN
    RAISE EXCEPTION 'รหัสยืนยันรายการสั่งซื้อไม่ถูกต้อง กรุณาลองใหม่';
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

  PERFORM pg_advisory_xact_lock(hashtext(v_customer_id::text || ':' || btrim(p_idempotency_key)));
  SELECT * INTO v_order FROM public.delivery_orders
    WHERE customer_id = v_customer_id AND checkout_idempotency_key = btrim(p_idempotency_key)
    LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status, 'total', v_order.total, 'delivery_fee', v_order.delivery_fee, 'payable', v_order.payable, 'distance_km', v_order.distance_km, 'replayed', true);
  END IF;

  SELECT * INTO v_address FROM public.customer_addresses
    WHERE id = p_address_id AND user_id = v_customer_id AND archived_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบที่อยู่จัดส่งหรือคุณไม่มีสิทธิ์ใช้ที่อยู่นี้';
  END IF;
  SELECT id, name, location INTO v_store FROM public.stores
    WHERE id = p_store_id AND active IS TRUE AND emergency_closed IS FALSE
      AND (moderation_status IS NULL OR moderation_status = 'active');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ร้านค้าไม่พร้อมรับออร์เดอร์';
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

  v_rendered_address := concat_ws(', ', nullif(v_address.address_line, ''), nullif(v_address.village, ''), nullif(v_address.moo, ''), nullif(v_address.soi, ''), nullif(v_address.road, ''), nullif(v_address.subdistrict, ''), nullif(v_address.district, ''), nullif(v_address.province, ''), nullif(v_address.postal_code, ''));
  v_snapshot := jsonb_build_object(
    'address_id', v_address.id, 'label', v_address.label, 'recipient_name', v_address.recipient_name,
    'recipient_phone', v_address.recipient_phone, 'address', v_rendered_address,
    'delivery_note', v_address.delivery_note, 'location', v_address.location,
    'accuracy', v_address.location -> 'accuracy', 'source', v_address.location -> 'source',
    'captured_at', now()
  );
  v_status := CASE WHEN p_payment_method = 'โอนผ่าน QR / แนบสลิป' THEN 'รอตรวจสอบการชำระเงิน' ELSE 'ร้านค้ารับออร์เดอร์' END;

  INSERT INTO public.delivery_orders(
    customer_id, customer_email, customer_name, store_id, store_name, service_type, status, total, payable,
    delivery_fee, payment_method, delivery_address, delivery_location, delivery_address_id, delivery_recipient_name,
    delivery_recipient_phone, delivery_note, delivery_location_accuracy, delivery_location_source, delivery_snapshot,
    checkout_idempotency_key, ordered_at
  ) VALUES (
    v_customer_id, coalesce(auth.jwt() ->> 'email', ''), v_address.recipient_name, v_store.id, v_store.name, 'food',
    v_status, v_total, 0, 0, p_payment_method, v_rendered_address, v_address.location, v_address.id,
    v_address.recipient_name, v_address.recipient_phone, v_address.delivery_note,
    nullif(v_address.location ->> 'accuracy', '')::numeric, nullif(v_address.location ->> 'source', ''), v_snapshot,
    btrim(p_idempotency_key), now()
  ) RETURNING * INTO v_order;

  INSERT INTO public.delivery_order_items(order_id, item_id, name, emoji, unit_price, quantity, options)
  SELECT v_order.id, m.id, m.name, m.emoji, m.price, r.quantity, '{}'::jsonb
  FROM jsonb_to_recordset(p_items) AS r(item_id text, quantity integer)
  JOIN public.menu_items m ON m.id = r.item_id
  WHERE m.store_id = p_store_id AND m.available IS TRUE;

  RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status, 'total', v_order.total, 'delivery_fee', v_order.delivery_fee, 'payable', v_order.payable, 'distance_km', v_order.distance_km, 'replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.create_food_order_v2(text, jsonb, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_food_order_v2(text, jsonb, uuid, text, text) TO authenticated;
