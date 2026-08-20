-- Merchant decline must request a controlled cancellation; only an Admin can
-- approve the cancellation and decide whether a verified payment becomes a refund.

CREATE OR REPLACE FUNCTION public.request_merchant_order_cancellation(
  p_order_id text,
  p_reason_code text,
  p_detail text DEFAULT '',
  p_idempotency_key text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_merchant_id uuid := auth.uid();
  v_order public.delivery_orders;
  v_existing public.order_cancellation_requests;
  v_reason text;
  v_before jsonb;
BEGIN
  IF v_merchant_id IS NULL OR NOT private.has_role('store_owner') THEN
    RAISE EXCEPTION 'เฉพาะบัญชีร้านค้าที่ได้รับสิทธิ์เท่านั้นที่ปฏิเสธออร์เดอร์ได้';
  END IF;
  IF char_length(btrim(coalesce(p_idempotency_key, ''))) NOT BETWEEN 12 AND 220 THEN
    RAISE EXCEPTION 'รหัสยืนยันคำขอไม่ถูกต้อง กรุณาลองใหม่';
  END IF;
  IF p_reason_code NOT IN ('out_of_stock','store_closed','equipment_issue','other') THEN
    RAISE EXCEPTION 'ประเภทเหตุผลการปฏิเสธไม่ถูกต้อง';
  END IF;
  IF char_length(btrim(coalesce(p_detail, ''))) > 500 OR (p_reason_code = 'other' AND char_length(btrim(coalesce(p_detail, ''))) < 3) THEN
    RAISE EXCEPTION 'กรุณาระบุรายละเอียดอื่น ๆ อย่างน้อย 3 ตัวอักษร หรือย่อรายละเอียดให้ไม่เกิน 500 ตัวอักษร';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_merchant_id::text || ':merchant-cancel:' || btrim(p_idempotency_key)));
  SELECT * INTO v_order FROM public.delivery_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.id = v_order.store_id AND s.owner_id = v_merchant_id) THEN
    RAISE EXCEPTION 'ไม่พบออร์เดอร์ของร้านค้าที่เข้าสู่ระบบ';
  END IF;
  IF v_order.workflow_state NOT IN ('store_accepted','preparing') THEN
    RAISE EXCEPTION 'สถานะออร์เดอร์นี้ไม่อนุญาตให้ร้านส่งคำขอยกเลิก';
  END IF;
  SELECT * INTO v_existing FROM public.order_cancellation_requests WHERE order_id = v_order.id AND status = 'requested' LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('id', v_existing.id, 'status', v_existing.status, 'replayed', true);
  END IF;
  v_reason := CASE p_reason_code
    WHEN 'out_of_stock' THEN 'สินค้า/วัตถุดิบหมด'
    WHEN 'store_closed' THEN 'ร้านปิดกะทันหัน'
    WHEN 'equipment_issue' THEN 'อุปกรณ์ทำอาหารมีปัญหา'
    ELSE 'อื่น ๆ'
  END || CASE WHEN char_length(btrim(coalesce(p_detail, ''))) > 0 THEN ': ' || btrim(p_detail) ELSE '' END;
  v_before := jsonb_build_object('workflow_state', v_order.workflow_state, 'status', v_order.status);
  INSERT INTO public.order_cancellation_requests(order_id, customer_id, requested_by, requester_role, reason, evidence, idempotency_key)
  VALUES (v_order.id, v_order.customer_id, v_merchant_id, 'store_owner', v_reason, jsonb_build_object('reason_code', p_reason_code), btrim(p_idempotency_key))
  RETURNING * INTO v_existing;
  UPDATE public.delivery_orders
  SET workflow_state = 'cancel_requested', status = 'รอพิจารณายกเลิก', workflow_updated_at = now(), updated_at = now()
  WHERE id = v_order.id;
  INSERT INTO public.order_status_events(order_id, status, actor_id, actor_label)
  VALUES (v_order.id, 'ร้านค้าส่งคำขอยกเลิก', v_merchant_id, 'Merchant');
  INSERT INTO public.order_financial_events(order_id, actor_id, actor_role, action, idempotency_key, before_state, after_state, reason)
  VALUES (v_order.id, v_merchant_id, 'store_owner', 'merchant_cancellation_requested', btrim(p_idempotency_key), v_before, jsonb_build_object('workflow_state', 'cancel_requested', 'request_id', v_existing.id), v_reason);
  RETURN jsonb_build_object('id', v_existing.id, 'status', v_existing.status, 'workflow_state', 'cancel_requested', 'replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.request_merchant_order_cancellation(text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_merchant_order_cancellation(text,text,text,text) TO authenticated;
