-- Corrective Wave P1: clear stale ETA whenever the assigned Rider changes.
-- This preserves the current dispatch/ETA contract and only replaces the RPC body.

CREATE OR REPLACE FUNCTION public.admin_update_order_dispatch(
  p_order_id text,
  p_dispatch_status text,
  p_rider_id text DEFAULT NULL,
  p_eta_minutes integer DEFAULT NULL,
  p_update_eta boolean DEFAULT false,
  p_dispatch_note text DEFAULT '',
  p_reason text DEFAULT '',
  p_idempotency_key text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth, pg_temp
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_order public.delivery_orders;
  v_rider public.riders;
  v_previous_rider_id text;
  v_next_eta timestamptz;
  v_dispatch_status text := btrim(coalesce(p_dispatch_status, ''));
  v_rider_id text := nullif(btrim(coalesce(p_rider_id, '')), '');
  v_note text := left(btrim(coalesce(p_dispatch_note, '')), 500);
  v_reason text := btrim(coalesce(p_reason, ''));
  v_key text := btrim(coalesce(p_idempotency_key, ''));
  v_event_type text;
  v_now timestamptz := now();
  v_rider_user_id uuid;
  v_rider_name text;
  v_replay public.delivery_dispatch_events;
BEGIN
  IF v_admin_id IS NULL OR NOT private.has_role('admin') THEN
    RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้นที่จัดการ Dispatch/ETA ได้';
  END IF;
  IF p_order_id IS NULL OR char_length(btrim(p_order_id)) = 0 THEN
    RAISE EXCEPTION 'ไม่พบรหัสออร์เดอร์';
  END IF;
  IF v_dispatch_status NOT IN ('unassigned', 'assigned', 'en_route', 'arrived_pickup', 'picked_up', 'delivering', 'delivered', 'exception') THEN
    RAISE EXCEPTION 'สถานะ Dispatch ไม่ถูกต้อง';
  END IF;
  IF char_length(v_reason) < 10 OR char_length(v_reason) > 500 THEN
    RAISE EXCEPTION 'เหตุผล Dispatch ต้องมีความยาว 10–500 ตัวอักษร';
  END IF;
  IF char_length(v_key) NOT BETWEEN 12 AND 220 THEN
    RAISE EXCEPTION 'รหัสยืนยัน Dispatch ไม่ถูกต้อง';
  END IF;
  IF p_update_eta IS TRUE AND p_eta_minutes IS NOT NULL AND (p_eta_minutes < 0 OR p_eta_minutes > 1440) THEN
    RAISE EXCEPTION 'ETA ต้องอยู่ระหว่าง 0 ถึง 1440 นาที';
  END IF;

  SELECT * INTO v_replay
  FROM public.delivery_dispatch_events
  WHERE order_id = p_order_id AND idempotency_key = v_key
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'order_id', v_replay.order_id,
      'rider_id', v_replay.rider_id,
      'dispatch_status', v_replay.dispatch_status,
      'estimated_arrival_at', v_replay.estimated_arrival_at,
      'replayed', true
    );
  END IF;

  SELECT * INTO v_order
  FROM public.delivery_orders
  WHERE id = p_order_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบออร์เดอร์ที่ต้องการจัดการ'; END IF;
  IF v_order.status IN ('สำเร็จแล้ว', 'ยกเลิก', 'ถูกยกเลิก', 'completed', 'cancelled', 'canceled') THEN
    RAISE EXCEPTION 'ออร์เดอร์ที่ปิดงานแล้วไม่สามารถแก้ Dispatch/ETA ได้';
  END IF;

  v_previous_rider_id := v_order.rider_id;
  IF v_rider_id IS NOT NULL THEN
    SELECT * INTO v_rider
    FROM public.riders
    WHERE id = v_rider_id
    FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบ Rider ที่เลือก'; END IF;
    IF NOT (v_rider.status = 'พร้อมรับงาน' OR v_rider.ride_available IS TRUE)
       OR lower(coalesce(v_rider.compliance_status, '')) IN ('suspended', 'expired') THEN
      RAISE EXCEPTION 'Rider ที่เลือกยังไม่พร้อมรับงานหรือถูกระงับ';
    END IF;
    v_rider_user_id := v_rider.user_id;
    v_rider_name := v_rider.name;
  END IF;
  IF v_dispatch_status <> 'unassigned' AND v_rider_id IS NULL THEN
    RAISE EXCEPTION 'Dispatch status นี้ต้องมี Rider ที่มอบหมายแล้ว';
  END IF;
  IF v_dispatch_status = 'unassigned' THEN
    v_rider_id := NULL;
    v_rider_name := NULL;
  END IF;

  v_next_eta := v_order.estimated_arrival_at;
  IF v_dispatch_status = 'unassigned' OR v_previous_rider_id IS DISTINCT FROM v_rider_id THEN
    v_next_eta := NULL;
  ELSIF p_update_eta IS TRUE THEN
    v_next_eta := CASE WHEN p_eta_minutes IS NULL THEN NULL ELSE v_now + make_interval(mins => p_eta_minutes) END;
  END IF;

  v_event_type := CASE
    WHEN v_previous_rider_id IS DISTINCT FROM v_rider_id AND v_rider_id IS NULL THEN 'unassigned'
    WHEN v_previous_rider_id IS DISTINCT FROM v_rider_id THEN 'assigned'
    WHEN p_update_eta IS TRUE AND v_next_eta IS NULL THEN 'eta_cleared'
    WHEN p_update_eta IS TRUE THEN 'eta_set'
    ELSE 'status_updated'
  END;

  UPDATE public.delivery_orders
  SET rider_id = v_rider_id,
      rider_name = v_rider_name,
      dispatch_status = v_dispatch_status,
      assigned_at = CASE WHEN v_rider_id IS NULL THEN NULL ELSE COALESCE(v_order.assigned_at, v_now) END,
      estimated_arrival_at = v_next_eta,
      eta_source = CASE WHEN p_update_eta IS TRUE AND v_next_eta IS NOT NULL THEN 'admin' WHEN v_next_eta IS NULL THEN NULL ELSE v_order.eta_source END,
      dispatch_note = NULLIF(v_note, ''),
      dispatch_updated_at = v_now,
      updated_at = v_now
  WHERE id = v_order.id;

  INSERT INTO public.delivery_dispatch_events(order_id, rider_id, actor_id, actor_role, event_type, dispatch_status, estimated_arrival_at, note, idempotency_key)
  VALUES (v_order.id, v_rider_id, v_admin_id, 'admin', v_event_type, v_dispatch_status, v_next_eta, v_reason || CASE WHEN v_note <> '' THEN ' · ' || v_note ELSE '' END, v_key);

  INSERT INTO public.admin_action_audit(actor_id, target_user_id, target_type, target_id, action, reason, before_state, after_state, metadata)
  VALUES (
    v_admin_id,
    v_order.customer_id,
    'order',
    v_order.id,
    'order_dispatch_updated',
    v_reason,
    jsonb_build_object('rider_id', v_previous_rider_id, 'dispatch_status', v_order.dispatch_status, 'estimated_arrival_at', v_order.estimated_arrival_at),
    jsonb_build_object('rider_id', v_rider_id, 'dispatch_status', v_dispatch_status, 'estimated_arrival_at', v_next_eta),
    jsonb_build_object('event_type', v_event_type, 'idempotency_key', v_key)
  );

  IF v_order.customer_id IS NOT NULL THEN
    INSERT INTO public.mobile_notifications(recipient_id, recipient_role, title, body, data, status, created_at, sent_at)
    VALUES (
      v_order.customer_id,
      'customer',
      CASE WHEN v_next_eta IS NULL THEN 'อัปเดตการจัดส่งออร์เดอร์' ELSE 'อัปเดตเวลาถึงโดยประมาณ' END,
      CASE WHEN v_next_eta IS NULL THEN 'ออร์เดอร์ ' || v_order.id || ' มีการอัปเดตการจัดส่งแล้ว' ELSE 'ออร์เดอร์ ' || v_order.id || ' คาดว่าจะถึงประมาณ ' || to_char(v_next_eta AT TIME ZONE 'Asia/Bangkok', 'DD Mon HH24:MI') || ' น.' END,
      jsonb_build_object('order_id', v_order.id, 'dispatch_status', v_dispatch_status, 'estimated_arrival_at', v_next_eta, 'deep_link', 'order.html?id=' || v_order.id),
      'sent',
      v_now,
      v_now
    );
  END IF;
  IF v_rider_user_id IS NOT NULL AND v_previous_rider_id IS DISTINCT FROM v_rider_id THEN
    INSERT INTO public.mobile_notifications(recipient_id, recipient_role, title, body, data, status, created_at, sent_at)
    VALUES (
      v_rider_user_id,
      'rider',
      'มีงานจัดส่งใหม่',
      'ออร์เดอร์ ' || v_order.id || ' ถูกมอบหมายให้คุณแล้ว',
      jsonb_build_object('order_id', v_order.id, 'dispatch_status', v_dispatch_status, 'deep_link', 'delivery.html?id=' || v_order.id),
      'sent',
      v_now,
      v_now
    );
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'rider_id', v_rider_id,
    'rider_name', v_rider_name,
    'dispatch_status', v_dispatch_status,
    'estimated_arrival_at', v_next_eta,
    'event_type', v_event_type,
    'replayed', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_order_dispatch(text,text,text,integer,boolean,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_order_dispatch(text,text,text,integer,boolean,text,text,text) TO authenticated;

