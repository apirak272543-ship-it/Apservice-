-- Allow the public catalog view to execute under anon without changing row-level visibility.
-- Existing RLS policy public.menu_public_read remains the row filter.
GRANT SELECT ON TABLE public.menu_items TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
