-- Admin account control plane: sensitive actions are enforced in PostgreSQL,
-- never by client-side state alone.

CREATE TABLE IF NOT EXISTS public.account_controls (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  suspension_reason text NOT NULL DEFAULT '',
  feature_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_action_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  reason text NOT NULL DEFAULT '',
  before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS account_controls_status_idx ON public.account_controls(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS admin_action_audit_target_idx ON public.admin_action_audit(target_user_id, created_at DESC);

ALTER TABLE public.account_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account_controls_read_self_or_admin" ON public.account_controls;
CREATE POLICY "account_controls_read_self_or_admin" ON public.account_controls
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role('admin'));

DROP POLICY IF EXISTS "account_controls_admin_all" ON public.account_controls;
CREATE POLICY "account_controls_admin_all" ON public.account_controls
  FOR ALL TO authenticated
  USING (private.has_role('admin'))
  WITH CHECK (private.has_role('admin'));

DROP POLICY IF EXISTS "admin_action_audit_admin_read" ON public.admin_action_audit;
CREATE POLICY "admin_action_audit_admin_read" ON public.admin_action_audit
  FOR SELECT TO authenticated
  USING (private.has_role('admin'));

CREATE OR REPLACE FUNCTION private.account_feature_enabled(p_user_id uuid, p_feature text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
  SELECT COALESCE((ac.feature_overrides -> p_feature ->> 'enabled')::boolean, true)
     AND COALESCE(ac.status, 'active') = 'active'
  FROM (SELECT p_user_id AS user_id) subject
  LEFT JOIN public.account_controls ac ON ac.user_id = subject.user_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_account_control(
  p_user_id uuid,
  p_status text DEFAULT 'active',
  p_feature_overrides jsonb DEFAULT '{}'::jsonb,
  p_reason text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, private, pg_temp
AS $$
DECLARE
  v_before jsonb := '{}'::jsonb;
  v_after jsonb;
BEGIN
  IF NOT private.has_role('admin') THEN RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้นที่จัดการสิทธิ์บัญชีได้'; END IF;
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN RAISE EXCEPTION 'ไม่พบบัญชีผู้ใช้ที่ต้องการจัดการ'; END IF;
  IF p_status NOT IN ('active', 'suspended') THEN RAISE EXCEPTION 'สถานะบัญชีไม่ถูกต้อง'; END IF;
  IF jsonb_typeof(COALESCE(p_feature_overrides, '{}'::jsonb)) <> 'object' THEN RAISE EXCEPTION 'รูปแบบสิทธิ์ฟังก์ชันไม่ถูกต้อง'; END IF;
  SELECT jsonb_build_object('status', status, 'suspension_reason', suspension_reason, 'feature_overrides', feature_overrides) INTO v_before FROM public.account_controls WHERE user_id = p_user_id;
  INSERT INTO public.account_controls(user_id, status, suspension_reason, feature_overrides, updated_by, updated_at)
  VALUES (p_user_id, p_status, LEFT(COALESCE(p_reason, ''), 500), COALESCE(p_feature_overrides, '{}'::jsonb), auth.uid(), now())
  ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, suspension_reason = EXCLUDED.suspension_reason, feature_overrides = EXCLUDED.feature_overrides, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at
  RETURNING jsonb_build_object('status', status, 'suspension_reason', suspension_reason, 'feature_overrides', feature_overrides) INTO v_after;
  INSERT INTO public.admin_action_audit(actor_id, target_user_id, action, reason, before_state, after_state)
  VALUES (auth.uid(), p_user_id, 'account_control_updated', LEFT(COALESCE(p_reason, ''), 500), COALESCE(v_before, '{}'::jsonb), v_after);
  RETURN v_after;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_roles(p_user_id uuid, p_roles jsonb, p_reason text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, private, pg_temp
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_role text;
BEGIN
  IF NOT private.has_role('admin') THEN RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้นที่เปลี่ยนบทบาทได้'; END IF;
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN RAISE EXCEPTION 'ไม่พบบัญชีผู้ใช้ที่ต้องการจัดการ'; END IF;
  IF jsonb_typeof(p_roles) <> 'array' OR jsonb_array_length(p_roles) = 0 THEN RAISE EXCEPTION 'ต้องระบุบทบาทอย่างน้อยหนึ่งรายการ'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_roles) role WHERE role NOT IN ('customer', 'rider', 'store_owner', 'admin')) THEN RAISE EXCEPTION 'พบบทบาทที่ไม่อนุญาต'; END IF;
  SELECT COALESCE(jsonb_agg(role ORDER BY role), '[]'::jsonb) INTO v_before FROM public.user_roles WHERE user_id = p_user_id;
  IF p_user_id = auth.uid() AND NOT (p_roles ? 'admin') THEN RAISE EXCEPTION 'ไม่สามารถถอดสิทธิ์ admin ของบัญชีที่กำลังใช้งานอยู่ได้'; END IF;
  IF (v_before ? 'admin') AND NOT (p_roles ? 'admin') AND (SELECT count(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN RAISE EXCEPTION 'ระบบต้องมีบัญชี admin อย่างน้อยหนึ่งบัญชี'; END IF;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  FOR v_role IN SELECT value FROM jsonb_array_elements_text(p_roles) LOOP
    INSERT INTO public.user_roles(user_id, role) VALUES(p_user_id, v_role);
  END LOOP;
  SELECT jsonb_agg(role ORDER BY role) INTO v_after FROM public.user_roles WHERE user_id = p_user_id;
  INSERT INTO public.admin_action_audit(actor_id, target_user_id, action, reason, before_state, after_state)
  VALUES (auth.uid(), p_user_id, 'user_roles_updated', LEFT(COALESCE(p_reason, ''), 500), jsonb_build_object('roles', v_before), jsonb_build_object('roles', v_after));
  RETURN jsonb_build_object('roles', v_after);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_customer_wallet(p_customer_id uuid, p_direction text, p_amount numeric, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, private, pg_temp
AS $$
DECLARE
  v_before numeric := 0;
  v_after numeric := 0;
  v_signed numeric;
  v_id text;
BEGIN
  IF NOT private.has_role('admin') THEN RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้นที่ปรับยอดกระเป๋าเงินได้'; END IF;
  IF p_customer_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_customer_id AND role = 'customer') THEN RAISE EXCEPTION 'บัญชีปลายทางต้องมีบทบาท customer'; END IF;
  IF p_direction NOT IN ('credit', 'debit') OR p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000 THEN RAISE EXCEPTION 'ทิศทางหรือจำนวนเงินไม่ถูกต้อง'; END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 3 THEN RAISE EXCEPTION 'กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร'; END IF;
  SELECT COALESCE(SUM(amount), 0) INTO v_before FROM public.wallet_transactions WHERE customer_id = p_customer_id;
  v_signed := CASE WHEN p_direction = 'credit' THEN ROUND(p_amount, 2) ELSE -ROUND(p_amount, 2) END;
  v_id := 'wallet-admin-' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.wallet_transactions(id, customer_id, amount, type, reason, method, created_by, created_at)
  VALUES (v_id, p_customer_id, v_signed, CASE WHEN p_direction = 'credit' THEN 'admin_credit' ELSE 'admin_debit' END, LEFT(trim(p_reason), 500), 'admin_control', auth.uid(), now());
  v_after := v_before + v_signed;
  INSERT INTO public.admin_action_audit(actor_id, target_user_id, action, reason, before_state, after_state)
  VALUES (auth.uid(), p_customer_id, 'wallet_adjusted', LEFT(trim(p_reason), 500), jsonb_build_object('balance', v_before), jsonb_build_object('balance', v_after, 'transaction_id', v_id, 'direction', p_direction, 'amount', p_amount));
  RETURN jsonb_build_object('transaction_id', v_id, 'balance_before', v_before, 'balance_after', v_after);
END;
$$;

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
SET search_path = public, private, pg_temp
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
  IF v_customer_id IS NULL OR NOT private.has_role('customer') THEN RAISE EXCEPTION 'ต้องเข้าสู่ระบบด้วยบัญชีลูกค้าก่อนสั่งซื้อ'; END IF;
  IF NOT private.account_feature_enabled(v_customer_id, 'ordering') THEN RAISE EXCEPTION 'บัญชีนี้ถูกระงับการสั่งซื้อ กรุณาติดต่อผู้ดูแลระบบ'; END IF;
  IF p_payment_method = 'เงินสดปลายทาง (COD)' AND NOT private.account_feature_enabled(v_customer_id, 'cash_on_delivery') THEN RAISE EXCEPTION 'บัญชีนี้ไม่ได้รับสิทธิ์ชำระเงินปลายทาง กรุณาเลือกชำระผ่าน QR / แนบสลิป'; END IF;
  IF p_store_id IS NULL OR btrim(p_store_id) = '' OR p_delivery_address IS NULL OR btrim(p_delivery_address) = '' THEN RAISE EXCEPTION 'กรุณาระบุร้านค้าและที่อยู่จัดส่ง'; END IF;
  IF p_payment_method NOT IN ('เงินสดปลายทาง (COD)', 'โอนผ่าน QR / แนบสลิป') THEN RAISE EXCEPTION 'วิธีชำระเงินไม่อยู่ในรายการที่อนุญาต'; END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 100 THEN RAISE EXCEPTION 'รายการสินค้าไม่ถูกต้อง'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_items) AS x(item_id text, quantity integer) WHERE item_id IS NULL OR btrim(item_id) = '' OR quantity IS NULL OR quantity < 1 OR quantity > 99) THEN RAISE EXCEPTION 'สินค้าและจำนวนต้องอยู่ในช่วงที่อนุญาต'; END IF;
  SELECT id, name, location INTO v_store FROM public.stores WHERE id = p_store_id AND active IS TRUE AND emergency_closed IS FALSE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ร้านค้าไม่พร้อมรับออร์เดอร์'; END IF;
  SELECT location INTO v_customer_location FROM public.user_profiles WHERE user_id = v_customer_id;
  IF v_customer_location IS NULL THEN RAISE EXCEPTION 'กรุณาบันทึกตำแหน่งจัดส่งในหน้าโปรไฟล์ก่อนสั่งซื้อ'; END IF;
  WITH requested AS (SELECT item_id, sum(quantity)::integer AS quantity FROM jsonb_to_recordset(p_items) AS x(item_id text, quantity integer) GROUP BY item_id), verified AS (SELECT m.id, m.name, m.emoji, m.price, r.quantity FROM requested r JOIN public.menu_items m ON m.id = r.item_id WHERE m.store_id = p_store_id AND m.available IS TRUE)
  SELECT count(*), coalesce(sum(price * quantity), 0) INTO v_item_count, v_total FROM verified;
  SELECT count(DISTINCT item_id) INTO v_requested_count FROM jsonb_to_recordset(p_items) AS x(item_id text, quantity integer);
  IF v_item_count <> v_requested_count THEN RAISE EXCEPTION 'มีสินค้าไม่พร้อมขายหรือไม่ได้อยู่ในร้านค้าที่เลือก'; END IF;
  v_status := CASE WHEN p_payment_method = 'โอนผ่าน QR / แนบสลิป' THEN 'รอตรวจสอบการชำระเงิน' ELSE 'ร้านค้ารับออร์เดอร์' END;
  INSERT INTO public.delivery_orders(customer_id, customer_email, customer_name, store_id, store_name, service_type, status, total, payable, delivery_fee, payment_method, delivery_address, delivery_location, ordered_at)
  VALUES(v_customer_id, coalesce(auth.jwt() ->> 'email', ''), left(coalesce(nullif(btrim(p_customer_name), ''), auth.jwt() ->> 'email', ''), 160), v_store.id, v_store.name, 'food', v_status, v_total, 0, 0, p_payment_method, left(btrim(p_delivery_address), 1000), v_customer_location, now()) RETURNING * INTO v_order;
  INSERT INTO public.delivery_order_items(order_id, item_id, name, emoji, unit_price, quantity, options) SELECT v_order.id, m.id, m.name, m.emoji, m.price, r.quantity, '{}'::jsonb FROM jsonb_to_recordset(p_items) AS r(item_id text, quantity integer) JOIN public.menu_items m ON m.id = r.item_id WHERE m.store_id = p_store_id AND m.available IS TRUE;
  RETURN jsonb_build_object('id', v_order.id, 'status', v_order.status, 'total', v_order.total, 'delivery_fee', v_order.delivery_fee, 'payable', v_order.payable, 'distance_km', v_order.distance_km);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_account_control(uuid,text,jsonb,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_user_roles(uuid,jsonb,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_adjust_customer_wallet(uuid,text,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_account_control(uuid,text,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_roles(uuid,jsonb,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_customer_wallet(uuid,text,numeric,text) TO authenticated;
