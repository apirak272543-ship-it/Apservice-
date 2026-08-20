-- Wave P4: Admin can resolve an exceptional case immediately, but each override
-- leaves an explainable private-evidence audit trail. This migration intentionally
-- does not invent cancellation/refund/fee mutations before their state machines exist.

ALTER TABLE public.admin_action_audit
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS target_id text,
  ADD COLUMN IF NOT EXISTS evidence_path text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS admin_action_audit_action_created_idx
  ON public.admin_action_audit(action, created_at DESC);
CREATE INDEX IF NOT EXISTS admin_action_audit_target_entity_idx
  ON public.admin_action_audit(target_type, target_id, created_at DESC);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('admin-override-evidence', 'admin-override-evidence', false, 1000000, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 1000000, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

DROP POLICY IF EXISTS "admin_override_evidence_insert_own" ON storage.objects;
CREATE POLICY "admin_override_evidence_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'admin-override-evidence'
    AND private.has_role('admin')
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (storage.foldername(name))[2] = 'override'
  );

DROP POLICY IF EXISTS "admin_override_evidence_read_admin" ON storage.objects;
CREATE POLICY "admin_override_evidence_read_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'admin-override-evidence' AND private.has_role('admin'));

DROP POLICY IF EXISTS "admin_override_evidence_delete_own" ON storage.objects;
CREATE POLICY "admin_override_evidence_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'admin-override-evidence' AND private.has_role('admin') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION private.require_admin_override_reason(p_reason text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_reason text := btrim(coalesce(p_reason, ''));
BEGIN
  IF char_length(v_reason) < 10 THEN
    RAISE EXCEPTION 'กรุณาระบุเหตุผลการดำเนินการอย่างน้อย 10 ตัวอักษร';
  END IF;
  RETURN left(v_reason, 500);
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_admin_override_evidence(p_evidence_path text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_path text := nullif(btrim(coalesce(p_evidence_path, '')), '');
  v_prefix text := 'admin-override-evidence/' || auth.uid()::text || '/override/';
BEGIN
  IF v_path IS NULL THEN RETURN NULL; END IF;
  IF position(v_prefix IN v_path) <> 1 THEN
    RAISE EXCEPTION 'หลักฐานต้องเป็นไฟล์ private ที่อัปโหลดโดย Admin ผู้ดำเนินการเท่านั้น';
  END IF;
  RETURN left(v_path, 1024);
END;
$$;

DROP FUNCTION IF EXISTS public.admin_set_account_control(uuid,text,jsonb,text);
CREATE FUNCTION public.admin_set_account_control(
  p_user_id uuid,
  p_status text DEFAULT 'active',
  p_feature_overrides jsonb DEFAULT '{}'::jsonb,
  p_reason text DEFAULT '',
  p_evidence_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, private, pg_temp
AS $$
DECLARE
  v_before jsonb := '{}'::jsonb;
  v_after jsonb;
  v_reason text;
  v_evidence text;
BEGIN
  IF NOT private.has_role('admin') THEN RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้นที่จัดการสิทธิ์บัญชีได้'; END IF;
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN RAISE EXCEPTION 'ไม่พบบัญชีผู้ใช้ที่ต้องการจัดการ'; END IF;
  IF p_status NOT IN ('active', 'suspended') THEN RAISE EXCEPTION 'สถานะบัญชีไม่ถูกต้อง'; END IF;
  IF jsonb_typeof(coalesce(p_feature_overrides, '{}'::jsonb)) <> 'object' THEN RAISE EXCEPTION 'รูปแบบสิทธิ์ฟังก์ชันไม่ถูกต้อง'; END IF;
  v_reason := private.require_admin_override_reason(p_reason);
  v_evidence := private.validate_admin_override_evidence(p_evidence_path);
  SELECT jsonb_build_object('status', status, 'suspension_reason', suspension_reason, 'feature_overrides', feature_overrides) INTO v_before FROM public.account_controls WHERE user_id = p_user_id;
  INSERT INTO public.account_controls(user_id, status, suspension_reason, feature_overrides, updated_by, updated_at)
  VALUES (p_user_id, p_status, v_reason, coalesce(p_feature_overrides, '{}'::jsonb), auth.uid(), now())
  ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, suspension_reason = EXCLUDED.suspension_reason, feature_overrides = EXCLUDED.feature_overrides, updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at
  RETURNING jsonb_build_object('status', status, 'suspension_reason', suspension_reason, 'feature_overrides', feature_overrides) INTO v_after;
  INSERT INTO public.admin_action_audit(actor_id, target_user_id, target_type, target_id, action, reason, evidence_path, before_state, after_state, metadata)
  VALUES (auth.uid(), p_user_id, 'user', p_user_id::text, 'account_control_updated', v_reason, v_evidence, coalesce(v_before, '{}'::jsonb), v_after, jsonb_build_object('override', true));
  RETURN v_after;
END;
$$;

DROP FUNCTION IF EXISTS public.admin_set_user_roles(uuid,jsonb,text);
CREATE FUNCTION public.admin_set_user_roles(p_user_id uuid, p_roles jsonb, p_reason text DEFAULT '', p_evidence_path text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, private, pg_temp
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_role text;
  v_reason text;
  v_evidence text;
BEGIN
  IF NOT private.has_role('admin') THEN RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้นที่เปลี่ยนบทบาทได้'; END IF;
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN RAISE EXCEPTION 'ไม่พบบัญชีผู้ใช้ที่ต้องการจัดการ'; END IF;
  IF jsonb_typeof(p_roles) <> 'array' OR jsonb_array_length(p_roles) = 0 THEN RAISE EXCEPTION 'ต้องระบุบทบาทอย่างน้อยหนึ่งรายการ'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(p_roles) role WHERE role NOT IN ('customer', 'rider', 'store_owner', 'admin')) THEN RAISE EXCEPTION 'พบบทบาทที่ไม่อนุญาต'; END IF;
  v_reason := private.require_admin_override_reason(p_reason);
  v_evidence := private.validate_admin_override_evidence(p_evidence_path);
  SELECT coalesce(jsonb_agg(role ORDER BY role), '[]'::jsonb) INTO v_before FROM public.user_roles WHERE user_id = p_user_id;
  IF p_user_id = auth.uid() AND NOT (p_roles ? 'admin') THEN RAISE EXCEPTION 'ไม่สามารถถอดสิทธิ์ admin ของบัญชีที่กำลังใช้งานอยู่ได้'; END IF;
  IF (v_before ? 'admin') AND NOT (p_roles ? 'admin') AND (SELECT count(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN RAISE EXCEPTION 'ระบบต้องมีบัญชี admin อย่างน้อยหนึ่งบัญชี'; END IF;
  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  FOR v_role IN SELECT value FROM jsonb_array_elements_text(p_roles) LOOP
    INSERT INTO public.user_roles(user_id, role) VALUES (p_user_id, v_role);
  END LOOP;
  SELECT jsonb_agg(role ORDER BY role) INTO v_after FROM public.user_roles WHERE user_id = p_user_id;
  INSERT INTO public.admin_action_audit(actor_id, target_user_id, target_type, target_id, action, reason, evidence_path, before_state, after_state, metadata)
  VALUES (auth.uid(), p_user_id, 'user', p_user_id::text, 'user_roles_updated', v_reason, v_evidence, jsonb_build_object('roles', v_before), jsonb_build_object('roles', v_after), jsonb_build_object('override', true));
  RETURN jsonb_build_object('roles', v_after);
END;
$$;

DROP FUNCTION IF EXISTS public.admin_adjust_customer_wallet(uuid,text,numeric,text);
CREATE FUNCTION public.admin_adjust_customer_wallet(p_customer_id uuid, p_direction text, p_amount numeric, p_reason text, p_evidence_path text DEFAULT NULL)
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
  v_reason text;
  v_evidence text;
BEGIN
  IF NOT private.has_role('admin') THEN RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้นที่ปรับยอดกระเป๋าเงินได้'; END IF;
  IF p_customer_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_customer_id AND role = 'customer') THEN RAISE EXCEPTION 'บัญชีปลายทางต้องมีบทบาท customer'; END IF;
  IF p_direction NOT IN ('credit', 'debit') OR p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000 THEN RAISE EXCEPTION 'ทิศทางหรือจำนวนเงินไม่ถูกต้อง'; END IF;
  v_reason := private.require_admin_override_reason(p_reason);
  v_evidence := private.validate_admin_override_evidence(p_evidence_path);
  SELECT coalesce(sum(amount), 0) INTO v_before FROM public.wallet_transactions WHERE customer_id = p_customer_id;
  v_signed := CASE WHEN p_direction = 'credit' THEN round(p_amount, 2) ELSE -round(p_amount, 2) END;
  v_id := 'wallet-admin-' || replace(gen_random_uuid()::text, '-', '');
  INSERT INTO public.wallet_transactions(id, customer_id, amount, type, reason, method, created_by, created_at)
  VALUES (v_id, p_customer_id, v_signed, CASE WHEN p_direction = 'credit' THEN 'admin_credit' ELSE 'admin_debit' END, v_reason, 'admin_control', auth.uid(), now());
  v_after := v_before + v_signed;
  INSERT INTO public.admin_action_audit(actor_id, target_user_id, target_type, target_id, action, reason, evidence_path, before_state, after_state, metadata)
  VALUES (auth.uid(), p_customer_id, 'customer_wallet', p_customer_id::text, 'wallet_adjusted', v_reason, v_evidence, jsonb_build_object('balance', v_before), jsonb_build_object('balance', v_after, 'transaction_id', v_id, 'direction', p_direction, 'amount', p_amount), jsonb_build_object('override', true, 'financial', true));
  RETURN jsonb_build_object('transaction_id', v_id, 'balance_before', v_before, 'balance_after', v_after);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_override_audit(
  p_action text DEFAULT '',
  p_actor_id uuid DEFAULT NULL,
  p_target_query text DEFAULT '',
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid, created_at timestamptz, action text, reason text, evidence_path text,
  target_type text, target_id text, actor_id uuid, actor_name text,
  target_user_id uuid, target_name text, before_state jsonb, after_state jsonb, metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  IF NOT private.has_role('admin') THEN RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้นที่เปิด Audit Log ได้'; END IF;
  RETURN QUERY
  SELECT aa.id, aa.created_at, aa.action, aa.reason, aa.evidence_path,
         aa.target_type, aa.target_id, aa.actor_id, coalesce(actor.display_name, aa.actor_id::text),
         aa.target_user_id, coalesce(target.display_name, aa.target_user_id::text), aa.before_state, aa.after_state, aa.metadata
  FROM public.admin_action_audit aa
  LEFT JOIN public.user_profiles actor ON actor.user_id = aa.actor_id
  LEFT JOIN public.user_profiles target ON target.user_id = aa.target_user_id
  WHERE (nullif(btrim(p_action), '') IS NULL OR aa.action = btrim(p_action))
    AND (p_actor_id IS NULL OR aa.actor_id = p_actor_id)
    AND (p_from IS NULL OR aa.created_at >= p_from)
    AND (p_to IS NULL OR aa.created_at < p_to + interval '1 day')
    AND (nullif(btrim(p_target_query), '') IS NULL OR coalesce(target.display_name, '') ILIKE '%' || btrim(p_target_query) || '%' OR coalesce(aa.target_id, '') ILIKE '%' || btrim(p_target_query) || '%')
  ORDER BY aa.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 100), 250));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_account_control(uuid,text,jsonb,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_user_roles(uuid,jsonb,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_adjust_customer_wallet(uuid,text,numeric,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_override_audit(text,uuid,text,timestamptz,timestamptz,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_account_control(uuid,text,jsonb,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_roles(uuid,jsonb,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_customer_wallet(uuid,text,numeric,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_override_audit(text,uuid,text,timestamptz,timestamptz,integer) TO authenticated;
