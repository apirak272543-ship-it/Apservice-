-- Wave P1.2: canonical workflow/payment/cancellation/refund foundations.
-- Existing Thai delivery_orders.status remains for legacy rendering; workflow_state is canonical.

CREATE TABLE IF NOT EXISTS public.checkout_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','partially_cancelled','cancelled','completed')),
  address_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  fee_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  payable_amount numeric NOT NULL DEFAULT 0 CHECK (payable_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT checkout_groups_idempotency_length CHECK (char_length(btrim(idempotency_key)) BETWEEN 12 AND 220),
  UNIQUE(customer_id, idempotency_key)
);

ALTER TABLE public.checkout_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS checkout_groups_select_owner_or_admin ON public.checkout_groups;
CREATE POLICY checkout_groups_select_owner_or_admin ON public.checkout_groups
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR private.has_role('admin'));

ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS checkout_group_id uuid REFERENCES public.checkout_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workflow_state text NOT NULL DEFAULT 'legacy_unmapped',
  ADD COLUMN IF NOT EXISTS workflow_updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.delivery_orders DROP CONSTRAINT IF EXISTS delivery_orders_workflow_state_check;
ALTER TABLE public.delivery_orders ADD CONSTRAINT delivery_orders_workflow_state_check CHECK (
  workflow_state IN (
    'legacy_unmapped','awaiting_payment','payment_review','payment_rejected','payment_verified',
    'store_accepted','preparing','ready_for_pickup','rider_assigned','picked_up','delivering',
    'delivered','completed','cancel_requested','cancellation_exception_requested','cancelled',
    'refund_pending','refunded','partially_refunded','disputed'
  )
);

UPDATE public.delivery_orders
SET workflow_state = CASE lower(coalesce(status, ''))
  WHEN 'รอตรวจสอบการชำระเงิน' THEN 'payment_review'
  WHEN 'รอชำระเงิน' THEN 'awaiting_payment'
  WHEN 'ร้านค้ารับออร์เดอร์' THEN 'store_accepted'
  WHEN 'กำลังเตรียมอาหาร' THEN 'preparing'
  WHEN 'พร้อมรับสินค้า' THEN 'ready_for_pickup'
  WHEN 'มอบหมายไรเดอร์แล้ว' THEN 'rider_assigned'
  WHEN 'ไรเดอร์รับสินค้าแล้ว' THEN 'picked_up'
  WHEN 'กำลังจัดส่ง' THEN 'delivering'
  WHEN 'ส่งสำเร็จ' THEN 'delivered'
  WHEN 'สำเร็จแล้ว' THEN 'completed'
  WHEN 'เสร็จสิ้นแล้ว' THEN 'completed'
  WHEN 'ยกเลิก' THEN 'cancelled'
  WHEN 'cancelled' THEN 'cancelled'
  WHEN 'refunded' THEN 'refunded'
  WHEN 'completed' THEN 'completed'
  ELSE 'legacy_unmapped'
END,
workflow_updated_at = now()
WHERE workflow_state = 'legacy_unmapped';

CREATE OR REPLACE FUNCTION public.sync_order_workflow_from_legacy_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_state text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.workflow_state IS DISTINCT FROM OLD.workflow_state THEN
    RETURN NEW;
  END IF;
  v_state := CASE lower(coalesce(NEW.status, ''))
    WHEN 'รอตรวจสอบการชำระเงิน' THEN 'payment_review'
    WHEN 'รอชำระเงิน' THEN 'awaiting_payment'
    WHEN 'ร้านค้ารับออร์เดอร์' THEN 'store_accepted'
    WHEN 'กำลังเตรียมอาหาร' THEN 'preparing'
    WHEN 'พร้อมรับสินค้า' THEN 'ready_for_pickup'
    WHEN 'มอบหมายไรเดอร์แล้ว' THEN 'rider_assigned'
    WHEN 'ไรเดอร์รับสินค้าแล้ว' THEN 'picked_up'
    WHEN 'กำลังจัดส่ง' THEN 'delivering'
    WHEN 'ส่งสำเร็จ' THEN 'delivered'
    WHEN 'สำเร็จแล้ว' THEN 'completed'
    WHEN 'เสร็จสิ้นแล้ว' THEN 'completed'
    WHEN 'ยกเลิกแล้ว' THEN 'cancelled'
    WHEN 'ยกเลิก' THEN 'cancelled'
    WHEN 'รอดำเนินการคืนเงิน' THEN 'refund_pending'
    WHEN 'คืนเงินแล้ว' THEN 'refunded'
    ELSE NULL
  END;
  IF v_state IS NOT NULL THEN
    NEW.workflow_state := v_state;
    NEW.workflow_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_order_workflow_before_legacy_status_update ON public.delivery_orders;
CREATE TRIGGER sync_order_workflow_before_legacy_status_update
  BEFORE UPDATE OF status ON public.delivery_orders
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_workflow_from_legacy_status();

CREATE TABLE IF NOT EXISTS public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.delivery_orders(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  method text NOT NULL,
  expected_amount numeric NOT NULL CHECK (expected_amount >= 0),
  captured_amount numeric NOT NULL DEFAULT 0 CHECK (captured_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','awaiting_slip','under_review','verified','paid','rejected','refund_pending','refunded','partially_refunded','cancelled')),
  reference text,
  payment_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS order_payments_customer_idx ON public.order_payments(customer_id, created_at DESC);
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_payments_select_customer_or_admin ON public.order_payments;
CREATE POLICY order_payments_select_customer_or_admin ON public.order_payments
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR private.has_role('admin'));

CREATE TABLE IF NOT EXISTS public.order_cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.delivery_orders(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  requester_role text NOT NULL CHECK (requester_role IN ('customer','store_owner','rider','admin','system')),
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','withdrawn')),
  resolution_reason text,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_cancellation_reason_length CHECK (char_length(btrim(reason)) BETWEEN 3 AND 1000),
  CONSTRAINT order_cancellation_key_length CHECK (char_length(btrim(idempotency_key)) BETWEEN 12 AND 220),
  UNIQUE(customer_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS order_cancellation_one_pending_per_order_idx
  ON public.order_cancellation_requests(order_id)
  WHERE status = 'requested';
ALTER TABLE public.order_cancellation_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_cancellations_select_customer_or_admin ON public.order_cancellation_requests;
CREATE POLICY order_cancellations_select_customer_or_admin ON public.order_cancellation_requests
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR private.has_role('admin'));

CREATE TABLE IF NOT EXISTS public.order_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.delivery_orders(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL REFERENCES public.order_payments(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  requested_amount numeric NOT NULL CHECK (requested_amount > 0),
  approved_amount numeric CHECK (approved_amount >= 0),
  paid_amount numeric CHECK (paid_amount >= 0),
  currency text NOT NULL DEFAULT 'THB' CHECK (currency = 'THB'),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','rejected','paid','cancelled')),
  reason text NOT NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at timestamptz,
  payment_reference text,
  proof_image_url text,
  idempotency_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_refunds_reason_length CHECK (char_length(btrim(reason)) BETWEEN 3 AND 1000),
  CONSTRAINT order_refunds_key_length CHECK (char_length(btrim(idempotency_key)) BETWEEN 12 AND 220),
  UNIQUE(payment_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS order_refunds_customer_idx ON public.order_refunds(customer_id, created_at DESC);
ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_refunds_select_customer_or_admin ON public.order_refunds;
CREATE POLICY order_refunds_select_customer_or_admin ON public.order_refunds
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR private.has_role('admin'));

CREATE TABLE IF NOT EXISTS public.order_financial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.delivery_orders(id) ON DELETE RESTRICT,
  payment_id uuid REFERENCES public.order_payments(id) ON DELETE SET NULL,
  refund_id uuid REFERENCES public.order_refunds(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  idempotency_key text,
  before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_financial_events_order_idx ON public.order_financial_events(order_id, created_at ASC);
ALTER TABLE public.order_financial_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_financial_events_select_customer_or_admin ON public.order_financial_events;
CREATE POLICY order_financial_events_select_customer_or_admin ON public.order_financial_events
  FOR SELECT TO authenticated
  USING (
    private.has_role('admin')
    OR EXISTS (SELECT 1 FROM public.delivery_orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.ensure_order_payment_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.order_payments(order_id, customer_id, method, expected_amount, status, payment_snapshot, created_at, updated_at)
  VALUES (
    NEW.id, NEW.customer_id, coalesce(NEW.payment_method, 'unknown'), coalesce(NEW.payable, NEW.total, 0),
    CASE WHEN NEW.payment_method = 'โอนผ่าน QR / แนบสลิป' THEN 'awaiting_slip' ELSE 'pending' END,
    jsonb_build_object('order_id', NEW.id, 'method', NEW.payment_method, 'expected_amount', coalesce(NEW.payable, NEW.total, 0), 'created_at', now()),
    now(), now()
  ) ON CONFLICT (order_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_order_payment_after_insert ON public.delivery_orders;
CREATE TRIGGER ensure_order_payment_after_insert
  AFTER INSERT ON public.delivery_orders
  FOR EACH ROW EXECUTE FUNCTION public.ensure_order_payment_record();

INSERT INTO public.order_payments(order_id, customer_id, method, expected_amount, status, payment_snapshot, created_at, updated_at)
SELECT
  o.id, o.customer_id, coalesce(o.payment_method, 'unknown'), coalesce(o.payable, o.total, 0),
  CASE
    WHEN o.workflow_state IN ('payment_review','awaiting_payment','payment_rejected') THEN 'under_review'
    WHEN o.workflow_state IN ('payment_verified','store_accepted','preparing','ready_for_pickup','rider_assigned','picked_up','delivering','delivered','completed') AND o.payment_method = 'โอนผ่าน QR / แนบสลิป' THEN 'verified'
    WHEN o.workflow_state IN ('cancelled','refunded','partially_refunded') THEN 'cancelled'
    WHEN o.payment_method = 'โอนผ่าน QR / แนบสลิป' THEN 'awaiting_slip'
    ELSE 'pending'
  END,
  jsonb_build_object('legacy_backfill', true, 'order_id', o.id, 'method', o.payment_method, 'expected_amount', coalesce(o.payable, o.total, 0)),
  now(), now()
FROM public.delivery_orders o
WHERE o.customer_id IS NOT NULL
ON CONFLICT (order_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sync_order_payment_from_slip_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_status text;
BEGIN
  v_status := CASE lower(coalesce(NEW.status, ''))
    WHEN 'verified' THEN 'verified'
    WHEN 'approved' THEN 'verified'
    WHEN 'rejected' THEN 'rejected'
    ELSE 'under_review'
  END;
  UPDATE public.order_payments
  SET status = v_status,
      reviewed_at = CASE WHEN v_status IN ('verified','rejected') THEN coalesce(NEW.reviewed_at, now()) ELSE reviewed_at END,
      reviewed_by = CASE WHEN v_status IN ('verified','rejected') THEN NEW.reviewed_by ELSE reviewed_by END,
      reviewer_note = CASE WHEN v_status = 'rejected' THEN NEW.reviewer_note ELSE reviewer_note END,
      payment_snapshot = payment_snapshot || jsonb_build_object('slip_id', NEW.id, 'slip_path', NEW.slip_path, 'slip_review_status', NEW.status, 'slip_uploaded_at', NEW.uploaded_at),
      updated_at = now()
  WHERE order_id = NEW.order_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_order_payment_after_slip_review ON public.payment_slip_reviews;
CREATE TRIGGER sync_order_payment_after_slip_review
  AFTER INSERT OR UPDATE OF status, reviewed_at, reviewed_by, reviewer_note, slip_path ON public.payment_slip_reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_order_payment_from_slip_review();

CREATE OR REPLACE FUNCTION public.request_customer_order_cancellation(
  p_order_id text,
  p_reason text,
  p_evidence jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, auth, pg_temp
AS $$
DECLARE
  v_customer_id uuid := auth.uid();
  v_order public.delivery_orders;
  v_request public.order_cancellation_requests;
  v_before jsonb;
BEGIN
  IF v_customer_id IS NULL OR NOT private.has_role('customer') THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบด้วยบัญชีลูกค้าก่อนขอยกเลิกออร์เดอร์';
  END IF;
  IF char_length(btrim(coalesce(p_reason, ''))) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION 'กรุณาระบุเหตุผลการยกเลิกอย่างน้อย 3 ตัวอักษร';
  END IF;
  IF char_length(btrim(coalesce(p_idempotency_key, ''))) NOT BETWEEN 12 AND 220 THEN
    RAISE EXCEPTION 'รหัสยืนยันคำขอยกเลิกไม่ถูกต้อง กรุณาลองใหม่';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_customer_id::text || ':cancel:' || btrim(p_idempotency_key)));
  SELECT * INTO v_request FROM public.order_cancellation_requests WHERE customer_id = v_customer_id AND idempotency_key = btrim(p_idempotency_key) LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object('id', v_request.id, 'status', v_request.status, 'replayed', true);
  END IF;
  SELECT * INTO v_order FROM public.delivery_orders WHERE id = p_order_id AND customer_id = v_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบออร์เดอร์หรือคุณไม่มีสิทธิ์ขอยกเลิก';
  END IF;
  IF v_order.workflow_state NOT IN ('awaiting_payment','payment_review','payment_rejected','store_accepted','preparing') THEN
    RAISE EXCEPTION 'ออร์เดอร์อยู่ในสถานะที่ต้องให้ผู้ดูแลพิจารณาเป็นกรณีพิเศษ';
  END IF;
  v_before := jsonb_build_object('workflow_state', v_order.workflow_state, 'status', v_order.status);
  INSERT INTO public.order_cancellation_requests(order_id, customer_id, requested_by, requester_role, reason, evidence, idempotency_key)
  VALUES (v_order.id, v_customer_id, v_customer_id, 'customer', btrim(p_reason), coalesce(p_evidence, '{}'::jsonb), btrim(p_idempotency_key))
  RETURNING * INTO v_request;
  UPDATE public.delivery_orders SET workflow_state = 'cancel_requested', status = 'รอพิจารณายกเลิก', workflow_updated_at = now(), updated_at = now() WHERE id = v_order.id;
  INSERT INTO public.order_status_events(order_id, status, actor_id, actor_label) VALUES (v_order.id, 'รอพิจารณายกเลิก', v_customer_id, 'Customer');
  INSERT INTO public.order_financial_events(order_id, actor_id, actor_role, action, idempotency_key, before_state, after_state, reason)
  VALUES (v_order.id, v_customer_id, 'customer', 'cancellation_requested', btrim(p_idempotency_key), v_before, jsonb_build_object('workflow_state','cancel_requested','request_id',v_request.id), btrim(p_reason));
  RETURN jsonb_build_object('id', v_request.id, 'status', v_request.status, 'workflow_state', 'cancel_requested', 'replayed', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_resolve_order_cancellation(
  p_request_id uuid,
  p_action text,
  p_resolution_reason text,
  p_refund_decision text DEFAULT 'no_refund',
  p_idempotency_key text DEFAULT ''
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
BEGIN
  IF v_admin_id IS NULL OR NOT private.has_role('admin') THEN
    RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้นที่พิจารณาคำขอยกเลิกได้';
  END IF;
  IF p_action NOT IN ('approve','reject') OR char_length(btrim(coalesce(p_resolution_reason, ''))) NOT BETWEEN 3 AND 1000 THEN
    RAISE EXCEPTION 'กรุณาระบุผลพิจารณาและเหตุผลให้ถูกต้อง';
  END IF;
  IF p_refund_decision NOT IN ('no_refund','refund_pending') THEN
    RAISE EXCEPTION 'รูปแบบผลการคืนเงินไม่ถูกต้อง';
  END IF;
  IF char_length(btrim(coalesce(p_idempotency_key, ''))) NOT BETWEEN 12 AND 220 THEN
    RAISE EXCEPTION 'รหัสยืนยันการพิจารณาไม่ถูกต้อง กรุณาลองใหม่';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(v_admin_id::text || ':cancel-resolve:' || btrim(p_idempotency_key)));
  SELECT * INTO v_request FROM public.order_cancellation_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ไม่พบคำขอยกเลิก'; END IF;
  IF v_request.status <> 'requested' THEN RETURN jsonb_build_object('id', v_request.id, 'status', v_request.status, 'replayed', true); END IF;
  SELECT * INTO v_order FROM public.delivery_orders WHERE id = v_request.order_id FOR UPDATE;
  SELECT * INTO v_payment FROM public.order_payments WHERE order_id = v_order.id FOR UPDATE;
  v_before := jsonb_build_object('workflow_state', v_order.workflow_state, 'payment_status', v_payment.status, 'payment_amount', v_payment.expected_amount);
  IF p_action = 'reject' THEN
    UPDATE public.order_cancellation_requests SET status = 'rejected', resolution_reason = btrim(p_resolution_reason), resolved_by = v_admin_id, resolved_at = now(), updated_at = now() WHERE id = v_request.id;
    UPDATE public.delivery_orders SET workflow_state = CASE WHEN v_order.workflow_state = 'cancel_requested' THEN 'store_accepted' ELSE v_order.workflow_state END, status = CASE WHEN v_order.status = 'รอพิจารณายกเลิก' THEN 'ร้านค้ารับออร์เดอร์' ELSE v_order.status END, workflow_updated_at = now(), updated_at = now() WHERE id = v_order.id;
  ELSE
    UPDATE public.order_cancellation_requests SET status = 'approved', resolution_reason = btrim(p_resolution_reason), resolved_by = v_admin_id, resolved_at = now(), updated_at = now() WHERE id = v_request.id;
    UPDATE public.delivery_orders SET workflow_state = CASE WHEN p_refund_decision = 'refund_pending' THEN 'refund_pending' ELSE 'cancelled' END, status = CASE WHEN p_refund_decision = 'refund_pending' THEN 'รอดำเนินการคืนเงิน' ELSE 'ยกเลิกแล้ว' END, workflow_updated_at = now(), updated_at = now() WHERE id = v_order.id;
    IF p_refund_decision = 'refund_pending' THEN
      IF v_payment.id IS NULL OR v_payment.status NOT IN ('verified','paid') OR v_payment.expected_amount <= 0 THEN
        RAISE EXCEPTION 'ยังไม่มีรายการชำระเงินที่ยืนยันแล้ว จึงเปิดคำขอคืนเงินไม่ได้';
      END IF;
      INSERT INTO public.order_refunds(order_id, payment_id, customer_id, requested_amount, status, reason, requested_by, idempotency_key)
      VALUES (v_order.id, v_payment.id, v_order.customer_id, v_payment.expected_amount, 'requested', btrim(p_resolution_reason), v_admin_id, btrim(p_idempotency_key))
      ON CONFLICT (payment_id, idempotency_key) DO UPDATE SET updated_at = now()
      RETURNING * INTO v_refund;
      UPDATE public.order_payments SET status = 'refund_pending', updated_at = now() WHERE id = v_payment.id;
    END IF;
  END IF;
  INSERT INTO public.order_status_events(order_id, status, actor_id, actor_label)
  VALUES (v_order.id, CASE WHEN p_action = 'reject' THEN 'ปฏิเสธคำขอยกเลิก' WHEN p_refund_decision = 'refund_pending' THEN 'รอดำเนินการคืนเงิน' ELSE 'ยกเลิกแล้ว' END, v_admin_id, 'Admin');
  INSERT INTO public.order_financial_events(order_id, payment_id, refund_id, actor_id, actor_role, action, idempotency_key, before_state, after_state, reason)
  VALUES (v_order.id, v_payment.id, v_refund.id, v_admin_id, 'admin', CASE WHEN p_action = 'reject' THEN 'cancellation_rejected' ELSE 'cancellation_approved' END, btrim(p_idempotency_key), v_before, jsonb_build_object('cancellation_status', p_action, 'refund_decision', p_refund_decision, 'refund_id', v_refund.id), btrim(p_resolution_reason));
  INSERT INTO public.admin_action_audit(actor_id, target_user_id, action, reason, before_state, after_state)
  VALUES (v_admin_id, v_order.customer_id, CASE WHEN p_action = 'reject' THEN 'order_cancellation_rejected' ELSE 'order_cancellation_approved' END, btrim(p_resolution_reason), v_before, jsonb_build_object('order_id',v_order.id,'refund_decision',p_refund_decision,'refund_id',v_refund.id));
  RETURN jsonb_build_object('id', v_request.id, 'status', CASE WHEN p_action = 'approve' THEN 'approved' ELSE 'rejected' END, 'refund_id', v_refund.id, 'replayed', false);
END;
$$;

REVOKE ALL ON FUNCTION public.request_customer_order_cancellation(text,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_customer_order_cancellation(text,text,jsonb,text) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_resolve_order_cancellation(uuid,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_order_cancellation(uuid,text,text,text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.ensure_order_payment_record() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_order_payment_from_slip_review() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_order_workflow_from_legacy_status() FROM PUBLIC, anon, authenticated;
