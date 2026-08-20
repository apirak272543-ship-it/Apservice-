-- Wave P0: complete the existing order_refunds state machine with an audited Admin workflow.
-- This migration does not create a new money ledger. It only advances the existing
-- order_refunds/order_payments/order financial state machine under Admin control.

DROP FUNCTION IF EXISTS public.admin_process_order_refund(uuid,text,numeric,numeric,text,text,text,text);
CREATE FUNCTION public.admin_process_order_refund(
  p_refund_id uuid,
  p_action text,
  p_approved_amount numeric DEFAULT NULL,
  p_paid_amount numeric DEFAULT NULL,
  p_payment_reference text DEFAULT NULL,
  p_proof_image_url text DEFAULT NULL,
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
  v_refund public.order_refunds;
  v_payment public.order_payments;
  v_order public.delivery_orders;
  v_before jsonb;
  v_after jsonb;
  v_reason text;
  v_proof text;
  v_reference text;
  v_amount numeric;
  v_payment_cap numeric;
  v_payment_status text;
  v_order_workflow text;
  v_order_status text;
  v_event_action text;
  v_notification_title text;
  v_notification_body text;
BEGIN
  IF v_admin_id IS NULL OR NOT private.has_role('admin') THEN
    RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้นที่จัดการคำขอคืนเงินได้';
  END IF;
  IF p_action NOT IN ('approve', 'reject', 'mark_paid') THEN
    RAISE EXCEPTION 'คำสั่งจัดการคืนเงินไม่ถูกต้อง';
  END IF;
  IF p_refund_id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบรหัสคำขอคืนเงิน';
  END IF;
  IF char_length(btrim(coalesce(p_idempotency_key, ''))) NOT BETWEEN 12 AND 220 THEN
    RAISE EXCEPTION 'รหัสยืนยันการจัดการคืนเงินไม่ถูกต้อง';
  END IF;
  v_reason := private.require_admin_override_reason(p_reason);
  v_reference := nullif(btrim(coalesce(p_payment_reference, '')), '');
  IF v_reference IS NOT NULL AND char_length(v_reference) > 120 THEN
    RAISE EXCEPTION 'เลขอ้างอิงการคืนเงินยาวเกิน 120 ตัวอักษร';
  END IF;
  v_proof := nullif(btrim(coalesce(p_proof_image_url, '')), '');
  IF v_proof IS NOT NULL AND (char_length(v_proof) > 1024 OR v_proof NOT LIKE 'refund-proofs/' || v_admin_id::text || '/%') THEN
    RAISE EXCEPTION 'หลักฐานคืนเงินต้องเป็นไฟล์ private ที่ Admin ผู้ดำเนินการอัปโหลดในพื้นที่ refund-proofs';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_admin_id::text || ':refund:' || p_refund_id::text || ':' || btrim(p_idempotency_key)));
  IF EXISTS (
    SELECT 1 FROM public.order_financial_events
    WHERE refund_id = p_refund_id AND idempotency_key = btrim(p_idempotency_key)
  ) THEN
    SELECT * INTO v_refund FROM public.order_refunds WHERE id = p_refund_id;
    RETURN jsonb_build_object('refund_id', p_refund_id, 'status', v_refund.status, 'replayed', true);
  END IF;

  SELECT * INTO v_refund FROM public.order_refunds WHERE id = p_refund_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบคำขอคืนเงิน'; END IF;
  SELECT * INTO v_order FROM public.delivery_orders WHERE id = v_refund.order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบออร์เดอร์ของคำขอคืนเงิน'; END IF;
  SELECT * INTO v_payment FROM public.order_payments WHERE id = v_refund.payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบรายการชำระเงินที่อ้างอิง'; END IF;
  IF v_payment.order_id <> v_order.id OR v_refund.customer_id IS DISTINCT FROM v_order.customer_id THEN
    RAISE EXCEPTION 'ข้อมูลออร์เดอร์ Payment และ Refund ไม่สัมพันธ์กัน';
  END IF;

  v_before := jsonb_build_object(
    'refund_status', v_refund.status,
    'requested_amount', v_refund.requested_amount,
    'approved_amount', v_refund.approved_amount,
    'paid_amount', v_refund.paid_amount,
    'payment_status', v_payment.status,
    'workflow_state', v_order.workflow_state,
    'order_status', v_order.status
  );

  IF p_action = 'approve' THEN
    IF v_refund.status <> 'requested' THEN
      RAISE EXCEPTION 'คำขอคืนเงินนี้ไม่อยู่ในคิวรออนุมัติ';
    END IF;
    IF v_payment.status NOT IN ('verified', 'paid', 'refund_pending') THEN
      RAISE EXCEPTION 'รายการชำระเงินยังไม่อยู่ในสถานะที่อนุมัติคืนเงินได้';
    END IF;
    v_payment_cap := CASE WHEN coalesce(v_payment.captured_amount, 0) > 0 THEN v_payment.captured_amount ELSE v_payment.expected_amount END;
    v_amount := coalesce(p_approved_amount, v_refund.requested_amount);
    IF v_amount <= 0 OR v_amount > v_refund.requested_amount OR v_amount > v_payment_cap THEN
      RAISE EXCEPTION 'ยอดอนุมัติคืนเงินต้องมากกว่า 0 และไม่เกินยอดที่ขอหรือยอดชำระที่ยืนยันแล้ว';
    END IF;
    UPDATE public.order_refunds
    SET status = 'approved', approved_amount = v_amount, approved_by = v_admin_id, approved_at = now(), updated_at = now()
    WHERE id = v_refund.id;
    UPDATE public.order_payments SET status = 'refund_pending', updated_at = now() WHERE id = v_payment.id;
    v_event_action := 'refund_approved';
    v_notification_title := 'คำขอคืนเงินได้รับการอนุมัติ';
    v_notification_body := 'ออร์เดอร์ ' || v_order.id || ' ได้รับอนุมัติคืนเงิน ' || to_char(v_amount, 'FM999999990.00') || ' บาท และกำลังดำเนินการโอนคืน';

  ELSIF p_action = 'reject' THEN
    IF v_refund.status <> 'requested' THEN
      RAISE EXCEPTION 'คำขอคืนเงินนี้ไม่อยู่ในคิวรอพิจารณา';
    END IF;
    UPDATE public.order_refunds
    SET status = 'rejected', approved_amount = 0, approved_by = v_admin_id, approved_at = now(), updated_at = now()
    WHERE id = v_refund.id;
    v_payment_status := CASE WHEN coalesce(v_payment.captured_amount, 0) > 0 THEN 'paid' ELSE 'verified' END;
    UPDATE public.order_payments SET status = v_payment_status, updated_at = now() WHERE id = v_payment.id;
    UPDATE public.delivery_orders SET workflow_state = 'cancelled', status = 'ยกเลิกแล้ว', workflow_updated_at = now(), updated_at = now() WHERE id = v_order.id;
    v_event_action := 'refund_rejected';
    v_notification_title := 'คำขอคืนเงินไม่ผ่านการอนุมัติ';
    v_notification_body := 'ออร์เดอร์ ' || v_order.id || ' ถูกยกเลิกแล้ว แต่คำขอคืนเงินไม่ผ่านการอนุมัติ กรุณาติดต่อศูนย์ช่วยเหลือหากต้องการตรวจสอบเพิ่มเติม';

  ELSE
    IF v_refund.status <> 'approved' THEN
      RAISE EXCEPTION 'ต้องอนุมัติคำขอคืนเงินก่อนบันทึกการโอนคืน';
    END IF;
    v_amount := coalesce(p_paid_amount, v_refund.approved_amount);
    IF v_amount IS NULL OR v_amount <= 0 OR v_amount > v_refund.approved_amount THEN
      RAISE EXCEPTION 'ยอดที่โอนคืนต้องมากกว่า 0 และไม่เกินยอดที่อนุมัติ';
    END IF;
    IF v_reference IS NULL AND v_proof IS NULL THEN
      RAISE EXCEPTION 'การบันทึกโอนคืนต้องมีเลขอ้างอิงหรือหลักฐานการโอนอย่างน้อยหนึ่งอย่าง';
    END IF;
    UPDATE public.order_refunds
    SET status = 'paid', paid_amount = v_amount, paid_by = v_admin_id, paid_at = now(), payment_reference = v_reference, proof_image_url = v_proof, updated_at = now()
    WHERE id = v_refund.id;
    v_payment_status := CASE
      WHEN v_amount >= CASE WHEN coalesce(v_payment.captured_amount, 0) > 0 THEN v_payment.captured_amount ELSE v_payment.expected_amount END THEN 'refunded'
      ELSE 'partially_refunded'
    END;
    v_order_workflow := CASE WHEN v_payment_status = 'refunded' THEN 'refunded' ELSE 'partially_refunded' END;
    v_order_status := CASE WHEN v_payment_status = 'refunded' THEN 'คืนเงินแล้ว' ELSE 'คืนเงินบางส่วน' END;
    UPDATE public.order_payments SET status = v_payment_status, updated_at = now() WHERE id = v_payment.id;
    UPDATE public.delivery_orders SET workflow_state = v_order_workflow, status = v_order_status, workflow_updated_at = now(), updated_at = now() WHERE id = v_order.id;
    v_event_action := 'refund_paid';
    v_notification_title := CASE WHEN v_payment_status = 'refunded' THEN 'คืนเงินสำเร็จแล้ว' ELSE 'คืนเงินบางส่วนสำเร็จแล้ว' END;
    v_notification_body := 'ออร์เดอร์ ' || v_order.id || ' คืนเงินให้แล้ว ' || to_char(v_amount, 'FM999999990.00') || ' บาท';
  END IF;

  SELECT * INTO v_refund FROM public.order_refunds WHERE id = v_refund.id;
  SELECT * INTO v_payment FROM public.order_payments WHERE id = v_payment.id;
  SELECT * INTO v_order FROM public.delivery_orders WHERE id = v_order.id;
  v_after := jsonb_build_object(
    'refund_status', v_refund.status,
    'requested_amount', v_refund.requested_amount,
    'approved_amount', v_refund.approved_amount,
    'paid_amount', v_refund.paid_amount,
    'payment_status', v_payment.status,
    'workflow_state', v_order.workflow_state,
    'order_status', v_order.status
  );

  INSERT INTO public.order_status_events(order_id, status, actor_id, actor_label)
  VALUES (v_order.id, CASE WHEN v_event_action = 'refund_approved' THEN 'รอดำเนินการคืนเงิน' WHEN v_event_action = 'refund_rejected' THEN 'ปฏิเสธคืนเงิน' ELSE v_order.status END, v_admin_id, 'Admin');
  INSERT INTO public.order_financial_events(order_id, payment_id, refund_id, actor_id, actor_role, action, idempotency_key, before_state, after_state, reason)
  VALUES (v_order.id, v_payment.id, v_refund.id, v_admin_id, 'admin', v_event_action, btrim(p_idempotency_key), v_before, v_after, v_reason);
  INSERT INTO public.admin_action_audit(actor_id, target_user_id, target_type, target_id, action, reason, evidence_path, before_state, after_state, metadata)
  VALUES (v_admin_id, v_order.customer_id, 'order', v_order.id, v_event_action, v_reason, v_proof, v_before, v_after, jsonb_build_object('refund_id', v_refund.id, 'financial', true));
  IF v_order.customer_id IS NOT NULL THEN
    INSERT INTO public.mobile_notifications(recipient_id, recipient_role, title, body, data, status, created_at, sent_at)
    VALUES (v_order.customer_id, 'customer', v_notification_title, v_notification_body, jsonb_build_object('order_id', v_order.id, 'refund_id', v_refund.id, 'deep_link', 'order.html?id=' || v_order.id), 'sent', now(), now());
  END IF;
  RETURN jsonb_build_object('refund_id', v_refund.id, 'status', v_refund.status, 'payment_status', v_payment.status, 'workflow_state', v_order.workflow_state, 'replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_process_order_refund(uuid,text,numeric,numeric,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_process_order_refund(uuid,text,numeric,numeric,text,text,text,text) TO authenticated;
