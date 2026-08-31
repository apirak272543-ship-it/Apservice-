DROP POLICY IF EXISTS platform_configs_read_customer_visuals_public ON public.platform_configs;

CREATE POLICY platform_configs_read_customer_visuals_public
ON public.platform_configs
FOR SELECT
TO anon, authenticated
USING (key = 'customer_visuals');
