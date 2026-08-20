-- Wave P4 follow-up: retain the existing financial state machines while adding
-- mandatory Admin reasoning and optional private evidence to review actions.

DROP FUNCTION IF EXISTS public.admin_resolve_order_cancellation(uuid,text,text,text,text);
CREATE FUNCTION public.admin_resolve_order_cancellation(
  p_request_id uuid,
  p_action text,
  p_resolution_reason text,
  p_refund_decision text DEFAULT 'no_refund',
  p_idempotency_key text DEFAULT '',
  p_evidence_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth, pg_temp
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_request public.order_cancellation_requests;
  v_order public.delivery_orders;
  v_payment public.order_payments;
  v_refund public.order_refunds;
  v_before jsonb;
  v_reason text;
  v_evidence text;
BEGIN
  IF v_admin_id IS NULL OR NOT private.has_role('admin') THEN RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้นที่พิจารณาคำขอยกเลิกได้'; END IF;
  IF p_action NOT IN ('approve','reject') THEN RAISE EXCEPTION 'กรุณาระบุผลพิจารณาให้ถูกต้อง'; END IF;
  IF p_refund_decision NOT IN ('no_refund','refund_pending') THEN RAISE EXCEPTION 'รูปแบบผลการคืนเงินไม่ถูกต้อง'; END IF;
  IF char_length(btrim(coalesce(p_idempotency_key, ''))) NOT BETWEEN 12 AND 220 THEN RAISE EXCEPTION 'รหัสยืนยันการพิจารณาไม่ถูกต้อง กรุณาลองใหม่'; END IF;
  v_reason := private.require_admin_override_reason(p_resolution_reason);
  v_evidence := private.validate_admin_override_evidence(p_evidence_path);
  PERFORM pg_advisory_xact_lock(hashtext(v_admin_id::text || ':cancel-resolve:' || btrim(p_idempotency_key)));
  SELECT * INTO v_request FROM public.order_cancellation_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบคำขอยกเลิก'; END IF;
  IF v_request.status <> 'requested' THEN RETURN jsonb_build_object('id', v_request.id, 'status', v_request.status, 'replayed', true); END IF;
  SELECT * INTO v_order FROM public.delivery_orders WHERE id = v_request.order_id FOR UPDATE;
  SELECT * INTO v_payment FROM public.order_payments WHERE order_id = v_order.id FOR UPDATE;
  v_before := jsonb_build_object('workflow_state', v_order.workflow_state, 'payment_status', v_payment.status, 'payment_amount', v_payment.expected_amount);
  IF p_action = 'reject' THEN
    UPDATE public.order_cancellation_requests SET status = 'rejected', resolution_reason = v_reason, resolved_by = v_admin_id, resolved_at = now(), updated_at = now() WHERE id = v_request.id;
    UPDATE public.delivery_orders SET workflow_state = CASE WHEN v_order.workflow_state = 'cancel_requested' THEN 'store_accepted' ELSE v_order.workflow_state END, status = CASE WHEN v_order.status = 'รอพิจารณายกเลิก' THEN 'ร้านค้ารับออร์เดอร์' ELSE v_order.status END, workflow_updated_at = now(), updated_at = now() WHERE id = v_order.id;
  ELSE
    UPDATE public.order_cancellation_requests SET status = 'approved', resolution_reason = v_reason, resolved_by = v_admin_id, resolved_at = now(), updated_at = now() WHERE id = v_request.id;
    UPDATE public.delivery_orders SET workflow_state = CASE WHEN p_refund_decision = 'refund_pending' THEN 'refund_pending' ELSE 'cancelled' END, status = CASE WHEN p_refund_decision = 'refund_pending' THEN 'รอดำเนินการคืนเงิน' ELSE 'ยกเลิกแล้ว' END, workflow_updated_at = now(), updated_at = now() WHERE id = v_order.id;
    IF p_refund_decision = 'refund_pending' THEN
      IF v_payment.id IS NULL OR v_payment.status NOT IN ('verified','paid') OR v_payment.expected_amount <= 0 THEN RAISE EXCEPTION 'ยังไม่มีรายการชำระเงินที่ยืนยันแล้ว จึงเปิดคำขอคืนเงินไม่ได้'; END IF;
      INSERT INTO public.order_refunds(order_id, payment_id, customer_id, requested_amount, status, reason, requested_by, idempotency_key)
      VALUES (v_order.id, v_payment.id, v_order.customer_id, v_payment.expected_amount, 'requested', v_reason, v_admin_id, btrim(p_idempotency_key))
      ON CONFLICT (payment_id, idempotency_key) DO UPDATE SET updated_at = now()
      RETURNING * INTO v_refund;
      UPDATE public.order_payments SET status = 'refund_pending', updated_at = now() WHERE id = v_payment.id;
    END IF;
  END IF;
  INSERT INTO public.order_status_events(order_id, status, actor_id, actor_label)
  VALUES (v_order.id, CASE WHEN p_action = 'reject' THEN 'ปฏิเสธคำขอยกเลิก' WHEN p_refund_decision = 'refund_pending' THEN 'รอดำเนินการคืนเงิน' ELSE 'ยกเลิกแล้ว' END, v_admin_id, 'Admin');
  INSERT INTO public.order_financial_events(order_id, payment_id, refund_id, actor_id, actor_role, action, idempotency_key, before_state, after_state, reason)
  VALUES (v_order.id, v_payment.id, v_refund.id, v_admin_id, 'admin', CASE WHEN p_action = 'reject' THEN 'cancellation_rejected' ELSE 'cancellation_approved' END, btrim(p_idempotency_key), v_before, jsonb_build_object('cancellation_status', p_action, 'refund_decision', p_refund_decision, 'refund_id', v_refund.id), v_reason);
  INSERT INTO public.admin_action_audit(actor_id, target_user_id, target_type, target_id, action, reason, evidence_path, before_state, after_state, metadata)
  VALUES (v_admin_id, v_order.customer_id, 'order', v_order.id, CASE WHEN p_action = 'reject' THEN 'order_cancellation_rejected' ELSE 'order_cancellation_approved' END, v_reason, v_evidence, v_before, jsonb_build_object('order_id',v_order.id,'refund_decision',p_refund_decision,'refund_id',v_refund.id), jsonb_build_object('override', true, 'financial', p_refund_decision = 'refund_pending'));
  RETURN jsonb_build_object('id', v_request.id, 'status', CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END, 'refund_id', v_refund.id, 'replayed', false);
END;
$$;

DROP FUNCTION IF EXISTS public.admin_review_checkout_group_payment(uuid,text,text,text);
CREATE FUNCTION public.admin_review_checkout_group_payment(
  p_checkout_group_id uuid,
  p_decision text,
  p_reason text,
  p_idempotency_key text,
  p_evidence_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth, pg_temp
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_payment public.checkout_group_payments;
  v_before jsonb;
  v_status text;
  v_reason text;
  v_evidence text;
BEGIN
  IF v_admin_id IS NULL OR NOT private.has_role('admin') THEN RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้นที่ตรวจสอบการชำระเงินได้'; END IF;
  IF p_decision NOT IN ('verify','reject') THEN RAISE EXCEPTION 'ผลพิจารณาไม่ถูกต้อง'; END IF;
  IF char_length(btrim(coalesce(p_idempotency_key, ''))) NOT BETWEEN 12 AND 220 THEN RAISE EXCEPTION 'รหัสยืนยันการตรวจสอบไม่ถูกต้อง'; END IF;
  v_reason := private.require_admin_override_reason(p_reason);
  v_evidence := private.validate_admin_override_evidence(p_evidence_path);
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
  UPDATE public.checkout_group_payments SET status = v_status, reviewed_at = now(), reviewed_by = v_admin_id, reviewer_note = v_reason, updated_at = now() WHERE id = v_payment.id;
  INSERT INTO public.checkout_group_events(checkout_group_id, actor_id, actor_role, action, idempotency_key, before_state, after_state, reason)
  VALUES (p_checkout_group_id, v_admin_id, 'admin', 'payment_reviewed', btrim(p_idempotency_key), v_before, jsonb_build_object('status', v_status), v_reason);
  INSERT INTO public.admin_action_audit(actor_id, target_user_id, target_type, target_id, action, reason, evidence_path, before_state, after_state, metadata)
  VALUES (v_admin_id, v_payment.customer_id, 'checkout_group', p_checkout_group_id::text, 'checkout_group_payment_reviewed', v_reason, v_evidence, v_before, jsonb_build_object('checkout_group_id', p_checkout_group_id, 'status', v_status), jsonb_build_object('override', true, 'financial', true));
  RETURN jsonb_build_object('checkout_group_id', p_checkout_group_id, 'status', v_status, 'replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_order_cancellation(uuid,text,text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_review_checkout_group_payment(uuid,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_order_cancellation(uuid,text,text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_checkout_group_payment(uuid,text,text,text,text) TO authenticated;
