-- Master/Owner governance for admin-role grant and revoke.
-- This migration is intentionally prepared locally first; apply only after review,
-- contract tests, and an owner-preservation check.

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.admin_role_governors (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  authority text NOT NULL CHECK (authority IN ('owner', 'master')),
  active boolean NOT NULL DEFAULT true,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE private.admin_role_governors IS
  'Internal UUID-based authority registry for granting and revoking the admin role.';

ALTER TABLE private.admin_role_governors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.admin_role_governors FROM PUBLIC, anon, authenticated;

-- The owner UUID was read from the existing production user_roles/user_profiles join.
-- ON CONFLICT DO NOTHING preserves any existing authority row and all existing roles.
INSERT INTO private.admin_role_governors(user_id, authority, active, note)
VALUES (
  '5c4cc9a0-49d0-457b-a8e8-f71fcfd2d185'::uuid,
  'owner',
  true,
  'Existing AP Service owner authority; seeded from verified user_id'
)
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.is_platform_owner_or_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private, auth, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM private.admin_role_governors AS governor
      WHERE governor.user_id = auth.uid()
        AND governor.active IS TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.admin_can_manage_admin_roles()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, private, auth, pg_temp
AS $$
  SELECT private.is_platform_owner_or_master();
$$;

REVOKE ALL ON FUNCTION private.is_platform_owner_or_master() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_can_manage_admin_roles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_can_manage_admin_roles() TO authenticated;

DROP FUNCTION IF EXISTS public.admin_set_user_roles(uuid, jsonb, text, text);
CREATE FUNCTION public.admin_set_user_roles(
  p_user_id uuid,
  p_roles jsonb,
  p_reason text DEFAULT '',
  p_evidence_path text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth, private, pg_temp
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_role text;
  v_reason text;
  v_evidence text;
  v_before_has_admin boolean;
  v_after_has_admin boolean;
  v_is_owner boolean;
BEGIN
  IF NOT private.has_role('admin') THEN
    RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้นที่เปลี่ยนบทบาทได้';
  END IF;
  IF p_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'ไม่พบบัญชีผู้ใช้ที่ต้องการจัดการ';
  END IF;
  IF jsonb_typeof(p_roles) <> 'array' OR jsonb_array_length(p_roles) = 0 THEN
    RAISE EXCEPTION 'ต้องระบุบทบาทอย่างน้อยหนึ่งรายการ';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(p_roles) AS requested(role)
    WHERE requested.role NOT IN ('customer', 'rider', 'store_owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'พบบทบาทที่ไม่อนุญาต';
  END IF;
  IF jsonb_array_length(p_roles) <> (
    SELECT count(DISTINCT requested.role)
    FROM jsonb_array_elements_text(p_roles) AS requested(role)
  ) THEN
    RAISE EXCEPTION 'ไม่ควรมีบทบาทซ้ำกัน';
  END IF;

  v_reason := private.require_admin_override_reason(p_reason);
  v_evidence := private.validate_admin_override_evidence(p_evidence_path);
  SELECT coalesce(jsonb_agg(role ORDER BY role), '[]'::jsonb)
    INTO v_before
  FROM public.user_roles
  WHERE user_id = p_user_id;

  v_before_has_admin := v_before ? 'admin';
  v_after_has_admin := p_roles ? 'admin';
  v_is_owner := EXISTS (
    SELECT 1
    FROM private.admin_role_governors AS governor
    WHERE governor.user_id = p_user_id
      AND governor.authority = 'owner'
      AND governor.active IS TRUE
  );

  IF v_before_has_admin IS DISTINCT FROM v_after_has_admin
     AND NOT private.is_platform_owner_or_master() THEN
    RAISE EXCEPTION 'เฉพาะ Master/Owner เท่านั้นที่เพิ่มหรือถอดสิทธิ์ admin ได้';
  END IF;

  IF v_is_owner AND NOT (v_before <@ p_roles) THEN
    RAISE EXCEPTION 'ไม่สามารถลดหรือลบสิทธิ์ของบัญชี Owner ได้';
  END IF;

  IF p_user_id = auth.uid() AND NOT v_after_has_admin THEN
    RAISE EXCEPTION 'ไม่สามารถถอดสิทธิ์ admin ของบัญชีที่กำลังใช้งานอยู่ได้';
  END IF;
  IF v_before_has_admin AND NOT v_after_has_admin
     AND (SELECT count(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'ระบบต้องมีบัญชี admin อย่างน้อยหนึ่งบัญชี';
  END IF;

  DELETE FROM public.user_roles WHERE user_id = p_user_id;
  FOR v_role IN SELECT value FROM jsonb_array_elements_text(p_roles) LOOP
    INSERT INTO public.user_roles(user_id, role) VALUES (p_user_id, v_role);
  END LOOP;

  SELECT coalesce(jsonb_agg(role ORDER BY role), '[]'::jsonb)
    INTO v_after
  FROM public.user_roles
  WHERE user_id = p_user_id;

  INSERT INTO public.admin_action_audit(
    actor_id, target_user_id, target_type, target_id, action, reason,
    evidence_path, before_state, after_state, metadata
  )
  VALUES (
    auth.uid(), p_user_id, 'user', p_user_id::text, 'user_roles_updated',
    v_reason, v_evidence, jsonb_build_object('roles', v_before),
    jsonb_build_object('roles', v_after),
    jsonb_build_object(
      'override', true,
      'admin_role_change', v_before_has_admin IS DISTINCT FROM v_after_has_admin,
      'owner_target', v_is_owner
    )
  );

  RETURN jsonb_build_object('roles', v_after);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_roles(uuid, jsonb, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_roles(uuid, jsonb, text, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
