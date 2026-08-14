-- AP Service: consent audit trail for service terms, privacy policy, and location-service notice.
-- This records only an affirmative, unticked-by-default signup choice; browser location permission
-- remains under the customer's device/browser controls and is requested only when they choose GPS.

CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN ('service_terms', 'privacy_policy', 'location_service_notice')),
  policy_version text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  source text NOT NULL DEFAULT 'signup',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_consents_version_unique UNIQUE (user_id, consent_type, policy_version)
);

CREATE INDEX IF NOT EXISTS user_consents_user_granted_idx
  ON public.user_consents (user_id, granted, granted_at DESC);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_consents_select_own ON public.user_consents;
CREATE POLICY user_consents_select_own ON public.user_consents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_consents_insert_own ON public.user_consents;
CREATE POLICY user_consents_insert_own ON public.user_consents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_consents_revoke_own ON public.user_consents;
CREATE POLICY user_consents_revoke_own ON public.user_consents
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND granted = false AND revoked_at IS NOT NULL);

DROP POLICY IF EXISTS user_consents_admin_all ON public.user_consents;
CREATE POLICY user_consents_admin_all ON public.user_consents
  FOR ALL TO authenticated
  USING (private.has_role('admin'))
  WITH CHECK (private.has_role('admin'));

GRANT SELECT, INSERT, UPDATE ON public.user_consents TO authenticated;

CREATE OR REPLACE FUNCTION public.record_signup_consents_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_policy_version text := COALESCE(NULLIF(new.raw_user_meta_data ->> 'privacy_policy_version', ''), '2026-08-14');
  v_evidence jsonb := jsonb_build_object(
    'registration_role', COALESCE(new.raw_user_meta_data ->> 'requested_role', 'customer'),
    'channel', 'web_signup'
  );
BEGIN
  IF COALESCE(new.raw_user_meta_data ->> 'service_terms_accepted', 'false') = 'true' THEN
    INSERT INTO public.user_consents (user_id, consent_type, policy_version, source, evidence)
    VALUES (new.id, 'service_terms', v_policy_version, 'signup', v_evidence)
    ON CONFLICT (user_id, consent_type, policy_version) DO NOTHING;
  END IF;

  IF COALESCE(new.raw_user_meta_data ->> 'privacy_policy_accepted', 'false') = 'true' THEN
    INSERT INTO public.user_consents (user_id, consent_type, policy_version, source, evidence)
    VALUES (new.id, 'privacy_policy', v_policy_version, 'signup', v_evidence)
    ON CONFLICT (user_id, consent_type, policy_version) DO NOTHING;
  END IF;

  IF COALESCE(new.raw_user_meta_data ->> 'location_service_notice_accepted', 'false') = 'true' THEN
    INSERT INTO public.user_consents (user_id, consent_type, policy_version, source, evidence)
    VALUES (new.id, 'location_service_notice', v_policy_version, 'signup', v_evidence)
    ON CONFLICT (user_id, consent_type, policy_version) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS auth_users_record_signup_consents ON auth.users;
CREATE TRIGGER auth_users_record_signup_consents
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.record_signup_consents_from_auth();

NOTIFY pgrst, 'reload schema';
