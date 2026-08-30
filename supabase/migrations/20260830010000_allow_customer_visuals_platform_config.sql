-- Allow Admin-managed Customer App visual settings in the central config table.
ALTER TABLE public.platform_configs
  DROP CONSTRAINT IF EXISTS platform_configs_key_check;

ALTER TABLE public.platform_configs
  ADD CONSTRAINT platform_configs_key_check
  CHECK (key = ANY (ARRAY[
    'payment_public'::text,
    'business_rules'::text,
    'brand_public'::text,
    'customer_promotions'::text,
    'customer_visuals'::text
  ]));
