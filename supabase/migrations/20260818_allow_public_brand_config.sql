-- Customer shell reads branding before authentication, so this public-safe config
-- must be selectable while all write operations remain Admin-only.
DROP POLICY IF EXISTS platform_configs_read_brand_public ON public.platform_configs;
CREATE POLICY platform_configs_read_brand_public
  ON public.platform_configs FOR SELECT TO anon, authenticated
  USING (key = 'brand_public');
