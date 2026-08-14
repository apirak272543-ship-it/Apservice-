-- A customer account must become visible to Admin immediately after Auth creates it.
-- This trigger is a safety net for email-confirmation flows where the browser has no access token yet.
CREATE OR REPLACE FUNCTION public.create_customer_profile_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_name text;
BEGIN
  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    SPLIT_PART(COALESCE(NEW.email, 'customer'), '@', 1)
  );

  INSERT INTO public.user_profiles(user_id, email, display_name, phone, address)
  VALUES (NEW.id, COALESCE(LOWER(NEW.email), ''), v_name, '', '')
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = CASE
        WHEN COALESCE(NULLIF(TRIM(public.user_profiles.display_name), ''), '') = '' THEN EXCLUDED.display_name
        ELSE public.user_profiles.display_name
      END,
      updated_at = now();

  INSERT INTO public.user_roles(user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_customer_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_customer_profile
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.create_customer_profile_from_auth();

NOTIFY pgrst, 'reload schema';
