-- Publicly displayable payment settings only. Secrets and webhook credentials remain local to Admin settings.
CREATE TABLE IF NOT EXISTS public.platform_configs (
  key text PRIMARY KEY CHECK (key IN ('payment_public')),
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_configs_read_payment_public" ON public.platform_configs;
CREATE POLICY "platform_configs_read_payment_public" ON public.platform_configs
  FOR SELECT TO authenticated
  USING (key = 'payment_public');

DROP POLICY IF EXISTS "platform_configs_admin_manage" ON public.platform_configs;
CREATE POLICY "platform_configs_admin_manage" ON public.platform_configs
  FOR ALL TO authenticated
  USING (private.has_role('admin'))
  WITH CHECK (private.has_role('admin'));

GRANT SELECT ON public.platform_configs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_configs TO authenticated;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS background_url text;

CREATE OR REPLACE VIEW public.catalog_stores AS
SELECT s.id, s.name, s.emoji, s.description, s.rating, s.eta, s.location, s.active,
       s.image_url, s.review_count, s.open_time, s.close_time,
       s.order_cutoff_minutes, s.emergency_closed, s.emergency_note,
       s.category_id, c.name AS category_name, c.icon AS category_icon,
       s.background_url
FROM public.stores s
LEFT JOIN public.store_categories c ON c.id = s.category_id
WHERE s.active IS TRUE AND s.emergency_closed IS FALSE;

GRANT SELECT ON public.catalog_stores TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
