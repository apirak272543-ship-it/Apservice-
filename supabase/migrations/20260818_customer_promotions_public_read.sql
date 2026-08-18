-- Public catalog promotions contain only display content and public catalog-media URLs.
-- All writes remain restricted by platform_configs_admin_manage.
DROP POLICY IF EXISTS platform_configs_read_customer_promotions_public ON public.platform_configs;

CREATE POLICY platform_configs_read_customer_promotions_public
ON public.platform_configs
FOR SELECT
TO anon, authenticated
USING (key = 'customer_promotions');
