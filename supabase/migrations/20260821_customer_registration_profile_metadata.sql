CREATE OR REPLACE FUNCTION public.create_customer_profile_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_name text;
  v_phone text;
  v_address text;
BEGIN
  v_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'display_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'name'), ''),
    SPLIT_PART(COALESCE(NEW.email, 'customer'), '@', 1)
  );
  v_phone := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'phone'), ''), '');
  v_address := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'address'), ''), '');

  INSERT INTO public.user_profiles(user_id, email, display_name, phone, address)
  VALUES (NEW.id, COALESCE(LOWER(NEW.email), ''), v_name, v_phone, v_address)
  ON CONFLICT (user_id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = CASE WHEN COALESCE(NULLIF(TRIM(public.user_profiles.display_name), ''), '') = '' THEN EXCLUDED.display_name ELSE public.user_profiles.display_name END,
      phone = CASE WHEN COALESCE(NULLIF(TRIM(public.user_profiles.phone), ''), '') = '' THEN EXCLUDED.phone ELSE public.user_profiles.phone END,
      address = CASE WHEN COALESCE(NULLIF(TRIM(public.user_profiles.address), ''), '') = '' THEN EXCLUDED.address ELSE public.user_profiles.address END,
      updated_at = now();

  INSERT INTO public.user_roles(user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
