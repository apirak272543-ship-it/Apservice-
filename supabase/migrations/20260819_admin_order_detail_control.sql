-- Admin order detail control: item-level edits are server-authorized, priced
-- from the menu catalog, limited to unassigned orders, and fully audited.

CREATE OR REPLACE FUNCTION public.admin_edit_food_order(
  p_order_id text,
  p_items jsonb DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_reason text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, private, pg_temp
AS $$
DECLARE
  v_order public.delivery_orders;
  v_before jsonb;
  v_after jsonb;
  v_total numeric;
  v_item_count integer;
  v_requested_count integer;
  v_payable numeric;
BEGIN
  IF NOT private.has_role('admin') THEN
    RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขออร์เดอร์ได้';
  END IF;
  IF btrim(COALESCE(p_order_id, '')) = '' THEN
    RAISE EXCEPTION 'กรุณาระบุออร์เดอร์ที่ต้องการแก้ไข';
  END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'กรุณาระบุเหตุผลการแก้ไขอย่างน้อย 3 ตัวอักษร';
  END IF;

  SELECT * INTO v_order
  FROM public.delivery_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบออร์เดอร์ที่ต้องการแก้ไข';
  END IF;
  IF v_order.service_type <> 'food' THEN
    RAISE EXCEPTION 'การแก้ไขรายการสินค้าใช้ได้กับออร์เดอร์อาหารเท่านั้น';
  END IF;
  IF v_order.rider_id IS NOT NULL OR v_order.delivery_started_at IS NOT NULL OR v_order.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'ออร์เดอร์นี้เริ่มมอบหมายหรือจัดส่งแล้ว จึงแก้ไขรายการไม่ได้';
  END IF;

  SELECT jsonb_build_object(
    'order', jsonb_build_object('total', v_order.total, 'payable', v_order.payable, 'note', v_order.note, 'status', v_order.status),
    'items', COALESCE((SELECT jsonb_agg(jsonb_build_object('item_id', item_id, 'name', name, 'unit_price', unit_price, 'quantity', quantity) ORDER BY id) FROM public.delivery_order_items WHERE order_id = v_order.id), '[]'::jsonb)
  ) INTO v_before;

  IF p_items IS NOT NULL THEN
    IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 100 THEN
      RAISE EXCEPTION 'รายการสินค้าไม่ถูกต้อง';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(p_items) AS x(item_id text, quantity integer)
      WHERE btrim(COALESCE(item_id, '')) = '' OR quantity IS NULL OR quantity < 1 OR quantity > 99
    ) THEN
      RAISE EXCEPTION 'สินค้าและจำนวนต้องอยู่ในช่วงที่อนุญาต';
    END IF;

    WITH requested AS (
      SELECT item_id, sum(quantity)::integer AS quantity
      FROM jsonb_to_recordset(p_items) AS x(item_id text, quantity integer)
      GROUP BY item_id
    ), verified AS (
      SELECT m.id, m.name, m.emoji, m.price, requested.quantity
      FROM requested
      JOIN public.menu_items m ON m.id = requested.item_id
      WHERE m.store_id = v_order.store_id
    )
    SELECT count(*), COALESCE(sum(price * quantity), 0)
    INTO v_item_count, v_total
    FROM verified;

    SELECT count(DISTINCT item_id)
    INTO v_requested_count
    FROM jsonb_to_recordset(p_items) AS x(item_id text, quantity integer);

    IF v_item_count <> v_requested_count THEN
      RAISE EXCEPTION 'พบสินค้าไม่อยู่ในร้านค้านี้';
    END IF;

    v_payable := GREATEST(0, v_total + COALESCE(v_order.delivery_fee, 0) - COALESCE(v_order.credit_used, 0));
    DELETE FROM public.delivery_order_items WHERE order_id = v_order.id;
    INSERT INTO public.delivery_order_items(order_id, item_id, name, emoji, unit_price, quantity, options)
    SELECT v_order.id, m.id, m.name, m.emoji, m.price, requested.quantity, '{}'::jsonb
    FROM jsonb_to_recordset(p_items) AS requested(item_id text, quantity integer)
    JOIN public.menu_items m ON m.id = requested.item_id
    WHERE m.store_id = v_order.store_id;
    UPDATE public.delivery_orders
    SET total = v_total,
        payable = v_payable,
        note = CASE WHEN p_note IS NULL THEN note ELSE left(trim(p_note), 1000) END,
        updated_at = now()
    WHERE id = v_order.id;
  ELSIF p_note IS NOT NULL THEN
    UPDATE public.delivery_orders
    SET note = left(trim(p_note), 1000), updated_at = now()
    WHERE id = v_order.id;
  ELSE
    RAISE EXCEPTION 'ยังไม่มีรายการหรือหมายเหตุที่ต้องการแก้ไข';
  END IF;

  SELECT jsonb_build_object(
    'order', jsonb_build_object('total', total, 'payable', payable, 'note', note, 'status', status),
    'items', COALESCE((SELECT jsonb_agg(jsonb_build_object('item_id', item_id, 'name', name, 'unit_price', unit_price, 'quantity', quantity) ORDER BY id) FROM public.delivery_order_items WHERE order_id = v_order.id), '[]'::jsonb)
  ) INTO v_after
  FROM public.delivery_orders
  WHERE id = v_order.id;

  INSERT INTO public.admin_action_audit(actor_id, target_user_id, action, reason, before_state, after_state)
  VALUES (auth.uid(), v_order.customer_id, 'food_order_detail_edited', left(trim(p_reason), 500), v_before, v_after);

  RETURN v_after;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_edit_food_order(text,jsonb,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_edit_food_order(text,jsonb,text,text) TO authenticated;
