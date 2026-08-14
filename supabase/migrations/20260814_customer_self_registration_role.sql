-- A public registrant may create only their own customer role. Rider is granted
-- exclusively by an administrator after the application review is approved.
DROP POLICY IF EXISTS "roles_insert_self_customer" ON public.user_roles;
CREATE POLICY "roles_insert_self_customer" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'customer');

GRANT INSERT ON public.user_roles TO authenticated;
NOTIFY pgrst, 'reload schema';
