-- Corrective hardening for Wave P1 SECURITY DEFINER RPCs.
-- Supabase projects can carry explicit anon grants, so revoking PUBLIC alone is insufficient.

REVOKE ALL ON FUNCTION public.save_customer_address(uuid, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_customer_address(uuid, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_customer_address(uuid, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text, boolean) TO authenticated;

REVOKE ALL ON FUNCTION public.archive_customer_address(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_customer_address(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.archive_customer_address(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.create_food_order_v2(text, jsonb, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_food_order_v2(text, jsonb, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_food_order_v2(text, jsonb, uuid, text, text) TO authenticated;
